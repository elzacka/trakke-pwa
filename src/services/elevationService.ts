// Elevation Service for Tråkke PWA
// Fetches elevation data from Kartverket Høydedata API (DTM 10m resolution)
// Caches elevation profiles in IndexedDB for 7 days

import { dbService } from './dbService'
import { devLog, devError } from '../constants'

interface ElevationPoint {
  x: number  // longitude
  y: number  // latitude
  z: number  // elevation (meters above sea level)
}

interface ElevationStatistics {
  totalGain: number       // Total elevation gain in meters
  totalLoss: number       // Total elevation loss in meters
  minElevation: number    // Minimum elevation point
  maxElevation: number    // Maximum elevation point
  avgElevation: number    // Average elevation
}

export interface ElevationProfile {
  routeId: string
  points: ElevationPoint[]
  statistics: ElevationStatistics
  fetchedAt: number
}

class ElevationService {
  private readonly API_URL = 'https://ws.geonorge.no/hoydedata/v1/punkt'
  private readonly BATCH_SIZE = 50  // Kartverket API limit: max 50 points per request
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000  // 7 days (elevation data is static)
  private readonly SAMPLE_INTERVAL = 100  // Sample coordinates every ~100 meters

  /**
   * Fetch elevation profile for a route
   * Samples route coordinates at intervals to avoid excessive API calls
   * Caches results in IndexedDB for 7 days
   */
  async getElevationProfile(
    routeId: string,
    coordinates: [number, number][]
  ): Promise<ElevationProfile> {
    if (!coordinates || coordinates.length < 2) {
      throw new Error('Route must have at least 2 coordinates')
    }

    // Check cache first
    const cached = await this.getCachedProfile(routeId)
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL) {
      devLog(`[ElevationService] Using cached elevation for route ${routeId}`)
      return cached
    }

    devLog(`[ElevationService] Fetching elevation for route ${routeId} (${coordinates.length} points)`)

    // Sample coordinates to reduce API load (every ~100m)
    const sampledCoords = this.sampleCoordinates(coordinates, this.SAMPLE_INTERVAL)
    devLog(`[ElevationService] Sampled ${sampledCoords.length} points from ${coordinates.length} original points`)

    // Batch requests (API limit: 100 points per request)
    const elevationPoints: ElevationPoint[] = []
    for (let i = 0; i < sampledCoords.length; i += this.BATCH_SIZE) {
      const batch = sampledCoords.slice(i, i + this.BATCH_SIZE)
      const batchResults = await this.fetchElevationBatch(batch)
      elevationPoints.push(...batchResults)
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(elevationPoints)

    const profile: ElevationProfile = {
      routeId,
      points: elevationPoints,
      statistics,
      fetchedAt: Date.now()
    }

    // Cache result
    await this.cacheProfile(profile)

    return profile
  }

  /**
   * Sample coordinates at specified interval (meters)
   * Uses Haversine distance to determine spacing
   * Always includes first and last point
   */
  private sampleCoordinates(
    coords: [number, number][],
    intervalMeters: number
  ): [number, number][] {
    if (coords.length === 0) return []
    if (coords.length === 1) return coords

    const sampled: [number, number][] = [coords[0]] // Always include first point
    let accumulatedDistance = 0

    for (let i = 1; i < coords.length; i++) {
      const distance = this.haversineDistance(coords[i - 1], coords[i])
      accumulatedDistance += distance

      if (accumulatedDistance >= intervalMeters) {
        sampled.push(coords[i])
        accumulatedDistance = 0
      }
    }

    // Always include last point (if not already included)
    const lastCoord = coords[coords.length - 1]
    const lastSampled = sampled[sampled.length - 1]
    if (lastCoord[0] !== lastSampled[0] || lastCoord[1] !== lastSampled[1]) {
      sampled.push(lastCoord)
    }

    return sampled
  }

