import { useEffect, useState, useRef, useCallback } from 'react'
import type { LngLatBounds } from 'maplibre-gl'
import { poiService, type POI, type POICategory } from '../services/poiService'
import { UI_DELAYS, VIEWPORT } from '../config/timings'

interface BoundsRect {
  north: number
  south: number
  east: number
  west: number
}

interface UseViewportPOIsOptions {
  map: maplibregl.Map | null
  activeCategories: Set<POICategory>
  debounceDelay?: number
  bufferFactor?: number
  minZoom?: number
}

interface UseViewportPOIsReturn {
  visiblePOIs: Map<POICategory, POI[]>
  isLoading: boolean
  error: string | null
  forceRefresh: () => void
}

/**
 * Custom hook to manage viewport-based POI loading with lazy loading.
 * Only fetches POIs visible in the current map viewport, with debouncing
 * to avoid excessive API calls during pan/zoom operations.
 */
export const useViewportPOIs = ({
  map,
  activeCategories,
  debounceDelay = UI_DELAYS.POI_DEBOUNCE,
  bufferFactor = VIEWPORT.POI_BUFFER_FACTOR,
  minZoom = VIEWPORT.POI_MIN_ZOOM
}: UseViewportPOIsOptions): UseViewportPOIsReturn => {
  const [visiblePOIs, setVisiblePOIs] = useState<Map<POICategory, POI[]>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(true)
  const debounceTimeoutRef = useRef<number | undefined>(undefined)
  const previousBoundsRef = useRef<BoundsRect | null>(null)
  const previousZoomRef = useRef<number>(0)
  const isFetchingRef = useRef<boolean>(false)
  const latestPOIsRef = useRef<Map<POICategory, POI[]>>(new Map())

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
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
      console.log('[useViewportPOIs] Map not initialized yet')
      return
    }

    const zoom = map.getZoom()
    console.log(`[useViewportPOIs] Current zoom: ${zoom}, minZoom: ${minZoom}, active categories:`, Array.from(activeCategories))

    // Don't show POIs below minimum zoom level
    if (zoom < minZoom) {
      console.log(`[useViewportPOIs] Zoom ${zoom} < minZoom ${minZoom}, hiding POIs`)
      setVisiblePOIs(new Map())
      return
    }

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
      console.log('[useViewportPOIs] Skipping fetch - request already in progress')
      return
    }

    previousBoundsRef.current = bounds
    previousZoomRef.current = zoom

    if (activeCategories.size === 0) {
      console.log('[useViewportPOIs] No active categories')
      setVisiblePOIs(new Map())
      return
    }

    console.log(`[useViewportPOIs] Fetching POIs for bounds:`, bounds)
    setIsLoading(true)
    setError(null)
    isFetchingRef.current = true

    try {
      const newVisiblePOIs = new Map<POICategory, POI[]>()

      // Fetch POIs for each active category in parallel
      const fetchPromises = Array.from(activeCategories).map(async (category) => {
        try {
          const pois = await poiService.getPOIs(category, bounds, zoom)
          return { category, pois, error: null }
        } catch (err) {
          console.error(`Failed to fetch POIs for category ${category}:`, err)
          // Preserve cached POIs on error (e.g., 429 rate limiting) instead of clearing
          const cachedPOIs = latestPOIsRef.current.get(category) || []
          return { category, pois: cachedPOIs, error: err }
        }
      })

      const results = await Promise.all(fetchPromises)

      results.forEach(({ category, pois }) => {
        newVisiblePOIs.set(category, pois)
      })

      if (mountedRef.current) {
        latestPOIsRef.current = newVisiblePOIs
        setVisiblePOIs(newVisiblePOIs)
        setIsLoading(false)
        console.log(`[useViewportPOIs] Updated visiblePOIs:`, newVisiblePOIs)
      }
    } catch (err) {
      console.error('Failed to fetch viewport POIs:', err)
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
    console.log('[useViewportPOIs] Active categories changed, fetching...', Array.from(activeCategories))

    // Use immediate fetch to avoid stale closure issues
    const fetchImmediate = async () => {
      const zoom = map.getZoom()

      if (zoom < minZoom) {
        setVisiblePOIs(new Map())
        return
      }

      const bounds = getBoundsWithBuffer(map.getBounds())
      previousBoundsRef.current = bounds
      previousZoomRef.current = zoom

      if (activeCategories.size === 0) {
        setVisiblePOIs(new Map())
        return
      }

      setIsLoading(true)
      setError(null)
      isFetchingRef.current = true

      try {
        const newVisiblePOIs = new Map<POICategory, POI[]>()

        const fetchPromises = Array.from(activeCategories).map(async (category) => {
          try {
            const pois = await poiService.getPOIs(category, bounds, zoom)
            return { category, pois, error: null }
          } catch (err) {
            console.error(`Failed to fetch POIs for category ${category}:`, err)
            // Preserve cached POIs on error (e.g., 429 rate limiting) instead of clearing
            const cachedPOIs = latestPOIsRef.current.get(category) || []
            return { category, pois: cachedPOIs, error: err }
          }
        })

        const results = await Promise.all(fetchPromises)

        results.forEach(({ category, pois }) => {
          newVisiblePOIs.set(category, pois)
        })

        if (mountedRef.current) {
          latestPOIsRef.current = newVisiblePOIs
          setVisiblePOIs(newVisiblePOIs)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Failed to fetch viewport POIs:', err)
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load POIs')
          setIsLoading(false)
        }
      } finally {
        isFetchingRef.current = false
      }
    }

    fetchImmediate()
  }, [activeCategories, map, minZoom, getBoundsWithBuffer])

  return {
    visiblePOIs,
    isLoading,
    error,
    forceRefresh
  }
}
