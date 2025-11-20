// Weather Service for Tråkke PWA
// Fetches weather forecasts from MET Norway Locationforecast 2.0 API
// Caches forecasts in IndexedDB for 2 hours

import { dbService } from './dbService'
import { devLog, devError } from '../constants'

interface WeatherInstant {
  air_temperature: number
  wind_speed: number
  wind_from_direction: number
  relative_humidity: number
  cloud_area_fraction?: number
}

interface WeatherNext1Hours {
  summary: {
    symbol_code: string
  }
  details?: {
    precipitation_amount?: number
    precipitation_probability?: number
  }
}

interface WeatherTimepoint {
  time: string
  data: {
    instant: {
      details: WeatherInstant
    }
    next_1_hours?: WeatherNext1Hours
    next_6_hours?: WeatherNext1Hours
  }
}

interface MetApiResponse {
  properties: {
    timeseries: WeatherTimepoint[]
  }
}

export interface WeatherData {
  temperature: number
  feelsLike?: number
  precipitation: number
  precipitationProbability: number
  windSpeed: number
  windDirection: number
  humidity: number
  cloudCoverage: number
  symbol: string
  time: string
}

export interface BathingTemperature {
  name: string
  lat: number
  lon: number
  heatedWater: boolean
  temperature: number
  time: string
  distance?: number  // Distance from user location in km
}

export interface WeatherForecast {
  location: { lat: number; lon: number }
  current: WeatherData
  hourly: WeatherData[]  // Next 24 hours
  daily: WeatherData[]   // Next 7 days (6-hour intervals)
  bathingTemp: BathingTemperature | null  // Nearest bathing temperature (if available)
  fetchedAt: number
  expiresAt: number
}

class WeatherService {
  private readonly API_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact'
  private readonly BATHING_API_URL = 'https://badetemperaturer.yr.no/api'
  private readonly CACHE_TTL = 2 * 60 * 60 * 1000  // 2 hours (MET updates hourly)
  private readonly BATHING_CACHE_TTL = 6 * 60 * 60 * 1000  // 6 hours (water temp changes slowly)
  private readonly USER_AGENT = 'Trakke-PWA/1.0 (https://github.com/elzacka/trakke-pwa) hei@tazk.no'
  private readonly MAX_BATHING_DISTANCE_KM = 50  // Maximum distance to show bathing temp

  /**
   * Get weather forecast for coordinates
   * Truncates to 4 decimals (MET requirement), caches in IndexedDB
   *
   * PRIVACY NOTE: Direct API calls expose user IP to MET Norway.
   * MET Norway logs IP addresses in Oslo, Norway datacenter.
   */
  async getForecast(lat: number, lon: number): Promise<WeatherForecast> {
    // Truncate coordinates to 4 decimals (~11m accuracy, MET requirement)
    const truncLat = Math.round(lat * 10000) / 10000
    const truncLon = Math.round(lon * 10000) / 10000

    // Check IndexedDB cache
    const cached = await this.getCachedForecast(truncLat, truncLon)
    if (cached && Date.now() < cached.expiresAt) {
      devLog(`[WeatherService] Using cached forecast for ${truncLat},${truncLon}`)
      return cached
    }

    devLog(`[WeatherService] Fetching forecast from MET Norway for ${truncLat},${truncLon}`)

    // Fetch from MET Norway API
    const url = `${this.API_URL}?lat=${truncLat}&lon=${truncLon}`

    try {
      const response = await fetch(url, {
        headers: {
          // Note: User-Agent header is restricted in browsers
          // MET Norway accepts Origin/Referer as fallback
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('For mange forespørsler til MET Norway. Prøv igjen om litt.')
        }
        if (response.status === 403) {
          throw new Error('Tilgang nektet. Koordinatene kan være utenfor Norge.')
        }
        throw new Error(`MET Norway API returnerte ${response.status}: ${response.statusText}`)
      }

      const metData = await response.json()
      const forecast = await this.parseMetData(metData, truncLat, truncLon)

      // Cache in IndexedDB
      await this.cacheForecast(forecast)

      return forecast
    } catch (error) {
      devError('[WeatherService] Failed to fetch weather:', error)

      // Try to return stale cache if available
      if (cached) {
        devLog('[WeatherService] Returning stale cached data due to API error')
        return cached
      }

      throw error
    }
  }

  /**
   * Parse MET Norway API response format
   */
  private async parseMetData(data: MetApiResponse, lat: number, lon: number): Promise<WeatherForecast> {
    const timeseries: WeatherTimepoint[] = data.properties.timeseries

    if (!timeseries || timeseries.length === 0) {
      throw new Error('No weather data available from MET Norway')
    }

    // Find the closest timepoint to current time (MET returns future forecasts)
    const now = new Date()
    let closestIndex = 0
    let minTimeDiff = Math.abs(new Date(timeseries[0].time).getTime() - now.getTime())

    for (let i = 1; i < Math.min(5, timeseries.length); i++) {
      const timeDiff = Math.abs(new Date(timeseries[i].time).getTime() - now.getTime())
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff
        closestIndex = i
      }
    }

    const current = this.parseWeatherTimepoint(timeseries[closestIndex])

    // Next 24 hours (hourly data from current point)
    const hourly = timeseries.slice(closestIndex, closestIndex + 24).map(t => this.parseWeatherTimepoint(t))

    // Next 7 days: Group by calendar day (Norway timezone) and take noon forecast for each day
    const daily = this.groupByDay(timeseries.slice(closestIndex))

    const nowTimestamp = Date.now()

    // Fetch bathing temperature (don't block on failure)
    let bathingTemp: BathingTemperature | null = null
    try {
      bathingTemp = await this.getNearestBathingTemp(lat, lon)
    } catch (error) {
      devError('[WeatherService] Failed to fetch bathing temperature:', error)
    }

    return {
      location: { lat, lon },
      current,
      hourly,
      daily,
      bathingTemp,
      fetchedAt: nowTimestamp,
      expiresAt: nowTimestamp + this.CACHE_TTL
    }
  }