  /**
   * Fetch elevation for batch of coordinates from Kartverket API
   * Uses GET /punkt endpoint with punkter query parameter
   * API format: punkter=[[lon,lat],[lon,lat],...] (max 50 points)
   */
  private async fetchElevationBatch(
    coords: [number, number][]
  ): Promise<ElevationPoint[]> {
    // Convert to API format: [[lon, lat], [lon, lat], ...]
    // Note: API expects [east/lon, north/lat] order
    const punkterParam = JSON.stringify(coords)

    // Build query parameters
    const params = new URLSearchParams({
      koordsys: '4326',  // WGS84 coordinate system (EPSG:4326)
      punkter: punkterParam
    })

    try {
      const response = await fetch(`${this.API_URL}?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`Kartverket Høydedata API returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Validate response structure
      if (!data.punkter || !Array.isArray(data.punkter)) {
        throw new Error('Invalid response from Kartverket API')
      }

      return data.punkter as ElevationPoint[]
    } catch (error) {
      devError('[ElevationService] Failed to fetch elevation batch:', error)
      throw new Error('Kunne ikke hente høydedata fra Kartverket')
    }
  }

  /**
   * Calculate elevation gain/loss and statistics
   */
  private calculateStatistics(points: ElevationPoint[]): ElevationStatistics {
    if (points.length === 0) {
      return {
        totalGain: 0,
        totalLoss: 0,
        minElevation: 0,
        maxElevation: 0,
        avgElevation: 0
      }
    }

    let totalGain = 0
    let totalLoss = 0
    let minElevation = Infinity
    let maxElevation = -Infinity
    let sumElevation = 0

    for (let i = 0; i < points.length; i++) {
      const z = points[i].z
      sumElevation += z
      minElevation = Math.min(minElevation, z)
      maxElevation = Math.max(maxElevation, z)

      // Calculate gain/loss (skip first point)
      if (i > 0) {
        const diff = z - points[i - 1].z
        if (diff > 0) {
          totalGain += diff
        } else {
          totalLoss += Math.abs(diff)
        }
      }
    }

    return {
      totalGain: Math.round(totalGain),
      totalLoss: Math.round(totalLoss),
      minElevation: Math.round(minElevation),
      maxElevation: Math.round(maxElevation),
      avgElevation: Math.round(sumElevation / points.length)
    }
  }

  /**
   * Haversine distance formula (meters between two coordinates)
   * Reused pattern from routeService
   */
  private haversineDistance(
    coord1: [number, number],
    coord2: [number, number]
  ): number {
    const R = 6371000 // Earth radius in meters
    const lat1 = coord1[1] * Math.PI / 180
    const lat2 = coord2[1] * Math.PI / 180
    const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180
    const deltaLon = (coord2[0] - coord1[0]) * Math.PI / 180

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * Calculate cumulative distances for chart x-axis
   * Returns array of cumulative distances in meters
   */
  getCumulativeDistances(points: ElevationPoint[]): number[] {
    const distances: number[] = [0]

    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1]
      const currPoint = points[i]
      const segmentDistance = this.haversineDistance(
        [prevPoint.x, prevPoint.y],
        [currPoint.x, currPoint.y]
      )
      distances.push(distances[i - 1] + segmentDistance)
    }

    return distances
  }

  // --- IndexedDB Cache Methods ---

  /**
   * Get cached elevation profile for a route
   */
  private async getCachedProfile(routeId: string): Promise<ElevationProfile | null> {
    try {
      const db = await dbService.getDatabase()
      const tx = db.transaction('elevationProfiles', 'readonly')
      const store = tx.objectStore('elevationProfiles')
      const request = store.get(routeId)

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result || null)
        }
        request.onerror = () => {
          devError('[ElevationService] Failed to read from cache:', request.error)
          resolve(null)
        }
      })
    } catch (error) {
      devError('[ElevationService] Cache read error:', error)
      return null
    }
  }

  /**
   * Cache elevation profile in IndexedDB
   */
  private async cacheProfile(profile: ElevationProfile): Promise<void> {
    try {
      const db = await dbService.getDatabase()
      const tx = db.transaction('elevationProfiles', 'readwrite')
      const store = tx.objectStore('elevationProfiles')
      const request = store.put(profile)

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          devLog(`[ElevationService] Cached elevation for route ${profile.routeId}`)
          resolve()
        }
        request.onerror = () => {
          devError('[ElevationService] Failed to write to cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      devError('[ElevationService] Cache write error:', error)
      throw error
    }
  }

  /**
   * Clear cached elevation profile for a route
   */
  async clearCachedProfile(routeId: string): Promise<void> {
    try {
      const db = await dbService.getDatabase()
      const tx = db.transaction('elevationProfiles', 'readwrite')
      const store = tx.objectStore('elevationProfiles')
      const request = store.delete(routeId)

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          devLog(`[ElevationService] Cleared cached elevation for route ${routeId}`)
          resolve()
        }
        request.onerror = () => {
          devError('[ElevationService] Failed to clear cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      devError('[ElevationService] Cache clear error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const elevationService = new ElevationService()
export default elevationService
