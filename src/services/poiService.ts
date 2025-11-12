// POI (Point of Interest) Service for fetching and managing category data
// Currently supports: Public shelters (Tilfluktsrom)

export interface ShelterPOI {
  id: string
  type: 'shelter'
  name: string
  address: string
  capacity: number
  category: string
  coordinates: [number, number] // [lon, lat]
}

export type POI = ShelterPOI

export type POICategory = 'shelters'

interface CategoryConfig {
  id: POICategory
  name: string
  icon: string
  color: string
  wfsUrl: string
  layerName: string
}

const CATEGORIES: Record<POICategory, CategoryConfig> = {
  shelters: {
    id: 'shelters',
    name: 'Tilfluktsrom',
    icon: 'custom-t-marker', // Custom T marker
    color: '#fbbf24', // Yellow background (matches app design)
    wfsUrl: 'https://ogc.dsb.no/wfs.ashx',
    layerName: 'layer_340'
  }
}

interface BoundsRect {
  north: number
  south: number
  east: number
  west: number
}

interface CacheEntry {
  pois: POI[]
  bounds: BoundsRect
  zoom: number
  timestamp: number
}

class POIService {
  // Viewport-aware cache: key = "category-north,south,east,west-z##"
  private cache: Map<string, CacheEntry> = new Map()
  private loading: Map<string, Promise<POI[]>> = new Map()
  private readonly CACHE_TTL = 300000 // 5 minutes

  // Get category configuration
  getCategoryConfig(category: POICategory): CategoryConfig {
    return CATEGORIES[category]
  }

  // Get all available categories
  getAllCategories(): CategoryConfig[] {
    return Object.values(CATEGORIES)
  }

  // Generate cache key from category, bounds, and zoom
  private getCacheKey(category: POICategory, bounds: BoundsRect, zoom: number): string {
    // Round to 4 decimals for cache efficiency
    const n = bounds.north.toFixed(4)
    const s = bounds.south.toFixed(4)
    const e = bounds.east.toFixed(4)
    const w = bounds.west.toFixed(4)
    const z = Math.floor(zoom)
    return `${category}-${n},${s},${e},${w}-z${z}`
  }

  // Check if cache entry is stale
  private isCacheStale(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_TTL
  }

  // Parse GML Point coordinates from WFS response
  private parseGMLCoordinates(posText: string): [number, number] | null {
    try {
      const parts = posText.trim().split(/\s+/)
      if (parts.length === 2) {
        const lat = parseFloat(parts[0])
        const lon = parseFloat(parts[1])
        return [lon, lat] // Return as [lon, lat]
      }
    } catch (error) {
      console.error('Failed to parse coordinates:', error)
    }
    return null
  }

