// Supabase Personal POI Service
// Read-only MVP: Fetches user-defined POI categories from personal Supabase database
// Privacy: EU-hosted Supabase (Sweden region recommended), user controls their own data
// External API: See PRIVACY_BY_DESIGN.md#external-api-registry

import { devLog, devError } from '../constants'
import { CACHE_CONFIG } from '../config/timings'

// =====================================================
// Type Definitions
// =====================================================

export interface SupabaseConfig {
  projectUrl: string  // https://xxx.supabase.co
  anonKey: string     // Public anon key
  enabled: boolean    // Feature toggle
}

export interface SupabaseCategory {
  id: string
  name: string           // Norwegian display name: "Hengekøyeplasser"
  slug: string           // URL-safe ID: "hengekoyeplasser"
  description?: string
  icon: string           // OSM-Carto symbol name or Material Symbol
  color?: string         // Optional hex color for icon
  minZoom: number        // Minimum zoom level to display
  sortOrder: number      // Display order in menu
}

export interface SupabasePOI {
  id: string
  type: 'supabase'
  categoryId: string        // Reference to category
  categorySlug: string      // For Trakke prefix: supabase:hengekoyeplasser
  name: string
  description?: string      // Supports line breaks
  municipality?: string     // Kommune
  place?: string            // Stedsnavn
  externalUrl?: string      // Link to external page
  imageUrl?: string         // Photo URL
  tags?: Record<string, string>  // OSM-style flexible tags
  coordinates: [number, number]  // [lon, lat]
}

interface BoundsRect {
  north: number
  south: number
  east: number
  west: number
}

interface CategoryCacheEntry {
  categories: SupabaseCategory[]
  timestamp: number
}

interface POICacheEntry {
  pois: SupabasePOI[]
  bounds: BoundsRect
  zoom: number
  timestamp: number
}

// =====================================================
// Constants
// =====================================================

const CACHE_TTL = CACHE_CONFIG.POI_TTL  // 5 minutes (same as other POI sources)

// Built-in Supabase configuration from environment variables
// These are set at build time and bundled into the app
// No user configuration needed - Tråkke spesial is a built-in feature
const BUILT_IN_CONFIG: SupabaseConfig | null = (() => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  if (url && key) {
    devLog('[SupabaseService] Using built-in Supabase configuration')
    return {
      projectUrl: url,
      anonKey: key,
      enabled: true
    }
  }
  devLog('[SupabaseService] No Supabase configuration found (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY not set)')
  return null
})()

// =====================================================
// Supabase Service Class
// =====================================================

class SupabaseService {
  private categoryCache: CategoryCacheEntry | null = null
  private poiCache: Map<string, POICacheEntry> = new Map()
  private loading: Map<string, Promise<SupabasePOI[]>> = new Map()
  private categoryLoading: Promise<SupabaseCategory[]> | null = null

  // =====================================================
  // Configuration Management
  // =====================================================

  /**
   * Get Supabase configuration (built-in from environment variables)
   * No longer user-configurable - Tråkke spesial uses hardcoded config
   */
  getConfig(): SupabaseConfig | null {
    return BUILT_IN_CONFIG
  }

  /**
   * Check if Supabase integration is enabled and configured
   */
  isEnabled(): boolean {
    return BUILT_IN_CONFIG !== null
  }

  // =====================================================
  // Connection Testing
  // =====================================================

