import { useEffect, useState, useRef, useCallback } from 'react'
import type { LngLatBounds } from 'maplibre-gl'
import { poiService, type POI, type POICategory } from '../services/poiService'

interface BoundsRect {
  north: number
  south: number
  east: number
  west: number
}

interface UseViewportPOIsOptions {
  map: maplibregl.Map | null
  activeCategories: Set<POICategory>
  debounceDelay?: number // Default: 300ms
  bufferFactor?: number // Default: 1.2 (20% padding around viewport)
  minZoom?: number // Default: 10 (only show POIs at zoom > minZoom)
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
  debounceDelay = 300,
  bufferFactor = 1.2,
  minZoom = 10
}: UseViewportPOIsOptions): UseViewportPOIsReturn => {
  const [visiblePOIs, setVisiblePOIs] = useState<Map<POICategory, POI[]>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(true)
  const debounceTimeoutRef = useRef<number | undefined>(undefined)
  const previousBoundsRef = useRef<BoundsRect | null>(null)
  const previousZoomRef = useRef<number>(0)

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

    try {
      const newVisiblePOIs = new Map<POICategory, POI[]>()

      // Fetch POIs for each active category in parallel
      const fetchPromises = Array.from(activeCategories).map(async (category) => {
        try {
          const pois = await poiService.getPOIs(category, bounds, zoom)
          return { category, pois }
        } catch (err) {
          console.error(`Failed to fetch POIs for category ${category}:`, err)
          return { category, pois: [] }
        }
      })

      const results = await Promise.all(fetchPromises)

      results.forEach(({ category, pois }) => {
        newVisiblePOIs.set(category, pois)
      })

      if (mountedRef.current) {
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
    console.log('[useViewportPOIs] Active categories changed, fetching...', Array.from(activeCategories))
    fetchPOIsForViewport()
  }, [activeCategories]) // Only depend on activeCategories, not the function

  return {
    visiblePOIs,
    isLoading,
    error,
    forceRefresh
  }
}
