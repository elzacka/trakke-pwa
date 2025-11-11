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
    icon: 'shield',
    color: '#dc2626', // Red for emergency
    wfsUrl: 'https://ogc.dsb.no/wfs.ashx',
    layerName: 'layer_340'
  }
}

class POIService {
  private cache: Map<POICategory, POI[]> = new Map()
  private loading: Map<POICategory, Promise<POI[]>> = new Map()

  // Get category configuration
  getCategoryConfig(category: POICategory): CategoryConfig {
    return CATEGORIES[category]
  }

  // Get all available categories
  getAllCategories(): CategoryConfig[] {
    return Object.values(CATEGORIES)
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

        // Extract properties
        const romnr = feature.querySelector('romnr')?.textContent || `shelter-${i}`
        const adresse = feature.querySelector('adresse')?.textContent || 'Ukjent adresse'
        const plasser = feature.querySelector('plasser')?.textContent || '0'
        const kategori = feature.querySelector('t_kategori')?.textContent || 'Ukjent'

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

  // Fetch shelters from WFS service
  async fetchShelters(bounds?: { north: number; south: number; east: number; west: number }): Promise<ShelterPOI[]> {
    // Check cache first
    if (this.cache.has('shelters')) {
      const cached = this.cache.get('shelters') as ShelterPOI[]

      // If bounds provided, filter cached results
      if (bounds) {
        return cached.filter(shelter => {
          const [lon, lat] = shelter.coordinates
          return lat >= bounds.south && lat <= bounds.north &&
                 lon >= bounds.west && lon <= bounds.east
        })
      }

      return cached
    }

    // Check if already loading
    if (this.loading.has('shelters')) {
      return this.loading.get('shelters') as Promise<ShelterPOI[]>
    }

    // Fetch from WFS
    const config = CATEGORIES.shelters
    let url = `${config.wfsUrl}?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&TYPENAME=${config.layerName}&SRSNAME=EPSG:4326`

    // Add bbox filter if bounds provided
    if (bounds) {
      const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north},EPSG:4326`
      url += `&BBOX=${bbox}`
    }

    const fetchPromise = fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`WFS request failed: ${response.status}`)
        }
        return response.text()
      })
      .then(gmlText => {
        const shelters = this.parseShelterGML(gmlText)

        // Cache the results (only cache if no bounds filter)
        if (!bounds) {
          this.cache.set('shelters', shelters)
        }

        this.loading.delete('shelters')
        return shelters
      })
      .catch(error => {
        console.error('Failed to fetch shelters:', error)
        this.loading.delete('shelters')
        return []
      })

    this.loading.set('shelters', fetchPromise)
    return fetchPromise
  }

  // Get POIs for a category
  async getPOIs(category: POICategory, bounds?: { north: number; south: number; east: number; west: number }): Promise<POI[]> {
    switch (category) {
      case 'shelters':
        return this.fetchShelters(bounds)
      default:
        return []
    }
  }

  // Clear cache for a category
  clearCache(category?: POICategory): void {
    if (category) {
      this.cache.delete(category)
    } else {
      this.cache.clear()
    }
  }

  // Get total count for a category (from cache)
  getCachedCount(category: POICategory): number {
    const cached = this.cache.get(category)
    return cached ? cached.length : 0
  }

  // Check if category is cached
  isCached(category: POICategory): boolean {
    return this.cache.has(category)
  }
}

export const poiService = new POIService()
