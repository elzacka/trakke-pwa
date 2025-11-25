import { useEffect, useState, useRef, useCallback } from 'react'
import type { LngLatBounds } from 'maplibre-gl'
import { poiService, type POI, type POICategory, type AnyCategoryId, type SupabasePOI } from '../services/poiService'
import { supabaseService } from '../services/supabaseService'
import { UI_DELAYS, VIEWPORT } from '../config/timings'
import { devLog, devError } from '../constants'

interface BoundsRect {
  north: number
  south: number
  east: number
  west: number
}

interface UseViewportPOIsOptions {
  map: maplibregl.Map | null
  activeCategories: Set<AnyCategoryId>
  debounceDelay?: number
  bufferFactor?: number
  minZoom?: number
}

interface UseViewportPOIsReturn {
  visiblePOIs: Map<AnyCategoryId, POI[]>
  isLoading: boolean
  error: string | null
  forceRefresh: () => void
}

/**
 * Check if a category ID is a Supabase category
 */
const isSupabaseCategory = (categoryId: AnyCategoryId): categoryId is `supabase:${string}` => {
  return typeof categoryId === 'string' && categoryId.startsWith('supabase:')
}

/**
 * Extract the slug from a Supabase category ID
 */
const getSupabaseSlug = (categoryId: `supabase:${string}`): string => {
  return categoryId.slice('supabase:'.length)
}

/**
 * Custom hook to manage viewport-based POI loading with lazy loading.
 * Only fetches POIs visible in the current map viewport, with debouncing
 * to avoid excessive API calls during pan/zoom operations.
 *
 * Supports both built-in POI categories and Supabase categories (supabase:slug format).
 */
