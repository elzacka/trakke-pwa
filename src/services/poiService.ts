// POI (Point of Interest) Service for fetching and managing category data
// Supports: Emergency shelters (Tilfluktsrom), Wilderness shelters (Gapahuk/vindskjul), Caves (Huler), Observation Towers, War Memorials (Forts, Bunkers, Battlefields)

import { CACHE_CONFIG } from '../config/timings'
import { devLog, devError } from '../constants'

export interface ShelterPOI {
  id: string
  type: 'shelter'
  name: string
  address: string
  capacity: number
  category: string
  coordinates: [number, number] // [lon, lat]
}

export interface CavePOI {
  id: string
  type: 'cave'
  name: string
  description?: string
  coordinates: [number, number] // [lon, lat]
}

export interface ObservationTowerPOI {
  id: string
  type: 'observation_tower'
  name: string
  height?: number // meters
  operator?: string
  coordinates: [number, number] // [lon, lat]
}

export interface WarMemorialPOI {
  id: string
  type: 'war_memorial'
  name: string
  inscription?: string
  period?: string // e.g., "World War II"
  coordinates: [number, number] // [lon, lat]
}

export interface WildernessShelterPOI {
  id: string
  type: 'wilderness_shelter'
  name: string
  shelter_type?: string // basic_hut, weather_shelter, rock_shelter, lavvu
  description?: string
  coordinates: [number, number] // [lon, lat]
}

export interface KulturminnerPOI {
  id: string
  type: 'kulturminner'
  name: string
  description?: string
  municipality?: string
  county?: string
  created_by?: string
  link?: string
  coordinates: [number, number] // [lon, lat]
}

export type POI = ShelterPOI | CavePOI | ObservationTowerPOI | WarMemorialPOI | WildernessShelterPOI | KulturminnerPOI

export type POICategory = 'shelters' | 'caves' | 'observation_towers' | 'war_memorials' | 'wilderness_shelters' | 'kulturminner'

// Overpass API response types
interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  nodes?: number[] // For ways: array of node IDs
  members?: Array<{ type: string; ref: number; role: string }> // For relations
  tags?: Record<string, string>
}

interface OverpassResponse {
  version: number
  generator: string
  osm3s?: {
    timestamp_osm_base: string
    copyright: string
  }
  elements: OverpassElement[]
}

interface CategoryConfig {
  id: POICategory
  name: string
  icon: string
  color: string
  dataSource: 'wfs' | 'overpass' | 'geojson-api' // WFS for government data, Overpass for OSM data, GeoJSON API for Riksantikvaren
  minZoom: number // Minimum zoom level to show this category
  // WFS-specific (for shelters)
  wfsUrl?: string
  layerName?: string
  // Overpass-specific (for new categories)
  overpassQuery?: string
  // GeoJSON API-specific (for kulturminner)
  apiUrl?: string
}

