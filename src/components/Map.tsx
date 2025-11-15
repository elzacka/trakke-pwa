import { useEffect, useRef, useState } from 'react'
import maplibregl, { LngLatBounds } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import NavigationLocationControl from './NavigationLocationControl'
import SearchControl from './SearchControl'
import DownloadControl from './DownloadControl'
import InfoPanel from './InfoPanel'
import FABMenu from './FABMenu'
import SearchSheet from './SearchSheet'
import InfoSheet from './InfoSheet'
import DownloadSheet from './DownloadSheet'
import RouteSheet from './RouteSheet'
import SettingsSheet from './SettingsSheet'
import CategorySheet from './CategorySheet'
import POIDetailsSheet from './POIDetailsSheet'
import InstallSheet from './InstallSheet'
import { useAutoHide } from '../hooks/useAutoHide'
import { useViewportPOIs } from '../hooks/useViewportPOIs'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { MAP_CONFIG } from '../constants'
import type { SearchResult } from '../services/searchService'
import type { Route, Waypoint } from '../services/routeService'
import { routeService } from '../services/routeService'
import { poiService, type POICategory, type POI } from '../services/poiService'
import '../styles/Map.css'

interface MapProps {
  zenMode: boolean
}

// Utility function to validate and sanitize user input
function validateName(name: string | null, maxLength: number = 100): string | null {
  if (!name) return null
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    alert('Navn kan ikke være tomt')
    return null
  }
  if (trimmed.length > maxLength) {
    alert(`Navn kan ikke være lengre enn ${maxLength} tegn`)
    return null
  }
  // Sanitize HTML/script tags
  const sanitized = trimmed.replace(/<[^>]*>/g, '')
  if (sanitized !== trimmed) {
    alert('Ugyldige tegn i navn')
    return null
  }
  return sanitized
}