  /**
   * Group forecast data by calendar day and return one representative forecast per day
   * Takes the forecast closest to noon (12:00) for each unique day
   */
  private groupByDay(timeseries: WeatherTimepoint[]): WeatherData[] {
    const dayMap = new Map<string, WeatherTimepoint[]>()

    // Group timepoints by calendar day (YYYY-MM-DD in Norway timezone)
    for (const timepoint of timeseries) {
      const date = new Date(timepoint.time)
      // Use Norwegian timezone (UTC+1/UTC+2)
      const dateKey = date.toLocaleDateString('no-NO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Europe/Oslo'
      })

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, [])
      }
      dayMap.get(dateKey)!.push(timepoint)
    }

    // For each day, select the forecast closest to noon (12:00)
    const dailyForecasts: WeatherData[] = []

    for (const [, timepoints] of dayMap) {
      // Find timepoint closest to 12:00 (noon)
      let closestToNoon = timepoints[0]
      let minDiff = Math.abs(new Date(timepoints[0].time).getHours() - 12)

      for (const tp of timepoints) {
        const hour = new Date(tp.time).getHours()
        const diff = Math.abs(hour - 12)
        if (diff < minDiff) {
          minDiff = diff
          closestToNoon = tp
        }
      }

      dailyForecasts.push(this.parseWeatherTimepoint(closestToNoon))
    }

    // Return up to 7 days
    return dailyForecasts.slice(0, 7)
  }

  /**
   * Parse individual weather timepoint
   */
  private parseWeatherTimepoint(timepoint: WeatherTimepoint): WeatherData {
    const instant = timepoint.data.instant.details
    const next1h = timepoint.data.next_1_hours
    const next6h = timepoint.data.next_6_hours

    // Use next_1_hours if available, otherwise next_6_hours
    const forecast = next1h || next6h

    return {
      temperature: instant.air_temperature,
      precipitation: forecast?.details?.precipitation_amount || 0,
      precipitationProbability: forecast?.details?.precipitation_probability || 0,
      windSpeed: instant.wind_speed,
      windDirection: instant.wind_from_direction,
      humidity: instant.relative_humidity,
      cloudCoverage: instant.cloud_area_fraction || 0,
      symbol: forecast?.summary?.symbol_code || 'unknown',
      time: timepoint.time
    }
  }

  /**
   * Get weather symbol icon path for display
   * Returns path to MET Norway official SVG weather icon
   * Symbol codes from API directly match icon filenames
   *
   * Icons: © 2015-2017 Yr, MIT License
   * Source: https://github.com/metno/weathericons
   */
  getWeatherIcon(symbol: string): string {
    // Symbol code from API directly maps to SVG filename
    // Use BASE_URL to handle /trakke-pwa/ subdirectory in production
    const baseUrl = import.meta.env.BASE_URL
    return `${baseUrl}icons/weather/${symbol}.svg`
  }

  /**
   * Get human-readable wind direction
   */
  getWindDirection(degrees: number): string {
    const directions = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV']
    const index = Math.round(degrees / 45) % 8
    return directions[index]
  }

  // --- Bathing Temperature Methods ---

  /**
   * Get nearest bathing temperature location
   *
   * PRIVACY NOTE: Requires API key from Yr. Currently returns null until API key is configured.
   * To get API key, email support@yr.no with subject "Forespørsel om API-nøkkel til badetemperaturer"
   *
   * TODO: Add API key configuration when ready to enable this feature
   */
  private async getNearestBathingTemp(lat: number, lon: number): Promise<BathingTemperature | null> {
    // Check cache first
    const cached = await this.getCachedBathingTemp(lat, lon)
    if (cached && Date.now() < cached.expiresAt) {
      devLog('[WeatherService] Using cached bathing temperature')
      return cached.data
    }

    // API key not configured yet - return null for now
    // When ready to enable: Add API key to environment/config and uncomment below
    devLog('[WeatherService] Bathing temperature API not yet configured (requires API key from Yr)')
    return null

    /* UNCOMMENT WHEN API KEY IS READY:
    try {
      const response = await fetch(`${this.BATHING_API_URL}/watertemperatures`, {
        headers: {
          'apikey': 'YOUR_API_KEY_HERE',  // TODO: Move to environment variable
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Bathing temp API returned ${response.status}`)
      }

      const data: BathingTemperature[] = await response.json()

      // Find nearest location within MAX_BATHING_DISTANCE_KM
      const nearest = this.findNearestBathingLocation(data, lat, lon)

      if (nearest) {
        // Cache the result
        await this.cacheBathingTemp(lat, lon, nearest)
      }

      return nearest
    } catch (error) {
      devError('[WeatherService] Failed to fetch bathing temperature:', error)
      return cached?.data || null  // Return stale cache on error
    }
    */
  }

  /**
   * Find nearest bathing location within max distance
   * Uses Haversine formula for distance calculation
   */
  private findNearestBathingLocation(
    locations: BathingTemperature[],
    lat: number,
    lon: number
  ): BathingTemperature | null {
    if (!locations || locations.length === 0) return null

    let nearest: BathingTemperature | null = null
    let minDistance = this.MAX_BATHING_DISTANCE_KM

    for (const location of locations) {
      const distance = this.calculateDistance(lat, lon, location.lat, location.lon)

      if (distance < minDistance) {
        minDistance = distance
        nearest = { ...location, distance }
      }
    }

    return nearest
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // --- IndexedDB Cache Methods ---

  /**
   * Get cached weather forecast
   */
  private async getCachedForecast(lat: number, lon: number): Promise<WeatherForecast | null> {
    try {
      const db = await dbService.getDatabase()
      const tx = db.transaction('weatherCache', 'readonly')
      const store = tx.objectStore('weatherCache')
      const id = `${lat},${lon}`
      const request = store.get(id)

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result || null)
        }
        request.onerror = () => {
          devError('[WeatherService] Failed to read from cache:', request.error)
          resolve(null)
        }
      })
    } catch (error) {
      devError('[WeatherService] Cache read error:', error)
      return null
    }
  }

  /**
   * Cache weather forecast in IndexedDB
   */
  private async cacheForecast(forecast: WeatherForecast): Promise<void> {
    try {
      const db = await dbService.getDatabase()
      const tx = db.transaction('weatherCache', 'readwrite')
      const store = tx.objectStore('weatherCache')
      const id = `${forecast.location.lat},${forecast.location.lon}`

      const cacheEntry = {
        id,
        ...forecast
      }

      const request = store.put(cacheEntry)

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          devLog(`[WeatherService] Cached forecast for ${id}`)
          resolve()
        }
        request.onerror = () => {
          devError('[WeatherService] Failed to write to cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      devError('[WeatherService] Cache write error:', error)
      throw error
    }
  }

  /**
   * Clear expired cache entries (cleanup utility)
   */
  async clearExpiredCache(): Promise<number> {
    try {
      const db = await dbService.getDatabase()
      const tx = db.transaction('weatherCache', 'readwrite')
      const store = tx.objectStore('weatherCache')
      const index = store.index('expiresAt')

      const now = Date.now()
      const range = IDBKeyRange.upperBound(now)
      const request = index.openCursor(range)

      let deletedCount = 0

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            cursor.delete()
            deletedCount++
            cursor.continue()
          } else {
            devLog(`[WeatherService] Cleared ${deletedCount} expired cache entries`)
            resolve(deletedCount)
          }
        }
        request.onerror = () => {
          devError('[WeatherService] Failed to clear expired cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      devError('[WeatherService] Cache cleanup error:', error)
      throw error
    }
  }

  // --- Bathing Temperature Cache Methods ---

  /**
   * Get cached bathing temperature
   */
  private async getCachedBathingTemp(
    lat: number,
    lon: number
  ): Promise<{ data: BathingTemperature; expiresAt: number } | null> {
    try {
      const db = await dbService.getDatabase()
      const tx = db.transaction('bathingTempCache', 'readonly')
      const store = tx.objectStore('bathingTempCache')
      const id = `${lat},${lon}`
      const request = store.get(id)

      return new Promise((resolve) => {
        request.onsuccess = () => {
          resolve(request.result || null)
        }
        request.onerror = () => {
          devError('[WeatherService] Failed to read bathing temp from cache:', request.error)
          resolve(null)
        }
      })
    } catch (error) {
      devError('[WeatherService] Bathing temp cache read error:', error)
      return null
    }
  }

  /**
   * Cache bathing temperature in IndexedDB
   */
  private async cacheBathingTemp(
    lat: number,
    lon: number,
    data: BathingTemperature
  ): Promise<void> {
    try {
      const db = await dbService.getDatabase()
      const tx = db.transaction('bathingTempCache', 'readwrite')
      const store = tx.objectStore('bathingTempCache')
      const id = `${lat},${lon}`

      const cacheEntry = {
        id,
        data,
        expiresAt: Date.now() + this.BATHING_CACHE_TTL
      }

      const request = store.put(cacheEntry)

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          devLog(`[WeatherService] Cached bathing temp for ${id}`)
          resolve()
        }
        request.onerror = () => {
          devError('[WeatherService] Failed to cache bathing temp:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      devError('[WeatherService] Bathing temp cache write error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const weatherService = new WeatherService()
export default weatherService