  /**
   * Test connection to Supabase by attempting to fetch categories
   */
  async testConnection(): Promise<{ success: boolean; error?: string; categoryCount?: number }> {
    const config = this.getConfig()

    if (!config) {
      return { success: false, error: 'Ingen konfigurasjon funnet' }
    }

    try {
      const url = `${config.projectUrl}/rest/v1/categories?select=id&limit=1`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${config.anonKey}`,
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Ukjent feil')

        if (response.status === 401) {
          return { success: false, error: 'Ugyldig API-nøkkel' }
        }
        if (response.status === 404) {
          return { success: false, error: 'Tabell categories ikke funnet' }
        }

        return { success: false, error: `HTTP ${response.status}: ${errorText}` }
      }

      // Try to get actual category count
      const countUrl = `${config.projectUrl}/rest/v1/categories?select=id`
      const countResponse = await fetch(countUrl, {
        method: 'GET',
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${config.anonKey}`,
          'Accept': 'application/json',
          'Prefer': 'count=exact'
        },
        mode: 'cors',
        credentials: 'omit'
      })

      let categoryCount = 0
      if (countResponse.ok) {
        const contentRange = countResponse.headers.get('content-range')
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)$/)
          if (match) categoryCount = parseInt(match[1], 10)
        }
      }

      return { success: true, categoryCount }
    } catch (error) {
      devError('[SupabaseService] Connection test failed:', error)

      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return { success: false, error: 'Nettverksfeil - sjekk internettforbindelse og Supabase URL' }
      }

      return { success: false, error: error instanceof Error ? error.message : 'Ukjent feil' }
    }
  }

  // =====================================================
  // Category Fetching
  // =====================================================

  /**
   * Fetch all POI categories from Supabase
   * Cached for 5 minutes
   */
  async getCategories(): Promise<SupabaseCategory[]> {
    if (!this.isEnabled()) {
      return []
    }

    // Check cache
    if (this.categoryCache && !this.isCacheStale(this.categoryCache.timestamp)) {
      devLog('[SupabaseService] Category cache hit')
      return this.categoryCache.categories
    }

    // Return existing loading promise if in progress
    if (this.categoryLoading) {
      return this.categoryLoading
    }

    const config = this.getConfig()
    if (!config) return []

    devLog('[SupabaseService] Fetching categories from Supabase')

    this.categoryLoading = fetch(
      `${config.projectUrl}/rest/v1/categories?select=id,name,slug,description,icon,color,min_zoom,sort_order&order=sort_order.asc`,
      {
        method: 'GET',
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${config.anonKey}`,
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      }
    )
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.status}`)
        }
        return response.json()
      })
      .then((data: any[]) => {
        const categories: SupabaseCategory[] = data.map(row => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description || undefined,
          icon: row.icon || 'location_on',
          minZoom: row.min_zoom ?? 10,
          sortOrder: row.sort_order ?? 0
        }))

        // Cache results
        this.categoryCache = {
          categories,
          timestamp: Date.now()
        }

        devLog(`[SupabaseService] Fetched ${categories.length} categories`)
        this.categoryLoading = null
        return categories
      })
      .catch(error => {
        devError('[SupabaseService] Failed to fetch categories:', error)
        this.categoryLoading = null
        return []
      })

    return this.categoryLoading
  }

  // =====================================================
  // POI Fetching
  // =====================================================

  /**
   * Generate cache key for POI queries
   */
  private getCacheKey(categorySlug: string | undefined, bounds: BoundsRect, zoom: number): string {
    const cat = categorySlug || 'all'
    const n = bounds.north.toFixed(4)
    const s = bounds.south.toFixed(4)
    const e = bounds.east.toFixed(4)
    const w = bounds.west.toFixed(4)
    const z = Math.floor(zoom)
    return `supabase-${cat}-${n},${s},${e},${w}-z${z}`
  }

  /**
   * Check if cache entry is stale
   */
  private isCacheStale(timestamp: number): boolean {
    return Date.now() - timestamp > CACHE_TTL
  }

  /**
   * Fetch POIs from Supabase within viewport bounds
   * Optionally filtered by category slug
   */
  async getPOIs(
    bounds: BoundsRect,
    zoom: number,
    categorySlug?: string
  ): Promise<SupabasePOI[]> {
    if (!this.isEnabled()) {
      return []
    }

    const cacheKey = this.getCacheKey(categorySlug, bounds, zoom)

    // Check cache
    if (this.poiCache.has(cacheKey)) {
      const cached = this.poiCache.get(cacheKey)!
      if (!this.isCacheStale(cached.timestamp)) {
        devLog(`[SupabaseService] POI cache hit: ${cacheKey}`)
        return cached.pois
      }
      this.poiCache.delete(cacheKey)
    }

    // Return existing loading promise
    if (this.loading.has(cacheKey)) {
      return this.loading.get(cacheKey)!
    }

    const config = this.getConfig()
    if (!config) return []

    devLog(`[SupabaseService] Fetching POIs: ${cacheKey}`)

    // Build query URL with PostgREST filters
    // Use !inner join to filter by category slug
    let url = `${config.projectUrl}/rest/v1/pois?select=id,category_id,name,description,municipality,place,external_url,image_url,tags,longitude,latitude,categories!inner(slug,icon)`

    // Add bounding box filter
    url += `&longitude=gte.${bounds.west}&longitude=lte.${bounds.east}`
    url += `&latitude=gte.${bounds.south}&latitude=lte.${bounds.north}`

    // Add category filter if specified
    if (categorySlug) {
      url += `&categories.slug=eq.${categorySlug}`
    }

    devLog(`[SupabaseService] Fetching POIs from URL: ${url}`)

    const fetchPromise = fetch(url, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'omit'
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch POIs: ${response.status}`)
        }
        return response.json()
      })
      .then((data: any[]) => {
        const pois: SupabasePOI[] = data.map(row => ({
          id: `supabase-${row.id}`,
          type: 'supabase' as const,
          categoryId: row.category_id,
          categorySlug: row.categories?.slug || 'unknown',
          name: row.name,
          description: row.description || undefined,
          municipality: row.municipality || undefined,
          place: row.place || undefined,
          externalUrl: row.external_url || undefined,
          imageUrl: row.image_url || undefined,
          tags: row.tags || undefined,
          coordinates: [row.longitude, row.latitude] as [number, number]
        }))

        // Cache results
        this.poiCache.set(cacheKey, {
          pois,
          bounds,
          zoom,
          timestamp: Date.now()
        })

        devLog(`[SupabaseService] Fetched ${pois.length} POIs`)
        this.loading.delete(cacheKey)
        return pois
      })
      .catch(error => {
        devError(`[SupabaseService] Failed to fetch POIs:`, error)
        this.loading.delete(cacheKey)
        throw error
      })

    this.loading.set(cacheKey, fetchPromise)
    return fetchPromise
  }

  // =====================================================
  // Cache Management
  // =====================================================

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.categoryCache = null
    this.poiCache.clear()
    this.loading.clear()
    this.categoryLoading = null
    devLog('[SupabaseService] Cache cleared')
  }

  /**
   * Clear stale cache entries
   */
  clearStaleCache(): void {
    // Clear category cache if stale
    if (this.categoryCache && this.isCacheStale(this.categoryCache.timestamp)) {
      this.categoryCache = null
    }

    // Clear stale POI cache entries
    for (const [key, entry] of this.poiCache.entries()) {
      if (this.isCacheStale(entry.timestamp)) {
        this.poiCache.delete(key)
      }
    }
  }

  /**
   * Fetch POIs by source_category (for built-in category integration)
   * Returns Supabase POIs that have source_category set to a built-in category
   */
  async getPOIsBySourceCategory(
    bounds: BoundsRect,
    zoom: number,
    sourceCategory: string
  ): Promise<SupabasePOI[]> {
    if (!this.isEnabled()) {
      return []
    }

    const cacheKey = `supabase-source-${sourceCategory}-${bounds.north.toFixed(4)},${bounds.south.toFixed(4)},${bounds.east.toFixed(4)},${bounds.west.toFixed(4)}-z${Math.floor(zoom)}`

    // Check cache
    if (this.poiCache.has(cacheKey)) {
      const cached = this.poiCache.get(cacheKey)!
      if (!this.isCacheStale(cached.timestamp)) {
        devLog(`[SupabaseService] Source category POI cache hit: ${cacheKey}`)
        return cached.pois
      }
      this.poiCache.delete(cacheKey)
    }

    // Return existing loading promise
    if (this.loading.has(cacheKey)) {
      return this.loading.get(cacheKey)!
    }

    const config = this.getConfig()
    if (!config) return []

    devLog(`[SupabaseService] Fetching POIs by source_category: ${sourceCategory}`)

    // Build query URL - filter by source_category column
    let url = `${config.projectUrl}/rest/v1/pois?select=id,category_id,name,description,municipality,place,external_url,image_url,tags,longitude,latitude,source_category,categories(slug,icon)`

    // Add bounding box filter
    url += `&longitude=gte.${bounds.west}&longitude=lte.${bounds.east}`
    url += `&latitude=gte.${bounds.south}&latitude=lte.${bounds.north}`

    // Filter by source_category
    url += `&source_category=eq.${sourceCategory}`

    const fetchPromise = fetch(url, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'omit'
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch POIs by source_category: ${response.status}`)
        }
        return response.json()
      })
      .then((data: any[]) => {
        const pois: SupabasePOI[] = data.map(row => ({
          id: `supabase-${row.id}`,
          type: 'supabase' as const,
          categoryId: row.category_id,
          categorySlug: row.categories?.slug || 'unknown',
          name: row.name,
          description: row.description || undefined,
          municipality: row.municipality || undefined,
          place: row.place || undefined,
          externalUrl: row.external_url || undefined,
          imageUrl: row.image_url || undefined,
          tags: row.tags || undefined,
          coordinates: [row.longitude, row.latitude] as [number, number]
        }))

        // Cache results
        this.poiCache.set(cacheKey, {
          pois,
          bounds,
          zoom,
          timestamp: Date.now()
        })

        devLog(`[SupabaseService] Fetched ${pois.length} POIs with source_category=${sourceCategory}`)
        this.loading.delete(cacheKey)
        return pois
      })
      .catch(error => {
        devError(`[SupabaseService] Failed to fetch POIs by source_category:`, error)
        this.loading.delete(cacheKey)
        return [] // Return empty array instead of throwing for source_category queries
      })

    this.loading.set(cacheKey, fetchPromise)
    return fetchPromise
  }

  /**
   * Get cached POI count for a category
   */
  getCachedCount(categorySlug: string): number {
    let total = 0
    const seenIds = new Set<string>()

    for (const [key, entry] of this.poiCache.entries()) {
      if (key.includes(`supabase-${categorySlug}-`) || key.includes('supabase-all-')) {
        entry.pois.forEach(poi => {
          if (poi.categorySlug === categorySlug && !seenIds.has(poi.id)) {
            seenIds.add(poi.id)
            total++
          }
        })
      }
    }

    return total
  }

  // =====================================================
  // Admin CRUD Operations (Requires Auth)
  // =====================================================

  /**
   * Create a new POI
   * Requires authenticated admin session
   */
  async createPOI(
    poi: {
      name: string
      categoryId: string
      coordinates: [number, number]  // [lon, lat]
      description?: string
      municipality?: string
      place?: string
      externalUrl?: string
      imageUrl?: string
      tags?: Record<string, string>
      sourceCategory?: string  // For adding to built-in categories
    },
    accessToken: string
  ): Promise<{ success: boolean; error?: string; poi?: SupabasePOI }> {
    const config = this.getConfig()
    if (!config) {
      return { success: false, error: 'Supabase ikke konfigurert' }
    }

    try {
      const response = await fetch(`${config.projectUrl}/rest/v1/pois`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.anonKey,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: poi.name,
          category_id: poi.categoryId,
          longitude: poi.coordinates[0],
          latitude: poi.coordinates[1],
          description: poi.description || null,
          municipality: poi.municipality || null,
          place: poi.place || null,
          external_url: poi.externalUrl || null,
          image_url: poi.imageUrl || null,
          tags: poi.tags || null,
          source_category: poi.sourceCategory || null
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Ikke autorisert. Logg inn som admin.' }
        }
        return { success: false, error: error.message || `Feil ${response.status}` }
      }

      const [data] = await response.json()

      // Clear cache to force refresh
      this.clearCache()

      const newPoi: SupabasePOI = {
        id: `supabase-${data.id}`,
        type: 'supabase',
        categoryId: data.category_id,
        categorySlug: 'unknown',  // Will be populated on next fetch
        name: data.name,
        description: data.description || undefined,
        municipality: data.municipality || undefined,
        place: data.place || undefined,
        externalUrl: data.external_url || undefined,
        imageUrl: data.image_url || undefined,
        tags: data.tags || undefined,
        coordinates: [data.longitude, data.latitude]
      }

      devLog('[SupabaseService] POI created:', newPoi.name)
      return { success: true, poi: newPoi }

    } catch (error) {
      devError('[SupabaseService] Failed to create POI:', error)
      return { success: false, error: 'Nettverksfeil ved oppretting av POI' }
    }
  }

  /**
   * Update an existing POI
   */
  async updatePOI(
    id: string,  // Raw UUID without 'supabase-' prefix
    updates: {
      name?: string
      categoryId?: string
      coordinates?: [number, number]
      description?: string
      municipality?: string
      place?: string
      externalUrl?: string
      imageUrl?: string
      tags?: Record<string, string>
      sourceCategory?: string
    },
    accessToken: string
  ): Promise<{ success: boolean; error?: string }> {
    const config = this.getConfig()
    if (!config) {
      return { success: false, error: 'Supabase ikke konfigurert' }
    }

    try {
      const body: Record<string, unknown> = {}
      if (updates.name !== undefined) body.name = updates.name
      if (updates.categoryId !== undefined) body.category_id = updates.categoryId
      if (updates.coordinates !== undefined) {
        body.longitude = updates.coordinates[0]
        body.latitude = updates.coordinates[1]
      }
      if (updates.description !== undefined) body.description = updates.description || null
      if (updates.municipality !== undefined) body.municipality = updates.municipality || null
      if (updates.place !== undefined) body.place = updates.place || null
      if (updates.externalUrl !== undefined) body.external_url = updates.externalUrl || null
      if (updates.imageUrl !== undefined) body.image_url = updates.imageUrl || null
      if (updates.tags !== undefined) body.tags = updates.tags || null
      if (updates.sourceCategory !== undefined) body.source_category = updates.sourceCategory || null

      const response = await fetch(`${config.projectUrl}/rest/v1/pois?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.anonKey,
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Ikke autorisert' }
        }
        return { success: false, error: error.message || `Feil ${response.status}` }
      }

      // Clear cache
      this.clearCache()

      devLog('[SupabaseService] POI updated:', id)
      return { success: true }

    } catch (error) {
      devError('[SupabaseService] Failed to update POI:', error)
      return { success: false, error: 'Nettverksfeil ved oppdatering' }
    }
  }

  /**
   * Delete a POI
   */
  async deletePOI(
    id: string,  // Raw UUID without 'supabase-' prefix
    accessToken: string
  ): Promise<{ success: boolean; error?: string }> {
    const config = this.getConfig()
    if (!config) {
      return { success: false, error: 'Supabase ikke konfigurert' }
    }

    try {
      const response = await fetch(`${config.projectUrl}/rest/v1/pois?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Ikke autorisert' }
        }
        return { success: false, error: error.message || `Feil ${response.status}` }
      }

      // Clear cache
      this.clearCache()

      devLog('[SupabaseService] POI deleted:', id)
      return { success: true }

    } catch (error) {
      devError('[SupabaseService] Failed to delete POI:', error)
      return { success: false, error: 'Nettverksfeil ved sletting' }
    }
  }

  // =====================================================
  // Category CRUD Operations (Admin Only)
  // =====================================================

  /**
   * Create a new category
   */
  async createCategory(
    category: {
      name: string
      slug: string
      description?: string
      icon: string
      color?: string
      minZoom?: number
      sortOrder?: number
    },
    accessToken: string
  ): Promise<{ success: boolean; error?: string; category?: SupabaseCategory }> {
    const config = this.getConfig()
    if (!config) {
      return { success: false, error: 'Supabase ikke konfigurert' }
    }

    try {
      const response = await fetch(`${config.projectUrl}/rest/v1/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.anonKey,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: category.name,
          slug: category.slug,
          description: category.description || null,
          icon: category.icon,
          color: category.color || '#22c55e',
          min_zoom: category.minZoom ?? 10,
          sort_order: category.sortOrder ?? 0
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Ikke autorisert' }
        }
        if (response.status === 409 || error.code === '23505') {
          return { success: false, error: 'Kategori med dette navnet eller slug finnes allerede' }
        }
        return { success: false, error: error.message || `Feil ${response.status}` }
      }

      const [data] = await response.json()

      // Clear category cache
      this.categoryCache = null

      const newCategory: SupabaseCategory = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
        icon: data.icon,
        color: data.color || undefined,
        minZoom: data.min_zoom ?? 10,
        sortOrder: data.sort_order ?? 0
      }

      devLog('[SupabaseService] Category created:', newCategory.name)
      return { success: true, category: newCategory }

    } catch (error) {
      devError('[SupabaseService] Failed to create category:', error)
      return { success: false, error: 'Nettverksfeil ved oppretting av kategori' }
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    id: string,
    updates: {
      name?: string
      slug?: string
      description?: string
      icon?: string
      color?: string
      minZoom?: number
      sortOrder?: number
    },
    accessToken: string
  ): Promise<{ success: boolean; error?: string }> {
    const config = this.getConfig()
    if (!config) {
      return { success: false, error: 'Supabase ikke konfigurert' }
    }

    try {
      const body: Record<string, unknown> = {}
      if (updates.name !== undefined) body.name = updates.name
      if (updates.slug !== undefined) body.slug = updates.slug
      if (updates.description !== undefined) body.description = updates.description || null
      if (updates.icon !== undefined) body.icon = updates.icon
      if (updates.color !== undefined) body.color = updates.color
      if (updates.minZoom !== undefined) body.min_zoom = updates.minZoom
      if (updates.sortOrder !== undefined) body.sort_order = updates.sortOrder

      const response = await fetch(`${config.projectUrl}/rest/v1/categories?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.anonKey,
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Ikke autorisert' }
        }
        return { success: false, error: error.message || `Feil ${response.status}` }
      }

      // Clear category cache
      this.categoryCache = null

      devLog('[SupabaseService] Category updated:', id)
      return { success: true }

    } catch (error) {
      devError('[SupabaseService] Failed to update category:', error)
      return { success: false, error: 'Nettverksfeil ved oppdatering' }
    }
  }

  /**
   * Delete a category (also deletes all POIs in that category)
   */
  async deleteCategory(
    id: string,
    accessToken: string
  ): Promise<{ success: boolean; error?: string }> {
    const config = this.getConfig()
    if (!config) {
      return { success: false, error: 'Supabase ikke konfigurert' }
    }

    try {
      const response = await fetch(`${config.projectUrl}/rest/v1/categories?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Ikke autorisert' }
        }
        return { success: false, error: error.message || `Feil ${response.status}` }
      }

      // Clear all caches
      this.clearCache()

      devLog('[SupabaseService] Category deleted:', id)
      return { success: true }

    } catch (error) {
      devError('[SupabaseService] Failed to delete category:', error)
      return { success: false, error: 'Nettverksfeil ved sletting' }
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService()