const CATEGORIES: Record<POICategory, CategoryConfig> = {
  shelters: {
    id: 'shelters',
    name: 'Tilfluktsrom',
    icon: 'custom-t-marker', // Custom T marker
    color: '#fbbf24', // Yellow
    dataSource: 'wfs',
    minZoom: 10, // Urban features, show at higher zoom
    wfsUrl: 'https://ogc.dsb.no/wfs.ashx',
    layerName: 'layer_340'
  },

  caves: {
    id: 'caves',
    name: 'Huler',
    icon: 'terrain', // Material Symbol
    color: '#8b4513', // Saddle brown
    dataSource: 'overpass',
    minZoom: 10, // Small natural features, show at higher zoom
    overpassQuery: `[out:json][timeout:25];(node["natural"="cave_entrance"]({{bbox}}););out body;>;out skel qt;`
  },

  observation_towers: {
    id: 'observation_towers',
    name: 'Observasjonstårn',
    icon: 'castle', // Material Symbol
    color: '#4a5568', // Gray
    dataSource: 'overpass',
    minZoom: 9, // Landmarks, show at medium zoom
    overpassQuery: `[out:json][timeout:25];(node["man_made"="tower"]["tower:type"="observation"]({{bbox}});way["man_made"="tower"]["tower:type"="observation"]({{bbox}}););out body;>;out skel qt;`
  },

  war_memorials: {
    id: 'war_memorials',
    name: 'Krigsminner',
    icon: 'monument', // Material Symbol
    color: '#6b7280', // Dark gray
    dataSource: 'overpass',
    minZoom: 9, // Historical sites, show at medium zoom
    // Query for historical military sites: forts, bunkers (military=bunker OR historic=bunker), battlefields (from T1)
    overpassQuery: `[out:json][timeout:25];(node["historic"="fort"]({{bbox}});way["historic"="fort"]({{bbox}});node["military"="bunker"]({{bbox}});way["military"="bunker"]({{bbox}});node["historic"="bunker"]({{bbox}});way["historic"="bunker"]({{bbox}});node["historic"="battlefield"]({{bbox}}););out body;>;out skel qt;`
  },

  wilderness_shelters: {
    id: 'wilderness_shelters',
    name: 'Gapahuk/vindskjul',
    icon: 'cottage', // Material Symbol
    color: '#b45309', // Brown/orange (from T1)
    dataSource: 'overpass',
    minZoom: 10, // Small wilderness features, show at higher zoom
    // Query for outdoor shelters: basic huts, weather shelters, rock shelters, lavvu (from T1)
    overpassQuery: `[out:json][timeout:25];(node["amenity"="shelter"]["shelter_type"="basic_hut"]({{bbox}});way["amenity"="shelter"]["shelter_type"="basic_hut"]({{bbox}});node["amenity"="shelter"]["shelter_type"="weather_shelter"]({{bbox}});way["amenity"="shelter"]["shelter_type"="weather_shelter"]({{bbox}});node["amenity"="shelter"]["shelter_type"="rock_shelter"]({{bbox}});way["amenity"="shelter"]["shelter_type"="rock_shelter"]({{bbox}});node["amenity"="shelter"]["shelter_type"="lavvu"]({{bbox}});way["amenity"="shelter"]["shelter_type"="lavvu"]({{bbox}});node["amenity"="shelter"][!"shelter_type"]({{bbox}});way["amenity"="shelter"][!"shelter_type"]({{bbox}}););out body;>;out skel qt;`
  },

  kulturminner: {
    id: 'kulturminner',
    name: 'Kulturminner',
    icon: 'severdighet', // Geonorge Severdighet icon
    color: '#8b7355', // Warm brown (cultural heritage theme)
    dataSource: 'geojson-api',
    minZoom: 6, // Significant cultural heritage sites, show at very low zoom for maximum discoverability on mobile
    apiUrl: 'https://api.ra.no/brukerminner/collections/brukerminner/items'
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
  private readonly CACHE_TTL = CACHE_CONFIG.POI_TTL
  private readonly OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

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
      devError('Failed to parse coordinates:', error)
    }
    return null
  }

  /**
   * Extract property value from XML feature with namespace fallback
   * Tries multiple selector variations to handle namespaced elements
   */
  private extractXMLProperty(feature: Element, propertyName: string, defaultValue: string = ''): string {
    return (
      feature.querySelector(propertyName)?.textContent ||
      feature.querySelector(`ms\\:${propertyName}`)?.textContent ||
      feature.getElementsByTagName(propertyName)[0]?.textContent ||
      feature.getElementsByTagName(`ms:${propertyName}`)[0]?.textContent ||
      defaultValue
    )
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
        devError('XML parsing error:', parseError.textContent)
        return shelters
      }

      // Find all feature members
      const features = xmlDoc.getElementsByTagNameNS('http://www.opengis.net/gml', 'featureMember')

      for (let i = 0; i < features.length; i++) {
        const feature = features[i]

        // Extract properties using helper
        const romnr = this.extractXMLProperty(feature, 'romnr', `shelter-${i}`)
        const adresse = this.extractXMLProperty(feature, 'adresse', 'Ukjent adresse')
        const plasser = this.extractXMLProperty(feature, 'plasser', '0')
        const kategori = this.extractXMLProperty(feature, 't_kategori', 'Ukjent')

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
      devError('Failed to parse shelter GML:', error)
    }

    return shelters
  }

  /**
   * Calculate coordinates for OSM element (node or way centroid)
   */
  private calculateElementCoordinates(
    element: OverpassElement,
    nodeMap: Map<number, { lon: number; lat: number }>
  ): [number, number] | null {
    if (element.type === 'node') {
      if (element.lon === undefined || element.lat === undefined) return null
      return [element.lon, element.lat]
    }

    if (element.type === 'way') {
      if (!element.nodes || element.nodes.length === 0) return null

      // Look up node coordinates from pre-built map
      const wayNodes = element.nodes
        .map((nodeId: number) => nodeMap.get(nodeId))
        .filter((node): node is { lon: number; lat: number } => node !== undefined)

      if (wayNodes.length === 0) return null

      // Calculate centroid
      const sumLon = wayNodes.reduce((sum, n) => sum + n.lon, 0)
      const sumLat = wayNodes.reduce((sum, n) => sum + n.lat, 0)
      return [sumLon / wayNodes.length, sumLat / wayNodes.length]
    }

    return null
  }

  /**
   * Create cave POI from OSM element
   */
  private createCavePOI(element: OverpassElement, coordinates: [number, number]): CavePOI {
    const tags = element.tags || {}
    return {
      id: `cave-${element.id}`,
      type: 'cave',
      name: tags.name || `Hule #${element.id}`,
      description: tags.description,
      coordinates
    }
  }

  /**
   * Create observation tower POI from OSM element
   */
  private createObservationTowerPOI(element: OverpassElement, coordinates: [number, number]): ObservationTowerPOI {
    const tags = element.tags || {}
    return {
      id: `tower-${element.id}`,
      type: 'observation_tower',
      name: tags.name || `Observasjonstårn #${element.id}`,
      height: tags.height ? parseFloat(tags.height) : undefined,
      operator: tags.operator,
      coordinates
    }
  }

  /**
   * Create war memorial POI from OSM element
   */
  private createWarMemorialPOI(element: OverpassElement, coordinates: [number, number]): WarMemorialPOI {
    const tags = element.tags || {}

    // Generate Norwegian name based on type
    let memorialName = tags.name || tags['name:no'] || tags['name:nb']
    if (!memorialName) {
      if (tags.historic === 'fort') {
        memorialName = 'Fort'
      } else if (tags.historic === 'battlefield') {
        memorialName = 'Slagmark'
      } else if (tags.military === 'bunker' || tags.historic === 'bunker') {
        const bunkerType = tags.bunker_type
        if (bunkerType === 'gun_emplacement') memorialName = 'Kanoninnretning'
        else if (bunkerType === 'shelter') memorialName = 'Skjulsrom'
        else if (bunkerType === 'ammunition') memorialName = 'Ammunisjonsbunker'
        else if (bunkerType === 'technical') memorialName = 'Teknisk bunker'
        else memorialName = 'Bunker'
      } else {
        memorialName = `Krigsminne #${element.id}`
      }
    }

    return {
      id: `memorial-${element.id}`,
      type: 'war_memorial',
      name: memorialName,
      inscription: tags.inscription,
      period: tags['memorial:period'] || tags.start_date || tags.historic,
      coordinates
    }
  }

  /**
   * Create wilderness shelter POI from OSM element
   */
  private createWildernessShelterPOI(element: OverpassElement, coordinates: [number, number]): WildernessShelterPOI {
    const tags = element.tags || {}

    // Generate Norwegian name based on shelter type
    let shelterName = tags.name || tags['name:no'] || tags['name:nb']
    const shelterType = tags.shelter_type

    if (!shelterName) {
      if (shelterType === 'basic_hut') shelterName = 'Gapahuk'
      else if (shelterType === 'weather_shelter') shelterName = 'Vindskjul'
      else if (shelterType === 'rock_shelter') shelterName = 'Helleskjul'
      else if (shelterType === 'lavvu') shelterName = 'Lavvo'
      else shelterName = 'Gapahuk/vindskjul'
    }

    return {
      id: `wilderness-shelter-${element.id}`,
      type: 'wilderness_shelter',
      name: shelterName,
      shelter_type: shelterType,
      description: tags.description,
      coordinates
    }
  }

  /**
   * Parse Overpass API JSON response to POI objects
   * Privacy: Overpass API is EU-based (Germany), no tracking, public OSM data only
   */
  private parseOverpassJSON(data: OverpassResponse, category: POICategory): POI[] {
    if (!data.elements || !Array.isArray(data.elements)) {
      devError('[POIService] Invalid Overpass response:', data)
      return []
    }

    devLog(`[POIService] Parsing ${data.elements.length} elements for ${category}`)

    // Build node lookup map once for O(1) coordinate lookups
    const nodeMap = new Map<number, { lon: number; lat: number }>()
    for (const element of data.elements) {
      if (element.type === 'node' && element.lon !== undefined && element.lat !== undefined) {
        nodeMap.set(element.id, { lon: element.lon, lat: element.lat })
      }
    }

    const pois: POI[] = []
    const seenIds = new Set<string>()

    for (const element of data.elements) {
      // Only process nodes and ways with tags
      if (element.type !== 'node' && element.type !== 'way') continue

      const tags = element.tags
      if (!tags || typeof tags !== 'object' || Object.keys(tags).length === 0) continue

      // Calculate coordinates
      const coordinates = this.calculateElementCoordinates(element, nodeMap)
      if (!coordinates) continue

      let poi: POI | null = null

      switch (category) {
        case 'caves':
          poi = this.createCavePOI(element, coordinates)
          break
        case 'observation_towers':
          poi = this.createObservationTowerPOI(element, coordinates)
          break
        case 'war_memorials':
          poi = this.createWarMemorialPOI(element, coordinates)
          break
        case 'wilderness_shelters':
          poi = this.createWildernessShelterPOI(element, coordinates)
          break
      }

      if (poi) {
        // Check for duplicates
        if (seenIds.has(poi.id)) {
          devError(`[POIService] Duplicate POI ID: ${poi.id}`)
          continue
        }
        seenIds.add(poi.id)
        pois.push(poi)
      }
    }

    devLog(`[POIService] Parsed ${pois.length} unique POIs for ${category}`)
    return pois
  }

  /**
   * Parse GeoJSON FeatureCollection response (e.g., from Riksantikvaren API)
   */
  private parseGeoJSONFeatures(data: any, category: POICategory): POI[] {
    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      devError(`[POIService] Invalid GeoJSON response for ${category}`)
      return []
    }

    const pois: POI[] = []
    const seenIds = new Set<string>()

    for (const feature of data.features) {
      if (!feature.geometry || feature.geometry.type !== 'Point') {
        continue // Skip non-point features
      }

      const coordinates = feature.geometry.coordinates as [number, number]
      const props = feature.properties || {}

      if (category === 'kulturminner') {
        const poi: KulturminnerPOI = {
          id: feature.id || `kulturminner-${Date.now()}-${Math.random()}`,
          type: 'kulturminner',
          name: props.tittel || 'Ukjent kulturminne',
          description: props.beskrivelse,
          municipality: props.kommune,
          county: props.fylke,
          created_by: props.opprettet_av,
          link: props.linkkulturminnesok,
          coordinates
        }

        if (!seenIds.has(poi.id)) {
          seenIds.add(poi.id)
          pois.push(poi)
        }
      }
    }

    devLog(`[POIService] Parsed ${pois.length} unique POIs for ${category}`)
    return pois
  }

  /**
   * Fetch POIs from Overpass API with viewport-aware caching
   * Privacy: German-based EU service, no tracking, public OSM data only
   * External API: See PRIVACY_BY_DESIGN.md#external-api-registry
   */
  async fetchFromOverpass(
    category: POICategory,
    bounds: BoundsRect,
    zoom: number
  ): Promise<POI[]> {
    const cacheKey = this.getCacheKey(category, bounds, zoom)

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      if (!this.isCacheStale(cached.timestamp)) {
        devLog(`[POIService] Cache hit: ${cacheKey} (${cached.pois.length} POIs)`)
        return cached.pois
      }
      devLog(`[POIService] Cache stale: ${cacheKey}`)
      this.cache.delete(cacheKey)
    }

    // Check if already loading
    if (this.loading.has(cacheKey)) {
      devLog(`[POIService] Already loading: ${cacheKey}`)
      return this.loading.get(cacheKey) as Promise<POI[]>
    }

    const config = CATEGORIES[category]
    if (!config.overpassQuery) {
      throw new Error(`No Overpass query for category: ${category}`)
    }

    // Replace {{bbox}} with actual bounds (south,west,north,east)
    const bboxString = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
    const query = config.overpassQuery.replace(/\{\{bbox\}\}/g, bboxString)

    devLog(`[POIService] Fetching ${category} from Overpass: ${cacheKey}`)
    devLog(`[POIService] Query:`, query)

    const fetchPromise = fetch(this.OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Tråkke PWA/0.1.0 (Norwegian outdoor navigation app, contact: hei@tazk.no)'
      },
      body: `data=${encodeURIComponent(query)}`,
      mode: 'cors',
      credentials: 'omit'
    })
      .then(async response => {
        devLog(`[POIService] Overpass response status: ${response.status} ${response.statusText}`)
        devLog(`[POIService] Response headers:`, {
          contentType: response.headers.get('content-type'),
          cors: response.headers.get('access-control-allow-origin')
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response')
          devError(`[POIService] Overpass error response:`, errorText)
          throw new Error(`Overpass request failed: ${response.status} ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          devError(`[POIService] Unexpected content-type: ${contentType}`)
        }

        return response.json()
      })
      .then(data => {
        devLog(`[POIService] Overpass response data:`, {
          hasElements: !!data.elements,
          elementCount: data.elements?.length || 0,
          version: data.version,
          generator: data.generator
        })

        const pois = this.parseOverpassJSON(data, category)
        devLog(`[POIService] Parsed ${pois.length} POIs for ${cacheKey}`)

        // Cache results
        this.cache.set(cacheKey, {
          pois,
          bounds,
          zoom,
          timestamp: Date.now()
        })

        this.loading.delete(cacheKey)
        return pois
      })
      .catch(error => {
        devError(`[POIService] Failed to fetch ${category}:`, error)
        devError(`[POIService] Error type: ${error.name}`)
        devError(`[POIService] Error message: ${error.message}`)
        devError(`[POIService] Error stack:`, error.stack)

        // Check for specific error types
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          devError(`[POIService] Network error - possible CORS issue or network connectivity problem`)
          devError(`[POIService] Ensure ${this.OVERPASS_URL} is accessible and CORS-enabled`)
        }

        this.loading.delete(cacheKey)

        // Re-throw error instead of silently returning empty array
        // This allows useViewportPOIs to handle errors properly
        throw new Error(`Failed to fetch ${category} POIs: ${error.message}`)
      })

    this.loading.set(cacheKey, fetchPromise)
    return fetchPromise
  }

  // Fetch shelters from WFS service with viewport-aware caching
  async fetchShelters(bounds: { north: number; south: number; east: number; west: number }, zoom: number): Promise<ShelterPOI[]> {
    const cacheKey = this.getCacheKey('shelters', bounds, zoom)

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      if (!this.isCacheStale(cached.timestamp)) {
        devLog(`[POIService] Cache hit: ${cacheKey} (${cached.pois.length} shelters)`)
        return cached.pois as ShelterPOI[]
      } else {
        devLog(`[POIService] Cache stale: ${cacheKey}`)
        this.cache.delete(cacheKey)
      }
    }

    // Check if already loading this viewport
    if (this.loading.has(cacheKey)) {
      devLog(`[POIService] Already loading: ${cacheKey}`)
      return this.loading.get(cacheKey) as Promise<ShelterPOI[]>
    }

    // Fetch from WFS with BBOX (format: minLat,minLon,maxLat,maxLon for EPSG:4326)
    const config = CATEGORIES.shelters
    const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east},EPSG:4326`
    const url = `${config.wfsUrl}?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&TYPENAME=${config.layerName}&SRSNAME=EPSG:4326&BBOX=${bbox}`

    devLog(`[POIService] Fetching shelters for viewport: ${cacheKey}`)

    const fetchPromise = fetch(url)
      .then(response => {
        devLog(`[POIService] WFS response status: ${response.status} ${response.statusText}`)
        if (!response.ok) {
          throw new Error(`WFS request failed: ${response.status} ${response.statusText}`)
        }
        return response.text()
      })
      .then(gmlText => {
        const shelters = this.parseShelterGML(gmlText)
        devLog(`[POIService] Fetched ${shelters.length} shelters for ${cacheKey}`)

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
        devError('[POIService] Failed to fetch shelters:', error)
        devError('[POIService] Error type:', error.name)
        devError('[POIService] Error message:', error.message)
        this.loading.delete(cacheKey)

        // Re-throw error instead of silently returning empty array
        throw new Error(`Failed to fetch shelters: ${error.message}`)
      })

    this.loading.set(cacheKey, fetchPromise)
    return fetchPromise
  }

  /**
   * Fetch POIs from Riksantikvaren GeoJSON API (OGC API-Features)
   * Privacy: Norwegian government service (api.ra.no), no tracking, public data only
   * External API: See PRIVACY_BY_DESIGN.md#external-api-registry
   */
  async fetchFromGeoJSONAPI(
    category: POICategory,
    bounds: BoundsRect,
    zoom: number
  ): Promise<POI[]> {
    const cacheKey = this.getCacheKey(category, bounds, zoom)

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      if (!this.isCacheStale(cached.timestamp)) {
        devLog(`[POIService] Cache hit: ${cacheKey} (${cached.pois.length} POIs)`)
        return cached.pois
      }
      devLog(`[POIService] Cache stale: ${cacheKey}`)
      this.cache.delete(cacheKey)
    }

    // Check if already loading
    if (this.loading.has(cacheKey)) {
      devLog(`[POIService] Already loading: ${cacheKey}`)
      return this.loading.get(cacheKey) as Promise<POI[]>
    }

    const config = CATEGORIES[category]
    if (!config.apiUrl) {
      throw new Error(`No API URL for category: ${category}`)
    }

    // Build OGC API-Features URL with bbox parameter (west,south,east,north)
    const bboxString = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
    const url = `${config.apiUrl}?f=json&bbox=${bboxString}&limit=1000`

    devLog(`[POIService] Fetching ${category} from GeoJSON API: ${cacheKey}`)
    devLog(`[POIService] URL:`, url)

    const fetchPromise = fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/geo+json',
        'User-Agent': 'Tråkke PWA/0.1.0 (Norwegian outdoor navigation app, contact: hei@tazk.no)'
      },
      mode: 'cors',
      credentials: 'omit'
    })
      .then(async response => {
        devLog(`[POIService] GeoJSON API response status: ${response.status} ${response.statusText}`)
        devLog(`[POIService] Response headers:`, {
          contentType: response.headers.get('content-type'),
          cors: response.headers.get('access-control-allow-origin')
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response')
          devError(`[POIService] GeoJSON API error response:`, errorText)
          throw new Error(`GeoJSON API request failed: ${response.status} ${response.statusText}`)
        }

        return response.json()
      })
      .then(data => {
        devLog(`[POIService] GeoJSON API response data:`, {
          type: data.type,
          featureCount: data.features?.length || 0,
          numberMatched: data.numberMatched,
          numberReturned: data.numberReturned
        })

        const pois = this.parseGeoJSONFeatures(data, category)
        devLog(`[POIService] Parsed ${pois.length} POIs for ${cacheKey}`)

        // Cache results
        this.cache.set(cacheKey, {
          pois,
          bounds,
          zoom,
          timestamp: Date.now()
        })

        this.loading.delete(cacheKey)
        return pois
      })
      .catch(error => {
        devError(`[POIService] Failed to fetch ${category}:`, error)
        devError(`[POIService] Error type: ${error.name}`)
        devError(`[POIService] Error message: ${error.message}`)
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          devError(`[POIService] Network error - possible CORS issue or network connectivity problem`)
          devError(`[POIService] Ensure ${config.apiUrl} is accessible and CORS-enabled`)
        }
        this.loading.delete(cacheKey)
        throw new Error(`Failed to fetch ${category} POIs: ${error.message}`)
      })

    this.loading.set(cacheKey, fetchPromise)
    return fetchPromise
  }

  // Get POIs for a category with viewport bounds and zoom
  async getPOIs(category: POICategory, bounds: { north: number; south: number; east: number; west: number }, zoom: number): Promise<POI[]> {
    const config = CATEGORIES[category]

    switch (config.dataSource) {
      case 'wfs':
        // WFS for government data (shelters)
        if (category === 'shelters') {
          return this.fetchShelters(bounds, zoom)
        }
        return []

      case 'overpass':
        // Overpass API for OSM data (caves, towers, memorials, shelters)
        return this.fetchFromOverpass(category, bounds, zoom)

      case 'geojson-api':
        // GeoJSON API for Riksantikvaren data (kulturminner)
        return this.fetchFromGeoJSONAPI(category, bounds, zoom)

      default:
        devError(`Unknown data source for ${category}`)
        return []
    }
  }

  // Clear all cache entries (useful for debugging or forced refresh)
  clearCache(): void {
    this.cache.clear()
    this.loading.clear()
    devLog('[POIService] Cache cleared')
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