const Map = ({ zenMode }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const userMarker = useRef<maplibregl.Marker | null>(null)
  const searchMarker = useRef<maplibregl.Marker | null>(null)
  const searchMarkerLocation = useRef<[number, number] | null>(null)
  const navigationControl = useRef<NavigationLocationControl | null>(null)
  const [userLocation, setUserLocation] = useState<GeolocationPosition | null>(null)
  const [isSelectingArea, setIsSelectingArea] = useState(false)
  const [selectionBounds, setSelectionBounds] = useState<LngLatBounds | null>(null)
  const [currentZoom, setCurrentZoom] = useState(10)

  // Selection overlay state (pixel coordinates for draggable square)
  const [overlayRect, setOverlayRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState<string | null>(null) // 'nw' | 'ne' | 'sw' | 'se' | null

  // Detect mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  // Zen Mode UI state
  const [searchSheetOpen, setSearchSheetOpen] = useState(false)
  const [infoSheetOpen, setInfoSheetOpen] = useState(false)
  const [downloadSheetOpen, setDownloadSheetOpen] = useState(false)
  const [routeSheetOpen, setRouteSheetOpen] = useState(false)
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false)
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [poiDetailsSheetOpen, setPoiDetailsSheetOpen] = useState(false)
  const [installSheetOpen, setInstallSheetOpen] = useState(false)
  const [fabMenuOpen, setFabMenuOpen] = useState(false)

  // PWA Installation
  const { canInstall, isInstalled, platform, promptInstall } = useInstallPrompt()

  // POI/Category state
  const [activeCategories, setActiveCategories] = useState<Set<POICategory>>(new Set())
  // Track if POI layers have been added to map
  const poiLayersInitialized = useRef(false)
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null)

  // Use viewport-based POI loading hook
  const { visiblePOIs, isLoading: poisLoading } = useViewportPOIs({
    map: map.current,
    activeCategories,
    debounceDelay: 300,
    bufferFactor: 1.2,
    minZoom: 10
  })

  // Route drawing state
  const [isDrawingRoute, setIsDrawingRoute] = useState(false)
  const [isPlacingWaypoint, setIsPlacingWaypoint] = useState(false)
  const [routePoints, setRoutePoints] = useState<Array<[number, number]>>([])
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [waypointMarkers, setWaypointMarkers] = useState<Record<string, maplibregl.Marker>>({})
  const [routesVisible, setRoutesVisible] = useState(true)

  const { visible: controlsVisible, show: showControls, hide: hideControls } = useAutoHide({
    delay: 5000,
    initialVisible: true // Show initially for discoverability
  })

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    // Initialize map with Kartverket WMTS topographic layer
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'kartverket-topo': {
            type: 'raster',
            tiles: [
              'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png'
            ],
            tileSize: 256,
            attribution: zenMode ? '' : '© Kartverket'
          }
        },
        layers: [
          {
            id: 'kartverket-topo-layer',
            type: 'raster',
            source: 'kartverket-topo',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      },
      center: MAP_CONFIG.DEFAULT_CENTER,
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
      pitch: MAP_CONFIG.DEFAULT_PITCH,
      maxZoom: MAP_CONFIG.MAX_ZOOM,
      minZoom: MAP_CONFIG.MIN_ZOOM,
      maxPitch: 85, // Allow full tilt
      attributionControl: zenMode ? false : undefined // Hide default attribution in Zen Mode
    })

    // Add navigation controls (hidden in Zen Mode, shown on interaction)
    if (!zenMode) {
      // Classic mode: always visible controls
      map.current.addControl(
        new NavigationLocationControl({
          onLocationFound: (position) => setUserLocation(position),
          onLocationError: (error) => console.error('Geolocation error:', error),
          showCompass: true,
          visualizePitch: true
        }),
        'top-right'
      )

    } else {
      // Zen mode: no navigation controls (all functionality in FAB menu)
      // Add custom clickable attribution with info icon in bottom-left
      const attributionContainer = document.createElement('button')
      attributionContainer.className = 'custom-attribution'
      attributionContainer.setAttribute('aria-label', 'Toggle attribution')
      attributionContainer.innerHTML = `
        <span class="material-symbols-outlined attribution-icon">info</span>
        <span class="attribution-text">© Kartverket</span>
      `

      // Toggle between full and icon-only mode
      // Start in expanded mode (showing text)
      let isCompact = false
      const handleClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        isCompact = !isCompact
        if (isCompact) {
          attributionContainer.classList.add('attribution-compact')
        } else {
          attributionContainer.classList.remove('attribution-compact')
        }
      }
      attributionContainer.addEventListener('click', handleClick, true)
      attributionContainer.addEventListener('touchend', handleClick, true)

      // Create a custom control
      class CustomAttributionControl implements maplibregl.IControl {
        private _container: HTMLButtonElement

        constructor(container: HTMLButtonElement) {
          this._container = container
        }

        onAdd(): HTMLElement {
          return this._container
        }

        onRemove(): void {
          if (this._container.parentNode) {
            this._container.parentNode.removeChild(this._container)
          }
        }
      }

      map.current.addControl(new CustomAttributionControl(attributionContainer), 'bottom-left')
    }

    // Track zoom changes
    map.current.on('zoom', () => {
      if (map.current) {
        setCurrentZoom(Math.round(map.current.getZoom()))
      }
    })

    // Show controls on map interaction
    map.current.on('click', () => showControls())
    map.current.on('touchstart', () => showControls())
    map.current.on('mousedown', () => showControls())
    map.current.on('move', () => showControls()) // Show on pan/zoom

    // Note: Map click handler is registered in a separate useEffect to avoid closure issues

    // Bottom-edge swipe detection for revealing FAB
    let touchStartY = 0
    const handleBottomEdgeSwipe = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartY = touch.clientY
      const windowHeight = window.innerHeight

      // Only track if touch starts near bottom edge (bottom 50px)
      if (touchStartY > windowHeight - 50) {
        const handleTouchMove = (moveEvent: TouchEvent) => {
          const touchY = moveEvent.touches[0].clientY
          const swipeDistance = touchStartY - touchY

          // Swipe up from bottom edge
          if (swipeDistance > 30) {
            showControls()
            document.removeEventListener('touchmove', handleTouchMove)
          }
        }

        document.addEventListener('touchmove', handleTouchMove, { passive: true })
        document.addEventListener('touchend', () => {
          document.removeEventListener('touchmove', handleTouchMove)
        }, { once: true })
      }
    }

    document.addEventListener('touchstart', handleBottomEdgeSwipe, { passive: true })

    // Cleanup on unmount
    return () => {
      document.removeEventListener('touchstart', handleBottomEdgeSwipe)
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Handle URL actions from manifest shortcuts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')

    if (action === 'search') {
      setSearchSheetOpen(true)
    } else if (action === 'download') {
      setDownloadSheetOpen(true)
    }
  }, [])

  // Monitor map movement and remove search marker when out of view
  useEffect(() => {
    if (!map.current) return

    const checkSearchMarkerVisibility = () => {
      if (!searchMarkerLocation.current || !searchMarker.current || !map.current) return

      const bounds = map.current.getBounds()
      const [lon, lat] = searchMarkerLocation.current

      // Check if marker is within current viewport
      const isVisible =
        lon >= bounds.getWest() &&
        lon <= bounds.getEast() &&
        lat >= bounds.getSouth() &&
        lat <= bounds.getNorth()

      // Remove marker if not visible
      if (!isVisible) {
        searchMarker.current.remove()
        searchMarker.current = null
        searchMarkerLocation.current = null
      }
    }

    // Check on moveend (after panning/zooming completes)
    map.current.on('moveend', checkSearchMarkerVisibility)

    return () => {
      if (map.current) {
        map.current.off('moveend', checkSearchMarkerVisibility)
      }
    }
  }, [])

  // Keep FAB visible when any sheet is open
  useEffect(() => {
    const anySheetOpen = searchSheetOpen || infoSheetOpen || downloadSheetOpen || routeSheetOpen
    if (anySheetOpen) {
      showControls()
    }
  }, [searchSheetOpen, infoSheetOpen, downloadSheetOpen, routeSheetOpen, showControls])

  // Helper function to clean up drawing layers
  const cleanupDrawingLayers = () => {
    if (map.current) {
      // Remove line layer and source
      if (map.current.getLayer('drawing-route-line-layer')) {
        map.current.removeLayer('drawing-route-line-layer')
      }
      if (map.current.getSource('drawing-route-line')) {
        map.current.removeSource('drawing-route-line')
      }
      // Remove points layer and source
      if (map.current.getLayer('drawing-route-points-layer')) {
        map.current.removeLayer('drawing-route-points-layer')
      }
      if (map.current.getSource('drawing-route-points')) {
        map.current.removeSource('drawing-route-points')
      }
    }
  }

  // Comprehensive keyboard shortcuts handler
  useEffect(() => {
    // Skip keyboard shortcuts on mobile devices
    if (isMobile) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Ctrl+K: Open search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        setSearchSheetOpen(true)
        setFabMenuOpen(false)
        return
      }

      // Ctrl+B: Toggle FAB menu
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault()
        setFabMenuOpen(!fabMenuOpen)
        return
      }

      // Escape: Close sheets, cancel drawing modes, or close FAB menu
      if (e.key === 'Escape') {
        e.preventDefault()

        // Priority order: drawing modes > open sheets > FAB menu
        if (isDrawingRoute) {
          setIsDrawingRoute(false)
          setRoutePoints([])
          cleanupDrawingLayers()
        } else if (isPlacingWaypoint) {
          setIsPlacingWaypoint(false)
        } else if (searchSheetOpen) {
          setSearchSheetOpen(false)
        } else if (routeSheetOpen) {
          setRouteSheetOpen(false)
        } else if (downloadSheetOpen) {
          setDownloadSheetOpen(false)
        } else if (categorySheetOpen) {
          setCategorySheetOpen(false)
        } else if (settingsSheetOpen) {
          setSettingsSheetOpen(false)
        } else if (infoSheetOpen) {
          setInfoSheetOpen(false)
        } else if (poiDetailsSheetOpen) {
          setPoiDetailsSheetOpen(false)
        } else if (installSheetOpen) {
          setInstallSheetOpen(false)
        } else if (fabMenuOpen) {
          setFabMenuOpen(false)
        }
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMobile, isDrawingRoute, isPlacingWaypoint, searchSheetOpen, routeSheetOpen, downloadSheetOpen, categorySheetOpen, settingsSheetOpen, infoSheetOpen, poiDetailsSheetOpen, installSheetOpen, fabMenuOpen])

  // Toggle visibility of routes and waypoints
  useEffect(() => {
    if (!map.current) return

    // Toggle all route layers
    const style = map.current.getStyle()
    if (style && style.layers) {
      style.layers.forEach((layer) => {
        if (layer.id.startsWith('route-') && (layer.id.endsWith('-line-layer') || layer.id.endsWith('-points-layer'))) {
          map.current!.setLayoutProperty(
            layer.id,
            'visibility',
            routesVisible ? 'visible' : 'none'
          )
        }
      })
    }

    // Toggle waypoint markers
    Object.values(waypointMarkers).forEach((marker) => {
      const element = marker.getElement()
      if (element) {
        element.style.display = routesVisible ? 'block' : 'none'
      }
    })
  }, [routesVisible, waypointMarkers])

  // Initialize POI clustering layers (MapLibre native GeoJSON clustering for 60fps performance)
  useEffect(() => {
    if (!map.current || poiLayersInitialized.current) return

    const m = map.current

    const initializePOILayers = () => {
      if (!map.current || poiLayersInitialized.current) return

      console.log('[Map] Initializing POI clustering layers...')

      try {
        // Add empty GeoJSON source with clustering enabled
        map.current.addSource('pois', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          },
          cluster: true,
          clusterMaxZoom: 14, // Max zoom to cluster points
          clusterRadius: 50 // Radius of each cluster in pixels
        })

        // Cluster circles layer
        map.current.addLayer({
          id: 'poi-clusters',
          type: 'circle',
          source: 'pois',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#fbbf24', // Yellow for small clusters
              10,
              '#f59e0b', // Orange for medium
              30,
              '#d97706'  // Dark orange for large
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,  // 20px for small clusters
              10,
              30,  // 30px for medium
              30,
              40   // 40px for large
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#111827'
          }
        })

        // Cluster count labels
        map.current.addLayer({
          id: 'poi-cluster-count',
          type: 'symbol',
          source: 'pois',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#111827'
          }
        })

        // Unclustered points layer (individual shelter markers)
        map.current.addLayer({
          id: 'poi-unclustered',
          type: 'symbol',
          source: 'pois',
          filter: ['!', ['has', 'point_count']],
          layout: {
            'icon-image': 'shelter-icon', // Will be added as custom image
            'icon-size': 1,
            'icon-allow-overlap': true
          }
        })

        // Create custom shelter icon (T marker) as image
        const size = 24
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        // Draw yellow square with black border (using fillRect for compatibility)
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(2, 2, size - 4, size - 4)
        ctx.strokeStyle = '#111827'
        ctx.lineWidth = 2
        ctx.strokeRect(2, 2, size - 4, size - 4)

        // Draw T letter
        ctx.fillStyle = '#111827'
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('T', size / 2, size / 2)

        map.current.addImage('shelter-icon', {
          width: size,
          height: size,
          data: ctx.getImageData(0, 0, size, size).data
        })

        poiLayersInitialized.current = true
        console.log('[Map] POI clustering layers initialized successfully')
      } catch (error) {
        console.error('[Map] Failed to initialize POI clustering layers:', error)
      }
    }

    // Wait for map to be fully loaded
    if (!m.loaded()) {
      console.log('[Map] Waiting for map to load before initializing POI layers')
      m.once('load', () => {
        initializePOILayers()
      })
      return
    }

    initializePOILayers()
  }, [])

  // Update GeoJSON source with visible POIs (GPU-accelerated clustering)
  useEffect(() => {
    if (!map.current || !poiLayersInitialized.current) return

    // Convert visible POIs to GeoJSON features
    const features: any[] = []

    visiblePOIs.forEach((pois, category) => {
      if (activeCategories.has(category)) {
        pois.forEach(poi => {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: poi.coordinates
            },
            properties: {
              id: poi.id,
              category: category,
              name: poi.name,
              address: (poi as any).address || '',
              capacity: (poi as any).capacity || 0
            }
          })
        })
      }
    })

    const source = map.current.getSource('pois') as maplibregl.GeoJSONSource
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: features
      })
      console.log(`[Map] Updated POI source with ${features.length} features (clustering enabled)`)
    }
  }, [visiblePOIs, activeCategories])

  // Handle cluster clicks (zoom in) and unclustered point clicks (show details)
  useEffect(() => {
    if (!map.current || !poiLayersInitialized.current) return

    const m = map.current

    // Click on cluster -> zoom in
    const handleClusterClick = (e: any) => {
      const features = m.queryRenderedFeatures(e.point, {
        layers: ['poi-clusters']
      })
      if (!features.length) return

      const clusterId = features[0].properties.cluster_id
      const source = m.getSource('pois') as maplibregl.GeoJSONSource

      // @ts-ignore - getClusterExpansionZoom types are incorrect
      source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return
        m.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom: zoom
        })
      })
    }

    // Click on unclustered point -> show details
    const handlePointClick = (e: any) => {
      const features = m.queryRenderedFeatures(e.point, {
        layers: ['poi-unclustered']
      })
      if (!features.length) return

      const props = features[0].properties

      // Find the full POI object
      for (const [category, pois] of visiblePOIs.entries()) {
        const poi = pois.find(p => p.id === props.id)
        if (poi) {
          setSelectedPOI(poi)
          setPoiDetailsSheetOpen(true)
          break
        }
      }
    }

    // Change cursor on hover
    const handleMouseEnter = () => {
      m.getCanvas().style.cursor = 'pointer'
    }

    const handleMouseLeave = () => {
      m.getCanvas().style.cursor = ''
    }

    m.on('click', 'poi-clusters', handleClusterClick)
    m.on('click', 'poi-unclustered', handlePointClick)
    m.on('mouseenter', 'poi-clusters', handleMouseEnter)
    m.on('mouseleave', 'poi-clusters', handleMouseLeave)
    m.on('mouseenter', 'poi-unclustered', handleMouseEnter)
    m.on('mouseleave', 'poi-unclustered', handleMouseLeave)

    return () => {
      m.off('click', 'poi-clusters', handleClusterClick)
      m.off('click', 'poi-unclustered', handlePointClick)
      m.off('mouseenter', 'poi-clusters', handleMouseEnter)
      m.off('mouseleave', 'poi-clusters', handleMouseLeave)
      m.off('mouseenter', 'poi-unclustered', handleMouseEnter)
      m.off('mouseleave', 'poi-unclustered', handleMouseLeave)
    }
  }, [visiblePOIs, activeCategories])

  // Register map click handler with current state values (fixes closure issue)
  useEffect(() => {
    if (!map.current) return

    const clickHandler = (e: maplibregl.MapMouseEvent) => {
      handleMapClick(e)
    }

    map.current.on('click', clickHandler)

    return () => {
      if (map.current) {
        map.current.off('click', clickHandler)
      }
    }
  }, [isDrawingRoute, isPlacingWaypoint, isSelectingArea]) // Removed routePoints to reduce re-registrations

  // Handle map clicks when selecting area, drawing routes, or placing waypoints
  const handleMapClick = async (e: maplibregl.MapMouseEvent) => {
    // Ctrl+Click: Copy coordinates to clipboard (desktop only)
    if (!isMobile && e.originalEvent.ctrlKey) {
      const coords = `${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`
      try {
        await navigator.clipboard.writeText(coords)
        // Visual feedback
        const notification = document.createElement('div')
        notification.style.cssText = `
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: #111827;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          z-index: 10000;
          pointer-events: none;
          animation: fadeInOut 2s ease-in-out;
        `
        notification.textContent = `Koordinater kopiert: ${coords}`
        document.body.appendChild(notification)

        // Add fade animation
        const style = document.createElement('style')
        style.textContent = `
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, 10px); }
            15% { opacity: 1; transform: translate(-50%, 0); }
            85% { opacity: 1; transform: translate(-50%, 0); }
            100% { opacity: 0; transform: translate(-50%, -10px); }
          }
        `
        document.head.appendChild(style)

        setTimeout(() => {
          document.body.removeChild(notification)
          document.head.removeChild(style)
        }, 2000)
      } catch (error) {
        console.error('Failed to copy coordinates:', error)
        alert(`Koordinater: ${coords}`)
      }
      return
    }

    // Route drawing mode
    if (isDrawingRoute) {
      const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      const updatedPoints = [...routePoints, newPoint]
      setRoutePoints(updatedPoints)

      // Update route line and points on map
      if (map.current) {
        const lineSourceId = 'drawing-route-line'
        const pointsSourceId = 'drawing-route-points'
        const lineLayerId = 'drawing-route-line-layer'
        const pointsLayerId = 'drawing-route-points-layer'

        // Update or create line (only if 2+ points)
        if (updatedPoints.length >= 2) {
          if (map.current.getSource(lineSourceId)) {
            const source = map.current.getSource(lineSourceId) as maplibregl.GeoJSONSource
            source.setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: updatedPoints
              }
            })
          } else {
            map.current.addSource(lineSourceId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: updatedPoints
                }
              }
            })

            map.current.addLayer({
              id: lineLayerId,
              type: 'line',
              source: lineSourceId,
              paint: {
                'line-color': '#3e4533',
                'line-width': 4,
                'line-opacity': 0.8
              }
            })
          }
        }

        // Update or create points (works with 1+ points)
        const pointFeatures = updatedPoints.map(coord => ({
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'Point' as const,
            coordinates: coord
          }
        }))

        if (map.current.getSource(pointsSourceId)) {
          const source = map.current.getSource(pointsSourceId) as maplibregl.GeoJSONSource
          source.setData({
            type: 'FeatureCollection',
            features: pointFeatures
          })
        } else {
          map.current.addSource(pointsSourceId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: pointFeatures
            }
          })

          map.current.addLayer({
            id: pointsLayerId,
            type: 'circle',
            source: pointsSourceId,
            paint: {
              'circle-radius': 6,
              'circle-color': '#3e4533',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2
            }
          })
        }
      }
      return
    }

    // Waypoint placement mode
    if (isPlacingWaypoint) {
      const inputName = prompt('Navn på punkt:')
      const name = validateName(inputName)
      if (name) {
        try {
          const waypoint = await routeService.createWaypoint({
            name,
            coordinates: [e.lngLat.lng, e.lngLat.lat]
          })

          // Add marker to map
          const el = document.createElement('div')
          el.className = 'waypoint-marker'
          el.innerHTML = '<span class="material-symbols-outlined">location_on</span>'

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([e.lngLat.lng, e.lngLat.lat])
            .addTo(map.current!)

          // Track marker in state so it can be toggled and deleted
          setWaypointMarkers(prev => ({ ...prev, [waypoint.id]: marker }))

          setIsPlacingWaypoint(false)
          setRouteSheetOpen(true)
        } catch (error) {
          console.error('Failed to create waypoint:', error)
          alert('Kunne ikke lagre punkt')
        }
      } else {
        setIsPlacingWaypoint(false)
      }
      return
    }

    // Area selection mode - handled by overlay component
  }

  // Update user location marker when position changes
  useEffect(() => {
    if (!map.current || !userLocation) return

    const { latitude, longitude } = userLocation.coords

    if (userMarker.current) {
      // Update existing marker position
      userMarker.current.setLngLat([longitude, latitude])
    } else {
      // Create new marker - simple blue dot
      const el = document.createElement('div')
      el.className = 'user-location-marker'

      userMarker.current = new maplibregl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(map.current)
    }

    // Center map on user location
    map.current.flyTo({
      center: [longitude, latitude],
      zoom: 15,
      essential: true
    })
  }, [userLocation])

  // Load all existing waypoints when map initializes
  useEffect(() => {
    const loadExistingWaypoints = async () => {
      if (!map.current) return

      try {
        const waypoints = await routeService.getAllWaypoints()

        // Create markers for all waypoints
        const newMarkers: Record<string, maplibregl.Marker> = {}

        waypoints.forEach(waypoint => {
          const el = document.createElement('div')
          el.className = 'waypoint-marker'
          el.innerHTML = '<span class="material-symbols-outlined">location_on</span>'

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat(waypoint.coordinates)
            .addTo(map.current!)

          newMarkers[waypoint.id] = marker
        })

        setWaypointMarkers(newMarkers)
        console.log(`Loaded ${waypoints.length} existing waypoints`)
      } catch (error) {
        console.error('Failed to load existing waypoints:', error)
      }
    }

    // Only load once when map is ready
    if (map.current && map.current.loaded()) {
      loadExistingWaypoints()
    } else if (map.current) {
      map.current.once('load', loadExistingWaypoints)
    }
  }, []) // Empty deps - only run once on mount

  // Initialize centered selection overlay when area selection starts
  useEffect(() => {
    if (isSelectingArea && !overlayRect && mapContainer.current) {
      const container = mapContainer.current
      const containerWidth = container.offsetWidth
      const containerHeight = container.offsetHeight

      // Create a square that's 60% of the smaller dimension, centered
      const minDimension = Math.min(containerWidth, containerHeight)
      const size = Math.floor(minDimension * 0.6)

      const initialRect = {
        left: Math.floor((containerWidth - size) / 2),
        top: Math.floor((containerHeight - size) / 2),
        width: size,
        height: size
      }

      setOverlayRect(initialRect)

      // Calculate and set initial bounds
      if (map.current) {
        const nw = map.current.unproject([initialRect.left, initialRect.top])
        const se = map.current.unproject([initialRect.left + initialRect.width, initialRect.top + initialRect.height])
        const bounds = new LngLatBounds(nw, se)
        setSelectionBounds(bounds)
      }
    } else if (!isSelectingArea) {
      setOverlayRect(null)
    }
  }, [isSelectingArea, overlayRect])

  // Handle search result selection
  const handleSearchResult = (result: SearchResult) => {
    if (!map.current) return

    const [lon, lat] = result.coordinates

    // Remove existing search marker
    if (searchMarker.current) {
      searchMarker.current.remove()
    }

    // Create marker for search result
    const el = document.createElement('div')
    el.className = 'search-result-marker'
    el.innerHTML = '<span class="material-symbols-outlined">location_on</span>'

    searchMarker.current = new maplibregl.Marker({ element: el })
      .setLngLat([lon, lat])
      .addTo(map.current)

    // Store the marker location for visibility checking
    searchMarkerLocation.current = [lon, lat]

    // Fly to result location
    map.current.flyTo({
      center: [lon, lat],
      zoom: result.type === 'address' ? 16 : 13,
      essential: true
    })
  }

  // Handle download area selection
  const handleStartSelection = () => {
    setIsSelectingArea(true)
    setSelectionBounds(null)
    // Overlay will be initialized by useEffect
  }

  const handleCancelSelection = () => {
    setIsSelectingArea(false)
    setSelectionBounds(null)
    setOverlayRect(null)
    setIsDragging(null)
  }

  const handleConfirmSelection = () => {
    if (selectionBounds && map.current) {
      // Keep selection bounds and open download sheet
      setDownloadSheetOpen(true)
      setIsSelectingArea(false)
      setOverlayRect(null)
    }
  }

  // Corner drag handlers
  const handleCornerMouseDown = (corner: string) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(corner)
  }

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !overlayRect || !mapContainer.current || !map.current) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const containerRect = mapContainer.current.getBoundingClientRect()
    const x = clientX - containerRect.left
    const y = clientY - containerRect.top

    let newRect = { ...overlayRect }

    // Update rect based on which corner is being dragged
    switch (isDragging) {
      case 'nw': // Top-left
        newRect.width = overlayRect.left + overlayRect.width - x
        newRect.height = overlayRect.top + overlayRect.height - y
        newRect.left = x
        newRect.top = y
        break
      case 'ne': // Top-right
        newRect.width = x - overlayRect.left
        newRect.height = overlayRect.top + overlayRect.height - y
        newRect.top = y
        break
      case 'sw': // Bottom-left
        newRect.width = overlayRect.left + overlayRect.width - x
        newRect.height = y - overlayRect.top
        newRect.left = x
        break
      case 'se': // Bottom-right
        newRect.width = x - overlayRect.left
        newRect.height = y - overlayRect.top
        break
    }

    // Enforce minimum size (50px) and keep within bounds
    if (newRect.width >= 50 && newRect.height >= 50 &&
        newRect.left >= 0 && newRect.top >= 0 &&
        newRect.left + newRect.width <= containerRect.width &&
        newRect.top + newRect.height <= containerRect.height) {
      setOverlayRect(newRect)

      // Update geographic bounds
      const nw = map.current.unproject([newRect.left, newRect.top])
      const se = map.current.unproject([newRect.left + newRect.width, newRect.top + newRect.height])
      setSelectionBounds(new LngLatBounds(nw, se))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(null)
  }

  // Add/remove drag event listeners (memoized to prevent memory leaks)
  useEffect(() => {
    if (!isDragging) return

    const mouseMoveHandler = (e: MouseEvent | TouchEvent) => {
      handleMouseMove(e)
    }

    const mouseUpHandler = () => {
      handleMouseUp()
    }

    window.addEventListener('mousemove', mouseMoveHandler as any)
    window.addEventListener('mouseup', mouseUpHandler)
    window.addEventListener('touchmove', mouseMoveHandler as any)
    window.addEventListener('touchend', mouseUpHandler)

    return () => {
      window.removeEventListener('mousemove', mouseMoveHandler as any)
      window.removeEventListener('mouseup', mouseUpHandler)
      window.removeEventListener('touchmove', mouseMoveHandler as any)
      window.removeEventListener('touchend', mouseUpHandler)
    }
  }, [isDragging]) // Removed overlayRect dependency to prevent re-registration

  // Update overlay position when map is moved/zoomed
  useEffect(() => {
    if (!isSelectingArea || !selectionBounds || !map.current || !mapContainer.current) return

    const updateOverlayFromBounds = () => {
      if (!map.current || !selectionBounds) return

      const nw = map.current.project([selectionBounds.getWest(), selectionBounds.getNorth()])
      const se = map.current.project([selectionBounds.getEast(), selectionBounds.getSouth()])

      setOverlayRect({
        left: nw.x,
        top: nw.y,
        width: se.x - nw.x,
        height: se.y - nw.y
      })
    }

    map.current.on('move', updateOverlayFromBounds)
    map.current.on('zoom', updateOverlayFromBounds)

    return () => {
      if (map.current) {
        map.current.off('move', updateOverlayFromBounds)
        map.current.off('zoom', updateOverlayFromBounds)
      }
    }
  }, [isSelectingArea, selectionBounds])

  // Zen Mode handlers
  const handleLocationClick = () => {
    if (userLocation && map.current) {
      // If we already have location, fly to it
      const { latitude, longitude } = userLocation.coords
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        essential: true
      })
    } else {
      // Request user location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation(position)
            if (map.current) {
              map.current.flyTo({
                center: [position.coords.longitude, position.coords.latitude],
                zoom: 15,
                essential: true
              })
            }
          },
          (error) => {
            console.error('Geolocation error:', error)
          }
        )
      }
    }
  }

  const handleSearchClick = () => {
    setSearchSheetOpen(true)
  }

  const handleDownloadClick = () => {
    // Open download sheet to view/manage downloaded areas or start new download
    setDownloadSheetOpen(true)
  }

  const handleNavigateToArea = (bounds: { north: number; south: number; east: number; west: number }) => {
    if (!map.current) return

    // Convert bounds to LngLatBounds and fit the map to them
    const lngLatBounds = new maplibregl.LngLatBounds(
      [bounds.west, bounds.south],
      [bounds.east, bounds.north]
    )

    map.current.fitBounds(lngLatBounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      duration: 1000
    })
  }

  const handleInfoClick = () => {
    setInfoSheetOpen(true)
  }

  const handleSettingsClick = () => {
    setSettingsSheetOpen(true)
  }

  const handleCategoryClick = () => {
    setCategorySheetOpen(true)
  }

  const handleCategorySelect = (category: POICategory) => {
    if (!map.current) return

    // Toggle category - markers will be managed by useEffect watching visiblePOIs
    setActiveCategories(prev => {
      const newCategories = new Set(prev)
      if (newCategories.has(category)) {
        newCategories.delete(category)
        console.log(`[Map] Deactivated category: ${category}`)
      } else {
        newCategories.add(category)
        console.log(`[Map] Activated category: ${category}`)
      }
      return newCategories
    })
  }

  // Route handlers
  const handleRoutesClick = () => {
    setRouteSheetOpen(true)
  }

  const handleStartDrawing = () => {
    setIsDrawingRoute(true)
    setRoutePoints([])
    // Clear existing drawing
    cleanupDrawingLayers()
  }

  const handleStartWaypointPlacement = () => {
    setIsPlacingWaypoint(true)
  }

  const handleSelectRoute = (route: Route) => {
    setSelectedRoute(route)
    // Render route on map
    if (map.current && route.coordinates.length > 0) {
      const lineSourceId = `route-${route.id}-line`
      const pointsSourceId = `route-${route.id}-points`
      const lineLayerId = `route-${route.id}-line-layer`
      const pointsLayerId = `route-${route.id}-points-layer`

      // Add route line if not already present
      if (!map.current.getSource(lineSourceId) && route.coordinates.length >= 2) {
        map.current.addSource(lineSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: route.coordinates
            }
          }
        })

        map.current.addLayer({
          id: lineLayerId,
          type: 'line',
          source: lineSourceId,
          paint: {
            'line-color': '#3e4533',
            'line-width': 4,
            'line-opacity': 0.8
          }
        })
      }

      // Add route points
      if (!map.current.getSource(pointsSourceId)) {
        const pointFeatures = route.coordinates.map(coord => ({
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'Point' as const,
            coordinates: coord
          }
        }))

        map.current.addSource(pointsSourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: pointFeatures
          }
        })

        map.current.addLayer({
          id: pointsLayerId,
          type: 'circle',
          source: pointsSourceId,
          paint: {
            'circle-radius': 6,
            'circle-color': '#3e4533',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          }
        })
      }

      // Fly to route start
      map.current.flyTo({
        center: route.coordinates[0],
        zoom: 13,
        essential: true
      })

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    }
  }

  const handleSelectWaypoint = (waypoint: Waypoint) => {
    // Navigate to waypoint on map
    if (map.current) {
      // Navigate to waypoint (marker should already exist from initial load)
      map.current.flyTo({
        center: waypoint.coordinates,
        zoom: 14,
        essential: true
      })

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }

      // Close route sheet after navigation
      setRouteSheetOpen(false)
    }
  }

  const handleDeleteRoute = (routeId: string) => {
    if (!map.current) return

    // Remove route layers and sources from map
    const lineLayerId = `route-${routeId}-line-layer`
    const pointsLayerId = `route-${routeId}-points-layer`
    const lineSourceId = `route-${routeId}-line`
    const pointsSourceId = `route-${routeId}-points`

    // Remove layers
    if (map.current.getLayer(lineLayerId)) {
      map.current.removeLayer(lineLayerId)
    }
    if (map.current.getLayer(pointsLayerId)) {
      map.current.removeLayer(pointsLayerId)
    }

    // Remove sources
    if (map.current.getSource(lineSourceId)) {
      map.current.removeSource(lineSourceId)
    }
    if (map.current.getSource(pointsSourceId)) {
      map.current.removeSource(pointsSourceId)
    }
  }

  const handleDeleteWaypoint = (waypointId: string) => {
    // Remove waypoint marker from map
    const marker = waypointMarkers[waypointId]
    if (marker) {
      marker.remove()
      // Update state to remove the marker
      setWaypointMarkers(prev => {
        const newMarkers = { ...prev }
        delete newMarkers[waypointId]
        return newMarkers
      })
    }
  }

  return (
    <div className={`map-wrapper ${controlsVisible ? 'controls-visible' : ''}`}>
      {zenMode ? (
        <>
          {/* Zen Mode UI - FAB + Bottom Sheets */}
          <FABMenu
            onSearchClick={handleSearchClick}
            onDownloadClick={handleDownloadClick}
            onInfoClick={handleInfoClick}
            onRoutesClick={handleRoutesClick}
            onCategoryClick={handleCategoryClick}
            onLocationClick={handleLocationClick}
            onSettingsClick={handleSettingsClick}
            onInstallClick={() => setInstallSheetOpen(true)}
            showInstall={!isInstalled && (canInstall || platform === 'ios')}
            visible={controlsVisible}
            sheetsOpen={searchSheetOpen || infoSheetOpen || downloadSheetOpen || routeSheetOpen || settingsSheetOpen || categorySheetOpen || poiDetailsSheetOpen || installSheetOpen}
            menuOpen={fabMenuOpen}
            onMenuOpenChange={setFabMenuOpen}
          />

          {/* Drawing mode banner */}
          {isDrawingRoute && (
            <div className="drawing-banner">
              <div className="drawing-banner-content">
                <span className="material-symbols-outlined">route</span>
                <div className="drawing-banner-text">
                  <strong>Tegner rute</strong>
                  <span>{routePoints.length} punkt{routePoints.length !== 1 ? 'er' : ''}</span>
                </div>
              </div>
              {routePoints.length >= 2 && (
                <button
                  className="drawing-banner-finish"
                  onClick={async () => {
                    const inputName = prompt('Navn på ruten:')
                    const name = validateName(inputName)
                    if (name) {
                      try {
                        const distance = routeService.calculateDistance(routePoints)
                        await routeService.createRoute({
                          name,
                          coordinates: routePoints,
                          distance,
                          waypoints: []
                        })

                        // Clean up drawing
                        setIsDrawingRoute(false)
                        setRoutePoints([])
                        cleanupDrawingLayers()

                        // Show success and open route sheet
                        alert('Rute lagret!')
                        setRouteSheetOpen(true)
                      } catch (error) {
                        console.error('Failed to save route:', error)
                        alert('Kunne ikke lagre ruten')
                      }
                    }
                  }}
                  aria-label="Fullfør rute"
                >
                  <span className="material-symbols-outlined">check</span>
                  <span>Fullfør</span>
                </button>
              )}
              <button
                className="drawing-banner-close"
                onClick={() => {
                  setIsDrawingRoute(false)
                  setRoutePoints([])
                  cleanupDrawingLayers()
                }}
                aria-label="Avbryt"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          )}

          {/* Waypoint placement banner */}
          {isPlacingWaypoint && (
            <div className="drawing-banner">
              <div className="drawing-banner-content">
                <span className="material-symbols-outlined">location_on</span>
                <div className="drawing-banner-text">
                  <strong>Legg til punkt</strong>
                </div>
              </div>
              <button
                className="drawing-banner-close"
                onClick={() => setIsPlacingWaypoint(false)}
                aria-label="Avbryt"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          )}

          {/* Area selection overlay */}
          {isSelectingArea && overlayRect && (
            <>
              {/* Instruction banner */}
              <div className="selection-banner">
                <div className="selection-banner-content">
                  <span className="material-symbols-outlined">download</span>
                  <div className="selection-banner-text">
                    <strong>Velg område</strong>
                    <span>Dra hjørnene for å endre</span>
                  </div>
                </div>
                <button
                  className="selection-banner-close"
                  onClick={handleCancelSelection}
                  aria-label="Avbryt"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Selection overlay */}
              <div
                className="selection-overlay"
                style={{
                  left: `${overlayRect.left}px`,
                  top: `${overlayRect.top}px`,
                  width: `${overlayRect.width}px`,
                  height: `${overlayRect.height}px`,
                }}
              >
                {/* Corner handles */}
                <div
                  className="selection-handle nw"
                  onMouseDown={handleCornerMouseDown('nw')}
                  onTouchStart={handleCornerMouseDown('nw')}
                />
                <div
                  className="selection-handle ne"
                  onMouseDown={handleCornerMouseDown('ne')}
                  onTouchStart={handleCornerMouseDown('ne')}
                />
                <div
                  className="selection-handle sw"
                  onMouseDown={handleCornerMouseDown('sw')}
                  onTouchStart={handleCornerMouseDown('sw')}
                />
                <div
                  className="selection-handle se"
                  onMouseDown={handleCornerMouseDown('se')}
                  onTouchStart={handleCornerMouseDown('se')}
                />
              </div>

              {/* Next button */}
              <button
                className="selection-confirm-button"
                onClick={handleConfirmSelection}
                aria-label="Neste"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
                <span>Neste</span>
              </button>
            </>
          )}

          <SearchSheet
            isOpen={searchSheetOpen}
            onClose={() => {
              setSearchSheetOpen(false)
              // Remove search marker when sheet closes
              if (searchMarker.current) {
                searchMarker.current.remove()
                searchMarker.current = null
                searchMarkerLocation.current = null
              }
            }}
            onResultSelect={handleSearchResult}
          />
          <InfoSheet
            isOpen={infoSheetOpen}
            onClose={() => setInfoSheetOpen(false)}
          />
          <DownloadSheet
            isOpen={downloadSheetOpen}
            onClose={() => setDownloadSheetOpen(false)}
            bounds={selectionBounds}
            zoom={currentZoom}
            isSelecting={isSelectingArea}
            onStartSelection={handleStartSelection}
            onCancelSelection={handleCancelSelection}
            onNavigateToArea={handleNavigateToArea}
          />
          <RouteSheet
            isOpen={routeSheetOpen}
            onClose={() => setRouteSheetOpen(false)}
            onStartDrawing={handleStartDrawing}
            onStartWaypointPlacement={handleStartWaypointPlacement}
            onSelectRoute={handleSelectRoute}
            onSelectWaypoint={handleSelectWaypoint}
            onDeleteRoute={handleDeleteRoute}
            onDeleteWaypoint={handleDeleteWaypoint}
            routesVisible={routesVisible}
            onToggleVisibility={() => setRoutesVisible(!routesVisible)}
          />
          <SettingsSheet
            isOpen={settingsSheetOpen}
            onClose={() => setSettingsSheetOpen(false)}
          />
          <CategorySheet
            isOpen={categorySheetOpen}
            onClose={() => setCategorySheetOpen(false)}
            onCategorySelect={handleCategorySelect}
          />
          <POIDetailsSheet
            isOpen={poiDetailsSheetOpen}
            onClose={() => {
              setPoiDetailsSheetOpen(false)
              setSelectedPOI(null)
            }}
            poi={selectedPOI}
          />

          <InstallSheet
            isOpen={installSheetOpen}
            onClose={() => setInstallSheetOpen(false)}
            onInstall={promptInstall}
            canInstall={canInstall}
            platform={platform}
          />
        </>
      ) : (
        <>
          {/* Classic Mode UI - Original controls */}
          <SearchControl onResultSelect={handleSearchResult} />
          <div className="download-control-container">
            <DownloadControl
              bounds={selectionBounds}
              zoom={currentZoom}
              onStartSelection={handleStartSelection}
              onCancelSelection={handleCancelSelection}
            />
          </div>
          <InfoPanel />
        </>
      )}
      <div ref={mapContainer} className="map" />
    </div>
  )
}

export default Map