  // Parse shelters from GML response
  private parseShelterGML(gmlText: string): ShelterPOI[] {
    const shelters: ShelterPOI[] = []

    try {
      // Parse XML using DOMParser
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(gmlText, 'text/xml')

      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror')
      if (parseError) {
        console.error('XML parsing error:', parseError.textContent)
        return shelters
      }

      // Find all feature members
      const features = xmlDoc.getElementsByTagNameNS('http://www.opengis.net/gml', 'featureMember')

      for (let i = 0; i < features.length; i++) {
        const feature = features[i]

        // Extract properties - try both with and without namespace
        const romnr =
          feature.querySelector('romnr')?.textContent ||
          feature.querySelector('ms\\:romnr')?.textContent ||
          feature.getElementsByTagName('romnr')[0]?.textContent ||
          feature.getElementsByTagName('ms:romnr')[0]?.textContent ||
          `shelter-${i}`

        const adresse =
          feature.querySelector('adresse')?.textContent ||
          feature.querySelector('ms\\:adresse')?.textContent ||
          feature.getElementsByTagName('adresse')[0]?.textContent ||
          feature.getElementsByTagName('ms:adresse')[0]?.textContent ||
          'Ukjent adresse'

        const plasser =
          feature.querySelector('plasser')?.textContent ||
          feature.querySelector('ms\\:plasser')?.textContent ||
          feature.getElementsByTagName('plasser')[0]?.textContent ||
          feature.getElementsByTagName('ms:plasser')[0]?.textContent ||
          '0'

        const kategori =
          feature.querySelector('t_kategori')?.textContent ||
          feature.querySelector('ms\\:t_kategori')?.textContent ||
          feature.getElementsByTagName('t_kategori')[0]?.textContent ||
          feature.getElementsByTagName('ms:t_kategori')[0]?.textContent ||
          'Ukjent'

        // Extract coordinates
        const posElement = feature.getElementsByTagNameNS('http://www.opengis.net/gml', 'pos')[0]
        const posText = posElement?.textContent

        if (posText) {
          const coords = this.parseGMLCoordinates(posText)
          if (coords) {
            shelters.push({
              id: `shelter-${romnr}`,
              type: 'shelter',
              name: `Tilfluktsrom ${romnr}`,
              address: adresse,
              capacity: parseInt(plasser, 10) || 0,
              category: kategori,
              coordinates: coords
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse shelter GML:', error)
    }

    return shelters
  }

  // Fetch shelters from WFS service with viewport-aware caching
  async fetchShelters(bounds: { north: number; south: number; east: number; west: number }, zoom: number): Promise<ShelterPOI[]> {
    const cacheKey = this.getCacheKey('shelters', bounds, zoom)

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      if (!this.isCacheStale(cached.timestamp)) {
        console.log(`[POIService] Cache hit: ${cacheKey} (${cached.pois.length} shelters)`)
        return cached.pois as ShelterPOI[]
      } else {
        console.log(`[POIService] Cache stale: ${cacheKey}`)
        this.cache.delete(cacheKey)
      }
    }

    // Check if already loading this viewport
    if (this.loading.has(cacheKey)) {
      console.log(`[POIService] Already loading: ${cacheKey}`)
      return this.loading.get(cacheKey) as Promise<ShelterPOI[]>
    }

    // Fetch from WFS with BBOX
    const config = CATEGORIES.shelters
    const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north},EPSG:4326`
    const url = `${config.wfsUrl}?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&TYPENAME=${config.layerName}&SRSNAME=EPSG:4326&BBOX=${bbox}`

    console.log(`[POIService] Fetching shelters for viewport: ${cacheKey}`)

    const fetchPromise = fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`WFS request failed: ${response.status}`)
        }
        return response.text()
      })
      .then(gmlText => {
        const shelters = this.parseShelterGML(gmlText)
        console.log(`[POIService] Fetched ${shelters.length} shelters for ${cacheKey}`)

        // Cache the results with viewport bounds and timestamp
        this.cache.set(cacheKey, {
          pois: shelters,
          bounds,
          zoom,
          timestamp: Date.now()
        })

        this.loading.delete(cacheKey)
        return shelters
      })
      .catch(error => {
        console.error('Failed to fetch shelters:', error)
        this.loading.delete(cacheKey)
        return []
      })

    this.loading.set(cacheKey, fetchPromise)
    return fetchPromise
  }

  // Get POIs for a category with viewport bounds and zoom
  async getPOIs(category: POICategory, bounds: { north: number; south: number; east: number; west: number }, zoom: number): Promise<POI[]> {
    switch (category) {
      case 'shelters':
        return this.fetchShelters(bounds, zoom)
      default:
        return []
    }
  }

  // Clear all cache entries (useful for debugging or forced refresh)
  clearCache(): void {
    this.cache.clear()
    this.loading.clear()
    console.log('[POIService] Cache cleared')
  }

  // Clear stale cache entries (cleanup utility)
  clearStaleCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key)
      }
    }
  }

  // Get total count for a category (from all cache entries)
  getCachedCount(category: POICategory): number {
    let total = 0
    const seenIds = new Set<string>()

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(category)) {
        entry.pois.forEach(poi => {
          if (!seenIds.has(poi.id)) {
            seenIds.add(poi.id)
            total++
          }
        })
      }
    }

    return total
  }

  // Check if category has any cached data
  isCached(category: POICategory): boolean {
    for (const key of this.cache.keys()) {
      if (key.startsWith(category)) {
        return true
      }
    }
    return false
  }
}

export const poiService = new POIService()