export const useViewportPOIs = ({
  map,
  activeCategories,
  debounceDelay = UI_DELAYS.POI_DEBOUNCE,
  bufferFactor = VIEWPORT.POI_BUFFER_FACTOR,
  minZoom = VIEWPORT.POI_MIN_ZOOM
}: UseViewportPOIsOptions): UseViewportPOIsReturn => {
  const [visiblePOIs, setVisiblePOIs] = useState<Map<AnyCategoryId, POI[]>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(true)
  const debounceTimeoutRef = useRef<number | undefined>(undefined)
  const previousBoundsRef = useRef<BoundsRect | null>(null)
  const previousZoomRef = useRef<number>(0)
  const isFetchingRef = useRef<boolean>(false)
  const latestPOIsRef = useRef<Map<AnyCategoryId, POI[]>>(new Map())

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      isFetchingRef.current = false
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  // Convert LngLatBounds to BoundsRect with buffer
  const getBoundsWithBuffer = useCallback((bounds: LngLatBounds): BoundsRect => {
    const latDiff = bounds.getNorth() - bounds.getSouth()
    const lngDiff = bounds.getEast() - bounds.getWest()

    const latBuffer = (latDiff * (bufferFactor - 1)) / 2
    const lngBuffer = (lngDiff * (bufferFactor - 1)) / 2

    return {
      north: bounds.getNorth() + latBuffer,
      south: bounds.getSouth() - latBuffer,
      east: bounds.getEast() + lngBuffer,
      west: bounds.getWest() - lngBuffer
    }
  }, [bufferFactor])

  // Check if bounds have changed significantly (avoid redundant fetches)
  const boundsChanged = useCallback((newBounds: BoundsRect, oldBounds: BoundsRect | null): boolean => {
    if (!oldBounds) return true

    // Consider bounds unchanged if they overlap by >70%
    const latDiff = Math.abs(newBounds.north - oldBounds.north)
    const lngDiff = Math.abs(newBounds.east - oldBounds.east)
    const latRange = newBounds.north - newBounds.south
    const lngRange = newBounds.east - newBounds.west

    return latDiff > latRange * 0.3 || lngDiff > lngRange * 0.3
  }, [])

  // Fetch POIs for all active categories in the current viewport
  const fetchPOIsForViewport = useCallback(async () => {
    if (!map) {
      devLog('[useViewportPOIs] Map not initialized yet')
      return
    }

    const zoom = map.getZoom()
    devLog(`[useViewportPOIs] Current zoom: ${zoom}, global minZoom: ${minZoom}, active categories:`, Array.from(activeCategories))

    // Separate built-in and Supabase categories
    const builtInCategories: POICategory[] = []
    const supabaseCategories: `supabase:${string}`[] = []

    activeCategories.forEach(category => {
      if (isSupabaseCategory(category)) {
        supabaseCategories.push(category)
      } else {
        builtInCategories.push(category)
      }
    })

    // Filter built-in categories by their individual minimum zoom levels
    const builtInCategoriesAtThisZoom = builtInCategories.filter(category => {
      const config = poiService.getCategoryConfig(category)
      const isVisible = zoom >= config.minZoom
      if (category === 'kulturminner') {
        devLog(`[useViewportPOIs] Kulturminner zoom check: zoom=${zoom}, minZoom=${config.minZoom}, visible=${isVisible}`)
      }
      return isVisible
    })

    devLog(`[useViewportPOIs] Built-in categories visible at zoom ${zoom}:`, builtInCategoriesAtThisZoom)
    devLog(`[useViewportPOIs] Supabase categories active:`, supabaseCategories)

    const bounds = getBoundsWithBuffer(map.getBounds())

    // Skip if bounds haven't changed significantly
    if (
      !boundsChanged(bounds, previousBoundsRef.current) &&
      Math.abs(zoom - previousZoomRef.current) < 0.5
    ) {
      return
    }

    // Skip if a fetch is already in progress for similar viewport
    // This prevents redundant requests during rapid zoom/pan
    if (isFetchingRef.current) {
      devLog('[useViewportPOIs] Skipping fetch - request already in progress')
      return
    }

    previousBoundsRef.current = bounds
    previousZoomRef.current = zoom

    devLog(`[useViewportPOIs] Fetching POIs for bounds:`, bounds)
    setIsLoading(true)
    setError(null)
    isFetchingRef.current = true

    try {
      const newVisiblePOIs = new Map<AnyCategoryId, POI[]>()

      // Fetch built-in POIs for each category visible at this zoom level in parallel
      const builtInPromises = builtInCategoriesAtThisZoom.map(async (category) => {
        try {
          const pois = await poiService.getPOIs(category, bounds, zoom)
          return { category: category as AnyCategoryId, pois, error: null }
        } catch (err) {
          devError(`Failed to fetch POIs for category ${category}:`, err)
          // Preserve cached POIs on error (e.g., 429 rate limiting) instead of clearing
          const cachedPOIs = latestPOIsRef.current.get(category) || []
          return { category: category as AnyCategoryId, pois: cachedPOIs, error: err }
        }
      })

      // Fetch Supabase POIs for each active Supabase category
      const supabasePromises = supabaseCategories.map(async (categoryId) => {
        const slug = getSupabaseSlug(categoryId)
        devLog(`[useViewportPOIs] Fetching Supabase POIs for ${categoryId} (slug: ${slug})`)
        try {
          const supabasePOIs = await supabaseService.getPOIs(bounds, zoom, slug)
          devLog(`[useViewportPOIs] Got ${supabasePOIs.length} POIs for ${categoryId}`)
          // Convert SupabasePOI to POI format
          const pois: SupabasePOI[] = supabasePOIs.map(poi => ({
            ...poi,
            categorySlug: categoryId // Use full category ID (supabase:slug)
          }))
          return { category: categoryId as AnyCategoryId, pois, error: null }
        } catch (err) {
          devError(`Failed to fetch Supabase POIs for ${categoryId}:`, err)
          const cachedPOIs = latestPOIsRef.current.get(categoryId) || []
          return { category: categoryId as AnyCategoryId, pois: cachedPOIs, error: err }
        }
      })

      // Wait for all fetches to complete
      const results = await Promise.all([...builtInPromises, ...supabasePromises])

      // Set POIs for categories that were fetched
      results.forEach(({ category, pois }) => {
        newVisiblePOIs.set(category, pois)
      })

      // Ensure all active categories are in the map, even if empty (below minZoom)
      activeCategories.forEach(category => {
        if (!newVisiblePOIs.has(category)) {
          newVisiblePOIs.set(category, [])
        }
      })

      if (mountedRef.current) {
        latestPOIsRef.current = newVisiblePOIs
        setVisiblePOIs(newVisiblePOIs)
        setIsLoading(false)
        devLog(`[useViewportPOIs] Updated visiblePOIs:`, newVisiblePOIs)
      }
    } catch (err) {
      devError('Failed to fetch viewport POIs:', err)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load POIs')
        setIsLoading(false)
      }
    } finally {
      isFetchingRef.current = false
    }
  }, [map, activeCategories, minZoom, getBoundsWithBuffer, boundsChanged])

  // Debounced viewport change handler
  const handleViewportChange = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      fetchPOIsForViewport()
    }, debounceDelay)
  }, [fetchPOIsForViewport, debounceDelay])

  // Force refresh (useful for error recovery)
  const forceRefresh = useCallback(() => {
    previousBoundsRef.current = null
    previousZoomRef.current = 0
    fetchPOIsForViewport()
  }, [fetchPOIsForViewport])

  // Set up map event listeners
  useEffect(() => {
    if (!map) return

    // Initial load
    fetchPOIsForViewport()

    // Listen for viewport changes
    map.on('moveend', handleViewportChange)
    map.on('zoomend', handleViewportChange)

    return () => {
      if (map) {
        map.off('moveend', handleViewportChange)
        map.off('zoomend', handleViewportChange)
      }
    }
  }, [map, handleViewportChange, fetchPOIsForViewport])

  // Reload when active categories change
  useEffect(() => {
    if (!map) return
    devLog('[useViewportPOIs] Active categories changed, fetching...', Array.from(activeCategories))

    // Reset bounds to force fetch on category change
    previousBoundsRef.current = null
    fetchPOIsForViewport()
  }, [activeCategories, map, fetchPOIsForViewport])

  return {
    visiblePOIs,
    isLoading,
    error,
    forceRefresh
  }
}
