import { useEffect, useRef, useState } from 'react'
import maplibregl, { LngLatBounds } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import NavigationLocationControl from './NavigationLocationControl'
import SearchControl from './SearchControl'
import DownloadControl from './DownloadControl'
// InfoPanel removed - using InfoSheet instead
import FABMenu from './FABMenu'
import SearchSheet from './SearchSheet'
import InfoSheet from './InfoSheet'
import DownloadSheet from './DownloadSheet'
import RouteSheet from './RouteSheet'
import CategorySheet from './CategorySheet'
import POIDetailsSheet from './POIDetailsSheet'
import InstallSheet from './InstallSheet'
import WaypointDetailsSheet from './WaypointDetailsSheet'
import RouteDetailsSheet from './RouteDetailsSheet'
import MapPreferencesSheet from './MapPreferencesSheet'
import WeatherWidget from './WeatherWidget'
import WeatherSheet from './WeatherSheet'
import MeasurementTools, { type MeasurementMode } from './MeasurementTools'
import { useAutoHide } from '../hooks/useAutoHide'
import { useViewportPOIs } from '../hooks/useViewportPOIs'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { MAP_CONFIG, devLog, devError, type BaseLayerType } from '../constants'
import { VALIDATION, UI_DELAYS, GESTURES } from '../config/timings'
import { validateName } from '../utils/validation'
import type { SearchResult } from '../services/searchService'
import type { Route, Waypoint } from '../services/routeService'
import { routeService } from '../services/routeService'
import { poiService, type POICategory, type POI } from '../services/poiService'
import { mapPreferencesService, type MapPreferences } from '../services/mapPreferencesService'
import '../styles/Map.css'

interface MapProps {
  zenMode: boolean
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
  const overlayRectRef = useRef<{ top: number; left: number; width: number; height: number } | null>(null)
  const isDraggingRef = useRef<string | null>(null)

  // Zen Mode UI state
  const [searchSheetOpen, setSearchSheetOpen] = useState(false)
  const [infoSheetOpen, setInfoSheetOpen] = useState(false)
  const [downloadSheetOpen, setDownloadSheetOpen] = useState(false)
  const [routeSheetOpen, setRouteSheetOpen] = useState(false)
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [poiDetailsSheetOpen, setPoiDetailsSheetOpen] = useState(false)
  const [installSheetOpen, setInstallSheetOpen] = useState(false)
  const [fabMenuOpen, setFabMenuOpen] = useState(false)
  const [mapPreferencesSheetOpen, setMapPreferencesSheetOpen] = useState(false)
  const [weatherSheetOpen, setWeatherSheetOpen] = useState(false)

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
  const [routesVisible, setRoutesVisible] = useState(() => {
    // Load routesVisible preference from localStorage
    const saved = localStorage.getItem('trakke_routes_visible')
    return saved !== null ? saved === 'true' : true // Default to true if not set
  })

  // Temporary waypoint state (before save)
  const tempWaypointMarker = useRef<maplibregl.Marker | null>(null)
  const [tempWaypointCoords, setTempWaypointCoords] = useState<[number, number] | null>(null)
  const [waypointDetailsSheetOpen, setWaypointDetailsSheetOpen] = useState(false)

  // Route details sheet state
  const [routeDetailsSheetOpen, setRouteDetailsSheetOpen] = useState(false)

  // Editing state
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null)

  // Data change trigger for RouteSheet to reload
  const [dataChangeTrigger, setDataChangeTrigger] = useState(0)

  // Map preferences state
  const [mapPreferences, setMapPreferences] = useState<MapPreferences>(
    mapPreferencesService.getPreferences()
  )

  // Base layer state (derived from preferences)
  const [baseLayer, setBaseLayer] = useState<BaseLayerType>(() => {
    const prefs = mapPreferencesService.getPreferences()
    return prefs.baseLayer
  })

  // Map control refs (for scale bar, compass)
  const scaleControl = useRef<maplibregl.ScaleControl | null>(null)
  const compassControl = useRef<maplibregl.NavigationControl | null>(null)

  // Measurement tools state
  const [measurementActive, setMeasurementActive] = useState(false)
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>(null)
  const [measurementPoints, setMeasurementPoints] = useState<Array<[number, number]>>([])

  // Refs for map click handler (to avoid stale closures with empty deps)
  const clickStateRef = useRef({
    isDrawingRoute: false,
    isPlacingWaypoint: false,
    isSelectingArea: false,
    measurementActive: false,
    measurementMode: null as MeasurementMode,
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  })

  // Refs for keyboard shortcuts (to avoid frequent listener re-registrations)
  const keyboardStateRef = useRef({
    searchSheetOpen: false,
    routeSheetOpen: false,
    downloadSheetOpen: false,
    categorySheetOpen: false,
    mapPreferencesSheetOpen: false,
    infoSheetOpen: false,
    poiDetailsSheetOpen: false,
    installSheetOpen: false,
    fabMenuOpen: false
  })

  // Update refs whenever state changes
  useEffect(() => {
    clickStateRef.current.isDrawingRoute = isDrawingRoute
    clickStateRef.current.isPlacingWaypoint = isPlacingWaypoint
    clickStateRef.current.isSelectingArea = isSelectingArea
    clickStateRef.current.measurementActive = measurementActive
    clickStateRef.current.measurementMode = measurementMode

    keyboardStateRef.current.searchSheetOpen = searchSheetOpen
    keyboardStateRef.current.routeSheetOpen = routeSheetOpen
    keyboardStateRef.current.downloadSheetOpen = downloadSheetOpen
    keyboardStateRef.current.categorySheetOpen = categorySheetOpen
    keyboardStateRef.current.mapPreferencesSheetOpen = mapPreferencesSheetOpen
    keyboardStateRef.current.infoSheetOpen = infoSheetOpen
    keyboardStateRef.current.poiDetailsSheetOpen = poiDetailsSheetOpen
    keyboardStateRef.current.installSheetOpen = installSheetOpen
    keyboardStateRef.current.fabMenuOpen = fabMenuOpen
  }, [
    isDrawingRoute,
    isPlacingWaypoint,
    isSelectingArea,
    measurementActive,
    measurementMode,
    searchSheetOpen,
    routeSheetOpen,
    downloadSheetOpen,
    categorySheetOpen,
    mapPreferencesSheetOpen,
    infoSheetOpen,
    poiDetailsSheetOpen,
    installSheetOpen,
    fabMenuOpen
  ])

  const { visible: controlsVisible, show: showControls, hide: hideControls } = useAutoHide({
    delay: 5000,
    initialVisible: true // Show initially for discoverability
  })

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    // Initialize map with dual base layers (topo and grayscale)
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'kartverket-topo': {
            type: 'raster',
            tiles: [MAP_CONFIG.TILE_URL_TOPO],
            tileSize: 256,
            attribution: zenMode ? '' : MAP_CONFIG.ATTRIBUTION
          },
          'kartverket-grayscale': {
            type: 'raster',
            tiles: [MAP_CONFIG.TILE_URL_GRAYSCALE],
            tileSize: 256,
            attribution: zenMode ? '' : MAP_CONFIG.ATTRIBUTION
          }
        },
        layers: [
          // Grayscale layer (bottom - hidden by default)
          {
            id: 'kartverket-grayscale-layer',
            type: 'raster',
            source: 'kartverket-grayscale',
            layout: {
              visibility: baseLayer === 'grayscale' ? 'visible' : 'none'
            },
            minzoom: 0,
            maxzoom: 22
          },
          // Topo layer (top - visible by default)
          {
            id: 'kartverket-topo-layer',
            type: 'raster',
            source: 'kartverket-topo',
            layout: {
              visibility: baseLayer === 'topo' ? 'visible' : 'none'
            },
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
          onLocationError: (error) => devError('Geolocation error:', error),
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
    let activeTouchMoveHandler: ((e: TouchEvent) => void) | null = null
    let activeTouchEndHandler: (() => void) | null = null

    const handleBottomEdgeSwipe = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartY = touch.clientY
      const windowHeight = window.innerHeight

      // Only track if touch starts near bottom edge
      if (touchStartY > windowHeight - GESTURES.BOTTOM_EDGE_ZONE) {
        const handleTouchMove = (moveEvent: TouchEvent) => {
          const touchY = moveEvent.touches[0].clientY
          const swipeDistance = touchStartY - touchY

          // Swipe up from bottom edge
          if (swipeDistance > GESTURES.BOTTOM_EDGE_SWIPE_MIN) {
            showControls()
            cleanupTouchHandlers()
          }
        }

        const handleTouchEnd = () => {
          cleanupTouchHandlers()
        }

        const cleanupTouchHandlers = () => {
          if (activeTouchMoveHandler) {
            document.removeEventListener('touchmove', activeTouchMoveHandler)
            activeTouchMoveHandler = null
          }
          if (activeTouchEndHandler) {
            document.removeEventListener('touchend', activeTouchEndHandler)
            activeTouchEndHandler = null
          }
        }

        activeTouchMoveHandler = handleTouchMove
        activeTouchEndHandler = handleTouchEnd

        document.addEventListener('touchmove', handleTouchMove, { passive: true })
        document.addEventListener('touchend', handleTouchEnd, { once: true })
      }
    }

    document.addEventListener('touchstart', handleBottomEdgeSwipe, { passive: true })

    // Cleanup on unmount
    return () => {
      document.removeEventListener('touchstart', handleBottomEdgeSwipe)
      // Clean up any active touch handlers
      if (activeTouchMoveHandler) {
        document.removeEventListener('touchmove', activeTouchMoveHandler)
      }
      if (activeTouchEndHandler) {
        document.removeEventListener('touchend', activeTouchEndHandler)
      }
      // Clean up temporary waypoint marker
      if (tempWaypointMarker.current) {
        tempWaypointMarker.current.remove()
        tempWaypointMarker.current = null
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Apply map preferences (scale bar, compass, rotation)
  useEffect(() => {
    if (!map.current) return

    const currentMap = map.current

    // Scale bar
    if (mapPreferences.showScaleBar) {
      if (!scaleControl.current) {
        scaleControl.current = new maplibregl.ScaleControl({
          maxWidth: 100,
          unit: 'metric'
        })
        currentMap.addControl(scaleControl.current, 'bottom-right')
      }
    } else {
      if (scaleControl.current) {
        try {
          currentMap.removeControl(scaleControl.current)
        } catch (error) {
          devError('Failed to remove scale control:', error)
        } finally {
          scaleControl.current = null
        }
      }
    }

    // Compass/Navigation control (rotation + zoom buttons)
    if (mapPreferences.showCompass) {
      if (!compassControl.current) {
        compassControl.current = new maplibregl.NavigationControl({
          showCompass: true,
          showZoom: false,
          visualizePitch: false
        })
        currentMap.addControl(compassControl.current, 'top-right')
      }
    } else {
      if (compassControl.current) {
        try {
          currentMap.removeControl(compassControl.current)
        } catch (error) {
          devError('Failed to remove compass control:', error)
        } finally {
          compassControl.current = null
        }
      }
    }

    // Rotation (bearing/pitch interaction)
    // Note: We only disable rotation, NOT zoom
    if (mapPreferences.enableRotation) {
      currentMap.dragRotate.enable()
      currentMap.touchPitch.enable()
      currentMap.touchZoomRotate.enableRotation()
    } else {
      currentMap.dragRotate.disable()
      currentMap.touchPitch.disable()
      currentMap.touchZoomRotate.disableRotation()
    }

    // User location marker size (enlargePointer)
    if (userMarker.current) {
      const markerElement = userMarker.current.getElement()
      if (mapPreferences.enlargePointer) {
        markerElement.classList.add('enlarged-pointer')
      } else {
        markerElement.classList.remove('enlarged-pointer')
      }
    }

    // Note: offlineOnly preference is handled by Service Worker cache strategy
    // and would require coordination with offlineMapService
  }, [mapPreferences])

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

  // Update measurement layers when points change (e.g., when cleared by Nullstill button)
  useEffect(() => {
    if (!map.current || !measurementActive || !measurementMode) return
    updateMeasurementLayers(measurementPoints)
  }, [measurementPoints, measurementActive, measurementMode])

  // Clean up temporary waypoint marker on map navigation
  useEffect(() => {
    if (!map.current) return

    const cleanupTempWaypoint = () => {
      // Only clean up if the sheet is not open (user is navigating away)
      if (!waypointDetailsSheetOpen && tempWaypointMarker.current) {
        tempWaypointMarker.current.remove()
        tempWaypointMarker.current = null
        setTempWaypointCoords(null)
      }
    }

    map.current.on('movestart', cleanupTempWaypoint)

    return () => {
      if (map.current) {
        map.current.off('movestart', cleanupTempWaypoint)
      }
    }
  }, [waypointDetailsSheetOpen])

  // Effect: Switch base layer when preference changes
  useEffect(() => {
    if (!map.current) return

    try {
      if (baseLayer === 'grayscale') {
        map.current.setLayoutProperty('kartverket-topo-layer', 'visibility', 'none')
        map.current.setLayoutProperty('kartverket-grayscale-layer', 'visibility', 'visible')
        devLog('Switched to grayscale base layer')
      } else {
        map.current.setLayoutProperty('kartverket-grayscale-layer', 'visibility', 'none')
        map.current.setLayoutProperty('kartverket-topo-layer', 'visibility', 'visible')
        devLog('Switched to topographic base layer')
      }
    } catch (error) {
      devError('Failed to switch base layer:', error)
    }
  }, [baseLayer])

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

  // Helper function to clean up navigation-specific markers
  const cleanupNavigationMarkers = () => {
    // Remove search marker
    if (searchMarker.current) {
      searchMarker.current.remove()
      searchMarker.current = null
      searchMarkerLocation.current = null
    }

    // Remove temporary waypoint marker
    if (tempWaypointMarker.current) {
      tempWaypointMarker.current.remove()
      tempWaypointMarker.current = null
      setTempWaypointCoords(null)
    }
  }

  // Comprehensive keyboard shortcuts handler (uses refs to avoid frequent re-registrations)
  useEffect(() => {
    // Skip keyboard shortcuts on mobile devices
    if (clickStateRef.current.isMobile) return

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
        setFabMenuOpen((prev) => !prev)
        return
      }

      // Escape: Close sheets, cancel drawing modes, or close FAB menu
      if (e.key === 'Escape') {
        e.preventDefault()

        const state = keyboardStateRef.current
        const clickState = clickStateRef.current

        // Priority order: drawing modes > open sheets > FAB menu
        if (clickState.isDrawingRoute) {
          setIsDrawingRoute(false)
          setRoutePoints([])
          cleanupDrawingLayers()
        } else if (clickState.isPlacingWaypoint) {
          setIsPlacingWaypoint(false)
        } else if (state.searchSheetOpen) {
          setSearchSheetOpen(false)
        } else if (state.routeSheetOpen) {
          setRouteSheetOpen(false)
        } else if (state.downloadSheetOpen) {
          setDownloadSheetOpen(false)
        } else if (state.categorySheetOpen) {
          setCategorySheetOpen(false)
        } else if (state.mapPreferencesSheetOpen) {
          setMapPreferencesSheetOpen(false)
        } else if (state.infoSheetOpen) {
          setInfoSheetOpen(false)
        } else if (state.poiDetailsSheetOpen) {
          setPoiDetailsSheetOpen(false)
        } else if (state.installSheetOpen) {
          setInstallSheetOpen(false)
        } else if (state.fabMenuOpen) {
          setFabMenuOpen(false)
        }
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - register once, use refs for current state

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
    devLog(`[Waypoints] Visibility effect running. routesVisible: ${routesVisible}, markers count: ${Object.keys(waypointMarkers).length}`)
    Object.values(waypointMarkers).forEach((marker) => {
      const element = marker.getElement()
      if (element) {
        if (routesVisible) {
          element.classList.remove('hidden')
        } else {
          element.classList.add('hidden')
        }
        devLog(`[Waypoints] Set marker visibility to: ${routesVisible ? 'visible' : 'hidden'}`)
      }
    })
  }, [routesVisible, waypointMarkers])

  // Sync refs for overlay dragging (prevents stale closures in event handlers)
  useEffect(() => {
    overlayRectRef.current = overlayRect
    isDraggingRef.current = isDragging
  }, [overlayRect, isDragging])

  // Persist routesVisible preference to localStorage
  useEffect(() => {
    localStorage.setItem('trakke_routes_visible', String(routesVisible))
    devLog(`[Waypoints] Saved routesVisible to localStorage: ${routesVisible}`)
  }, [routesVisible])

  // Initialize POI clustering layers (MapLibre native GeoJSON clustering for 60fps performance)
  useEffect(() => {
    if (!map.current || poiLayersInitialized.current) return

    const m = map.current

    const initializePOILayers = async () => {
      if (!map.current || poiLayersInitialized.current) return

      devLog('[Map] Initializing POI clustering layers...')

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

        // Unclustered points layer (individual POI markers with category-specific icons)
        map.current.addLayer({
          id: 'poi-unclustered',
          type: 'symbol',
          source: 'pois',
          filter: ['!', ['has', 'point_count']],
          layout: {
            'icon-image': [
              'match',
              ['get', 'category'],
              'shelters', 'tilfluktsrom-icon',
              'wilderness_shelters', 'wilderness-shelter-icon',
              'caves', 'cave-icon',
              'observation_towers', 'tower-icon',
              'war_memorials', 'memorial-icon',
              'tilfluktsrom-icon' // fallback
            ],
            'icon-size': 1,
            'icon-allow-overlap': true
          }
        })

        // Helper function to load SVG and convert to Image
        const loadSVGAsImage = async (path: string, color: string): Promise<HTMLImageElement> => {
          devLog('[Map] Loading SVG icon from:', path)
          const response = await fetch(path)
          if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`)
          }
          const svgText = await response.text()

          // Recolor SVG to match category color
          const coloredSVG = svgText.replace(/fill="[^"]*"/g, `fill="${color}"`)

          const blob = new Blob([coloredSVG], { type: 'image/svg+xml' })
          const url = URL.createObjectURL(blob)

          return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
              devLog('[Map] Successfully loaded SVG icon:', path)
              URL.revokeObjectURL(url)
              resolve(img)
            }
            img.onerror = () => {
              devError('[Map] Failed to load SVG image from blob URL:', path)
              URL.revokeObjectURL(url)
              reject(new Error(`Failed to load SVG: ${path}`))
            }
            img.src = url
          })
        }

        // Helper function to convert Image to canvas ImageData
        const imageToMapIcon = (img: HTMLImageElement, size: number) => {
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')!

          // Draw image centered and scaled
          ctx.drawImage(img, 0, 0, size, size)

          return {
            width: size,
            height: size,
            data: ctx.getImageData(0, 0, size, size).data
          }
        }

        // Create custom shelter icon (T marker) as canvas
        const size = 24
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        // Draw yellow square with black border
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

        map.current.addImage('tilfluktsrom-icon', {
          width: size,
          height: size,
          data: ctx.getImageData(0, 0, size, size).data
        })

        // Load SVG icons for all POI categories from OSM-Carto
        try {
          const baseUrl = import.meta.env.BASE_URL
          devLog('[Map] BASE_URL:', baseUrl)

          const caveImg = await loadSVGAsImage(`${baseUrl}icons/osm-carto/cave.svg`, '#8b4513')
          map.current.addImage('cave-icon', imageToMapIcon(caveImg, size))

          const towerImg = await loadSVGAsImage(`${baseUrl}icons/osm-carto/tower_observation.svg`, '#4a5568')
          map.current.addImage('tower-icon', imageToMapIcon(towerImg, size))

          const memorialImg = await loadSVGAsImage(`${baseUrl}icons/osm-carto/fort.svg`, '#6b7280')
          map.current.addImage('memorial-icon', imageToMapIcon(memorialImg, size))

          const wildernessShelterImg = await loadSVGAsImage(`${baseUrl}icons/osm-carto/shelter.svg`, '#b45309')
          map.current.addImage('wilderness-shelter-icon', imageToMapIcon(wildernessShelterImg, size))

          devLog('[Map] All SVG icons loaded successfully')
        } catch (error) {
          devError('[Map] Failed to load SVG icons, using fallback circles:', error)

          // Fallback: cave icon (brown circle)
          const caveCanvas = document.createElement('canvas')
          caveCanvas.width = size
          caveCanvas.height = size
          const caveCtx = caveCanvas.getContext('2d')!
          caveCtx.fillStyle = '#8b4513' // Saddle brown
          caveCtx.beginPath()
          caveCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
          caveCtx.fill()
          map.current.addImage('cave-icon', {
            width: size,
            height: size,
            data: caveCtx.getImageData(0, 0, size, size).data
          })

          // Fallback: observation tower icon (gray circle)
          const towerCanvas = document.createElement('canvas')
          towerCanvas.width = size
          towerCanvas.height = size
          const towerCtx = towerCanvas.getContext('2d')!
          towerCtx.fillStyle = '#4a5568'
          towerCtx.beginPath()
          towerCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
          towerCtx.fill()
          map.current.addImage('tower-icon', {
            width: size,
            height: size,
            data: towerCtx.getImageData(0, 0, size, size).data
          })

          // Fallback: war memorial icon (dark gray circle)
          const memorialCanvas = document.createElement('canvas')
          memorialCanvas.width = size
          memorialCanvas.height = size
          const memorialCtx = memorialCanvas.getContext('2d')!
          memorialCtx.fillStyle = '#6b7280'
          memorialCtx.beginPath()
          memorialCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
          memorialCtx.fill()
          map.current.addImage('memorial-icon', {
            width: size,
            height: size,
            data: memorialCtx.getImageData(0, 0, size, size).data
          })

          // Fallback: wilderness shelter icon (brown/orange circle)
          const wildernessShelterCanvas = document.createElement('canvas')
          wildernessShelterCanvas.width = size
          wildernessShelterCanvas.height = size
          const wildernessShelterCtx = wildernessShelterCanvas.getContext('2d')!
          wildernessShelterCtx.fillStyle = '#b45309'
          wildernessShelterCtx.beginPath()
          wildernessShelterCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
          wildernessShelterCtx.fill()
          map.current.addImage('wilderness-shelter-icon', {
            width: size,
            height: size,
            data: wildernessShelterCtx.getImageData(0, 0, size, size).data
          })
        }

        poiLayersInitialized.current = true
        devLog('[Map] POI clustering layers initialized successfully')
      } catch (error) {
        devError('[Map] Failed to initialize POI clustering layers:', error)
      }
    }

    // Wait for map to be fully loaded
    if (!m.loaded()) {
      devLog('[Map] Waiting for map to load before initializing POI layers')
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
    const idCounts: Record<string, number> = {}

    visiblePOIs.forEach((pois, category) => {
      if (activeCategories.has(category)) {
        devLog(`[Map] Processing ${pois.length} POIs for category ${category}`)
        pois.forEach(poi => {
          // Track duplicate IDs
          const count = idCounts[poi.id] || 0
          idCounts[poi.id] = count + 1

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

    // Log any duplicate POI IDs
    const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1)
    if (duplicates.length > 0) {
      devError(`[Map] Found ${duplicates.length} duplicate POI IDs:`, duplicates)
    }

    const source = map.current.getSource('pois') as maplibregl.GeoJSONSource
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: features
      })
      devLog(`[Map] Updated POI source with ${features.length} features (clustering enabled)`)
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

  // Use refs to store current state and avoid event listener re-registrations
  const drawingStateRef = useRef({ isDrawingRoute, isPlacingWaypoint, isSelectingArea })
  useEffect(() => {
    drawingStateRef.current = { isDrawingRoute, isPlacingWaypoint, isSelectingArea }
  }, [isDrawingRoute, isPlacingWaypoint, isSelectingArea])

  // Register map click handler ONCE with stable ref (avoids frequent re-registrations)
  useEffect(() => {
    if (!map.current) return

    const clickHandler = (e: maplibregl.MapMouseEvent) => {
      // Use current ref values instead of closure values
      handleMapClick(e)
    }

    map.current.on('click', clickHandler)

    return () => {
      if (map.current) {
        map.current.off('click', clickHandler)
      }
    }
  }, []) // Empty deps - register once

  // Long-press coordinate copy removed - Ctrl+click remains available for desktop users

  // Register direct DOM mousedown handler for Ctrl+click (bypasses MapLibre event handling)
  useEffect(() => {
    if (!map.current) return

    const canvas = map.current.getCanvas()
    let mouseDownPos: { x: number; y: number } | null = null
    let hadCtrlKey = false

    const handleMouseDown = (e: MouseEvent) => {
      mouseDownPos = { x: e.clientX, y: e.clientY }
      hadCtrlKey = e.ctrlKey

      devLog('[Map] Direct DOM mousedown event - modifiers:', {
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        button: e.button
      })
    }

    const handleMouseUp = async (e: MouseEvent) => {
      devLog('[Map] Direct DOM mouseup event - modifiers:', {
        ctrlKey: e.ctrlKey,
        hadCtrlKeyOnDown: hadCtrlKey,
        button: e.button
      })

      // Check if mouse hasn't moved much (click, not drag)
      if (mouseDownPos) {
        const dx = Math.abs(e.clientX - mouseDownPos.x)
        const dy = Math.abs(e.clientY - mouseDownPos.y)

        // Only handle Ctrl+click (left button) without dragging
        if (hadCtrlKey && e.button === 0 && dx < 5 && dy < 5 && map.current) {
          e.preventDefault()
          e.stopPropagation()

          // Get coordinates from map
          const point = map.current.unproject([e.clientX, e.clientY])
          const coords = `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`
          devLog('[Map] Direct Ctrl+Click detected - Copying coordinates:', coords)

          try {
            await navigator.clipboard.writeText(coords)
            devLog('[Map] Coordinates copied successfully')

            // Haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate(10)
            }

            // Visual feedback
            const notification = document.createElement('div')
            notification.className = 'coordinate-copy-notification'
            notification.textContent = `Koordinater kopiert: ${coords}`
            document.body.appendChild(notification)

            setTimeout(() => {
              if (notification.parentNode) {
                document.body.removeChild(notification)
              }
            }, UI_DELAYS.NOTIFICATION_DISPLAY)
          } catch (error) {
            devError('Failed to copy coordinates:', error)
            alert(`Koordinater: ${coords}`)
          }
        }
      }

      mouseDownPos = null
      hadCtrlKey = false
    }

    // Capture phase to intercept before MapLibre
    canvas.addEventListener('mousedown', handleMouseDown, { capture: true })
    canvas.addEventListener('mouseup', handleMouseUp, { capture: true })

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown, { capture: true })
      canvas.removeEventListener('mouseup', handleMouseUp, { capture: true })
    }
  }, [])

  // Helper function to update route drawing layers (prevents stale closure issues)
  const updateRouteDrawingLayers = (points: Array<[number, number]>) => {
    if (!map.current) return

    const lineSourceId = 'drawing-route-line'
    const pointsSourceId = 'drawing-route-points'
    const lineLayerId = 'drawing-route-line-layer'
    const pointsLayerId = 'drawing-route-points-layer'

    // Update or create line (only if 2+ points)
    if (points.length >= 2) {
      if (map.current.getSource(lineSourceId)) {
        const source = map.current.getSource(lineSourceId) as maplibregl.GeoJSONSource
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: points
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
              coordinates: points
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
    const pointFeatures = points.map(coord => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Point' as const,
        coordinates: coord
      }
    }))

    devLog('[Route Drawing] Updating points:', points.length, 'features:', pointFeatures.length)

    if (map.current.getSource(pointsSourceId)) {
      const source = map.current.getSource(pointsSourceId) as maplibregl.GeoJSONSource
      source.setData({
        type: 'FeatureCollection',
        features: pointFeatures
      })
      devLog('[Route Drawing] Updated existing points source with', pointFeatures.length, 'features')
    } else {
      devLog('[Route Drawing] Creating new points source with', pointFeatures.length, 'features')
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

  // Update measurement layers on map
  const updateMeasurementLayers = (points: Array<[number, number]>, mode: MeasurementMode = measurementMode) => {
    if (!map.current || !mode) return

    devLog('[Map] updateMeasurementLayers - mode:', mode, 'points:', points.length)

    const sourceId = mode === 'distance' ? 'measurement-line' : 'measurement-polygon'
    const layerId = mode === 'distance' ? 'measurement-line-layer' : 'measurement-polygon-layer'
    const pointsSourceId = 'measurement-points'
    const pointsLayerId = 'measurement-points-layer'

    // Clear old layers if mode changed
    const otherSourceId = mode === 'distance' ? 'measurement-polygon' : 'measurement-line'
    const otherLayerId = mode === 'distance' ? 'measurement-polygon-layer' : 'measurement-line-layer'
    if (map.current.getLayer(otherLayerId)) {
      map.current.removeLayer(otherLayerId)
    }
    if (map.current.getSource(otherSourceId)) {
      map.current.removeSource(otherSourceId)
    }

    // Update or create line/polygon layer
    if (points.length >= (mode === 'distance' ? 2 : 3)) {
      const geometry = mode === 'distance'
        ? { type: 'LineString' as const, coordinates: points }
        : { type: 'Polygon' as const, coordinates: [[...points, points[0]]] } // Close polygon

      if (map.current.getSource(sourceId)) {
        const source = map.current.getSource(sourceId) as maplibregl.GeoJSONSource
        source.setData({
          type: 'Feature',
          properties: {},
          geometry
        })
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry
          }
        })

        if (mode === 'distance') {
          map.current.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#f59e0b', // Amber for measurement
              'line-width': 3,
              'line-dasharray': [2, 2]
            }
          })
        } else {
          map.current.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#f59e0b',
              'fill-opacity': 0.2
            }
          })
          map.current.addLayer({
            id: `${layerId}-outline`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#f59e0b',
              'line-width': 2
            }
          })
        }
      }
    } else {
      // Remove line/polygon layers when not enough points (e.g., when Nullstill is clicked)
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId)
      }
      if (mode === 'area' && map.current.getLayer(`${layerId}-outline`)) {
        map.current.removeLayer(`${layerId}-outline`)
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId)
      }
    }

    // Update or create points
    const pointFeatures = points.map(coord => ({
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
          'circle-radius': 5,
          'circle-color': '#f59e0b',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      })
    }
  }

  // Clean up measurement layers
  const cleanupMeasurementLayers = () => {
    if (!map.current) return

    const layersToRemove = [
      'measurement-line-layer',
      'measurement-polygon-layer',
      'measurement-polygon-layer-outline',
      'measurement-points-layer'
    ]
    const sourcesToRemove = [
      'measurement-line',
      'measurement-polygon',
      'measurement-points'
    ]

    layersToRemove.forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId)
      }
    })

    sourcesToRemove.forEach(sourceId => {
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId)
      }
    })
  }

  // Handle map clicks when selecting area, drawing routes, or placing waypoints
  const handleMapClick = async (e: maplibregl.MapMouseEvent) => {
    // Use ref values to avoid stale closures
    const { isPlacingWaypoint, isDrawingRoute, isSelectingArea, measurementActive, measurementMode, isMobile } = clickStateRef.current

    const mouseEvent = e.originalEvent as MouseEvent

    // Debug: Log all modifier keys on every click
    if (mouseEvent) {
      devLog('[Map] MapLibre click event - modifiers:', {
        ctrlKey: mouseEvent.ctrlKey,
        shiftKey: mouseEvent.shiftKey,
        altKey: mouseEvent.altKey,
        metaKey: mouseEvent.metaKey,
        isMobile
      })
    }

    // Ctrl+Click: Copy coordinates to clipboard (desktop only)
    // Note: This might not fire if MapLibre intercepts Ctrl+click
    if (!isMobile && mouseEvent && mouseEvent.ctrlKey) {
      e.preventDefault()
      const coords = `${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`
      devLog('[Map] Ctrl+Click detected - Copying coordinates:', coords)

      try {
        await navigator.clipboard.writeText(coords)
        devLog('[Map] Coordinates copied successfully to clipboard')

        // Visual feedback using CSS class (safer than inline styles)
        const notification = document.createElement('div')
        notification.className = 'coordinate-copy-notification'
        notification.textContent = `Koordinater kopiert: ${coords}`
        document.body.appendChild(notification)

        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification)
          }
        }, UI_DELAYS.NOTIFICATION_DISPLAY)
      } catch (error) {
        devError('Failed to copy coordinates:', error)
        alert(`Koordinater: ${coords}`)
      }
      return
    }

    // Measurement mode
    if (measurementActive && measurementMode) {
      const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      devLog('[Map] Measurement click - mode:', measurementMode, 'point:', newPoint)
      setMeasurementPoints(prevPoints => {
        const updatedPoints = [...prevPoints, newPoint]
        devLog('[Map] Updated measurement points:', updatedPoints)
        return updatedPoints
      })
      return
    }

    // Route drawing mode
    if (isDrawingRoute) {
      const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat]

      // Use functional update to avoid stale closure
      setRoutePoints(prevPoints => {
        const updatedPoints = [...prevPoints, newPoint]

        // Update map layers with the new points
        updateRouteDrawingLayers(updatedPoints)

        return updatedPoints
      })

      return
    }

    // Waypoint placement mode - create temporary marker instantly
    if (isPlacingWaypoint) {
      devLog('[Waypoint] Placing waypoint at:', [e.lngLat.lng, e.lngLat.lat])

      // Remove any existing temporary marker
      if (tempWaypointMarker.current) {
        devLog('[Waypoint] Removing existing temp marker')
        tempWaypointMarker.current.remove()
        tempWaypointMarker.current = null
      }

      // Create temporary marker element
      const el = document.createElement('div')
      el.className = 'waypoint-marker temp-waypoint'
      el.innerHTML = '<span class="material-symbols-outlined">location_on</span>'

      devLog('[Waypoint] Created marker element:', el.className)

      // Create marker instantly
      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([e.lngLat.lng, e.lngLat.lat])
        .addTo(map.current!)

      devLog('[Waypoint] Marker added to map')

      // Store temporary marker and coordinates
      tempWaypointMarker.current = marker
      setTempWaypointCoords([e.lngLat.lng, e.lngLat.lat])

      // Add right-click handler (desktop)
      el.addEventListener('contextmenu', (event) => {
        event.preventDefault()
        event.stopPropagation()
        setWaypointDetailsSheetOpen(true)
      })

      // Add long-press handler (mobile)
      let pressTimer: number | undefined
      el.addEventListener('touchstart', (event) => {
        pressTimer = window.setTimeout(() => {
          setWaypointDetailsSheetOpen(true)
        }, UI_DELAYS.LONG_PRESS)
      })
      el.addEventListener('touchend', () => {
        if (pressTimer) clearTimeout(pressTimer)
      })
      el.addEventListener('touchmove', () => {
        if (pressTimer) clearTimeout(pressTimer)
      })

      setIsPlacingWaypoint(false)
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
    if (!map.current) return

    const loadExistingWaypoints = async () => {
      devLog('[Waypoints] Loading existing waypoints...')
      try {
        const waypoints = await routeService.getAllWaypoints()
        devLog(`[Waypoints] Found ${waypoints.length} waypoints in database`)

        // Read current visibility preference from localStorage
        const savedRoutesVisible = localStorage.getItem('trakke_routes_visible')
        const shouldShowRoutes = savedRoutesVisible !== null ? savedRoutesVisible === 'true' : true
        devLog(`[Waypoints] Visibility preference from localStorage: "${savedRoutesVisible}" -> shouldShowRoutes: ${shouldShowRoutes}`)

        // Create markers for all waypoints
        const newMarkers: Record<string, maplibregl.Marker> = {}

        waypoints.forEach(waypoint => {
          devLog(`[Waypoints] Creating marker for "${waypoint.name}" at`, waypoint.coordinates)
          const el = document.createElement('div')
          el.className = 'waypoint-marker'
          el.innerHTML = '<span class="material-symbols-outlined">location_on</span>'

          const marker = new maplibregl.Marker({
            element: el,
            anchor: 'bottom' // Pin tip at coordinate
          })
            .setLngLat(waypoint.coordinates)
            .addTo(map.current!)

          // Apply initial visibility state based on saved preference
          if (!shouldShowRoutes) {
            el.classList.add('hidden')
          }
          devLog(`[Waypoints] Set marker "${waypoint.name}" visibility to: ${shouldShowRoutes ? 'visible' : 'hidden'}`)

          newMarkers[waypoint.id] = marker
        })

        setWaypointMarkers(newMarkers)
        devLog(`[Waypoints] Successfully loaded ${waypoints.length} waypoint markers`)
      } catch (error) {
        devError('[Waypoints] Failed to load existing waypoints:', error)
      }
    }

    // Wait for map to be fully loaded before adding markers
    if (map.current.loaded()) {
      devLog('[Waypoints] Map already loaded, loading waypoints now')
      loadExistingWaypoints()
    } else {
      devLog('[Waypoints] Waiting for map to load...')
      map.current.once('load', () => {
        devLog('[Waypoints] Map loaded, loading waypoints')
        loadExistingWaypoints()
      })
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

    // Clean up all navigation markers before showing new search result
    cleanupNavigationMarkers()

    // Create marker for search result
    const el = document.createElement('div')
    el.className = 'search-result-marker'
    el.innerHTML = '<span class="material-symbols-outlined">location_on</span>'

    devLog('[Search] Creating search marker at:', [lon, lat])
    devLog('[Search] Map instance exists:', !!map.current)
    devLog('[Search] Element created:', el, el.className)

    searchMarker.current = new maplibregl.Marker({
      element: el
      // No anchor - let MapLibre handle positioning
    })
      .setLngLat([lon, lat])
      .addTo(map.current)

    devLog('[Search] Search marker added to map')
    devLog('[Search] Marker instance:', searchMarker.current)

    // Check if element is in DOM after a short delay
    setTimeout(() => {
      devLog('[Search] Marker element in DOM after 100ms:', document.querySelector('.search-result-marker'))
    }, 100)

    // Fly to result location FIRST
    map.current.flyTo({
      center: [lon, lat],
      zoom: result.type === 'address' ? 16 : 13,
      essential: true
    })

    // Store the marker location AFTER flyTo starts
    // This prevents the moveend listener from removing the marker during animation
    setTimeout(() => {
      searchMarkerLocation.current = [lon, lat]
    }, 50)
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
    const currentDragging = isDraggingRef.current
    const currentRect = overlayRectRef.current

    if (!currentDragging || !currentRect || !mapContainer.current || !map.current) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const containerRect = mapContainer.current.getBoundingClientRect()
    const x = clientX - containerRect.left
    const y = clientY - containerRect.top

    let newRect = { ...currentRect }

    // Update rect based on which corner is being dragged
    switch (currentDragging) {
      case 'nw': // Top-left
        newRect.width = currentRect.left + currentRect.width - x
        newRect.height = currentRect.top + currentRect.height - y
        newRect.left = x
        newRect.top = y
        break
      case 'ne': // Top-right
        newRect.width = x - currentRect.left
        newRect.height = currentRect.top + currentRect.height - y
        newRect.top = y
        break
      case 'sw': // Bottom-left
        newRect.width = currentRect.left + currentRect.width - x
        newRect.height = y - currentRect.top
        newRect.left = x
        break
      case 'se': // Bottom-right
        newRect.width = x - currentRect.left
        newRect.height = y - currentRect.top
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
            devError('Geolocation error:', error)
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

  const handleWeatherClick = () => {
    setWeatherSheetOpen(true)
  }

  const handleMapPreferencesClick = () => {
    setMapPreferencesSheetOpen(true)
  }

  const handleMeasurementClick = () => {
    setMeasurementActive(true)
    setMeasurementMode(null) // User chooses mode in the component
    setMeasurementPoints([])
  }

  const handleMeasurementClose = () => {
    setMeasurementActive(false)
    setMeasurementMode(null)
    setMeasurementPoints([])
    cleanupMeasurementLayers()
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
        devLog(`[Map] Deactivated category: ${category}`)
      } else {
        newCategories.add(category)
        devLog(`[Map] Activated category: ${category}`)
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
    setIsPlacingWaypoint(false) // Ensure mutually exclusive
    setRoutePoints([])
    // Clear existing drawing
    cleanupDrawingLayers()
  }

  const handleStartWaypointPlacement = () => {
    devLog('[Waypoint] Starting waypoint placement mode')
    setIsPlacingWaypoint(true)
    setIsDrawingRoute(false) // Ensure mutually exclusive
    // Clear any route drawing in progress
    setRoutePoints([])
    cleanupDrawingLayers()
  }

  const handleSelectRoute = (route: Route) => {
    // Clean up navigation markers when selecting a route
    cleanupNavigationMarkers()

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
    devLog('[Waypoints] Selecting waypoint:', waypoint.name, waypoint.id)
    devLog('[Waypoints] Current waypointMarkers:', Object.keys(waypointMarkers))

    // Clean up navigation markers when selecting a waypoint
    cleanupNavigationMarkers()

    // Navigate to waypoint on map
    if (map.current) {
      // Check if marker exists
      if (waypointMarkers[waypoint.id]) {
        devLog('[Waypoints] Marker exists for', waypoint.id)
      } else {
        devError('[Waypoints] Marker NOT found for', waypoint.id, '- creating new marker')
        // Create marker if it doesn't exist
        const el = document.createElement('div')
        el.className = 'waypoint-marker'
        el.innerHTML = '<span class="material-symbols-outlined">location_on</span>'

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'bottom' // Pin tip at coordinate
        })
          .setLngLat(waypoint.coordinates)
          .addTo(map.current)

        setWaypointMarkers(prev => ({ ...prev, [waypoint.id]: marker }))
      }

      // Navigate to waypoint
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

  const handleSaveWaypoint = async (name: string, category: string) => {
    if (!tempWaypointCoords) return

    try {
      // Save waypoint to database
      const waypoint = await routeService.createWaypoint({
        name,
        coordinates: tempWaypointCoords,
        icon: 'location_on',
        category: category || undefined
      })

      // Convert temporary marker to permanent marker
      if (tempWaypointMarker.current) {
        // Remove temporary marker
        tempWaypointMarker.current.remove()

        // Create permanent marker
        const el = document.createElement('div')
        el.className = 'waypoint-marker'
        el.innerHTML = '<span class="material-symbols-outlined">location_on</span>'

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'bottom'
        })
          .setLngLat(tempWaypointCoords)
          .addTo(map.current!)

        // Track permanent marker
        setWaypointMarkers(prev => ({ ...prev, [waypoint.id]: marker }))

        // Clean up temporary state
        tempWaypointMarker.current = null
        setTempWaypointCoords(null)
      }
    } catch (error) {
      devError('Failed to save waypoint:', error)
      alert('Kunne ikke lagre punkt')
    }
  }

  // Save route from route details sheet
  const handleSaveRoute = async (name: string, description: string) => {
    try {
      const distance = routeService.calculateDistance(routePoints)
      await routeService.createRoute({
        name,
        description: description || undefined,
        coordinates: routePoints,
        distance,
        waypoints: []
      })

      // Clean up drawing
      setIsDrawingRoute(false)
      setRoutePoints([])
      cleanupDrawingLayers()

      // Show success and open route sheet
      devLog('[Route] Route saved successfully:', name)
      setRouteSheetOpen(true)
    } catch (error) {
      devError('Failed to save route:', error)
      alert('Kunne ikke lagre ruten')
    }
  }

  // Handle editing a route
  const handleEditRoute = (route: Route) => {
    setEditingRoute(route)
    setRouteDetailsSheetOpen(true)
  }

  // Handle editing a waypoint
  const handleEditWaypoint = (waypoint: Waypoint) => {
    setEditingWaypoint(waypoint)
    setWaypointDetailsSheetOpen(true)
  }

  // Update existing route
  const handleUpdateRoute = async (name: string, description: string) => {
    if (!editingRoute) return

    try {
      await routeService.updateRoute(editingRoute.id, {
        name,
        description: description || undefined,
        updatedAt: Date.now()
      })

      devLog('[Route] Route updated successfully:', name)
      setEditingRoute(null)
      // Trigger RouteSheet to reload data
      setDataChangeTrigger(prev => prev + 1)
    } catch (error) {
      devError('Failed to update route:', error)
      alert('Kunne ikke oppdatere ruten')
    }
  }

  // Update existing waypoint
  const handleUpdateWaypoint = async (name: string, category: string) => {
    if (!editingWaypoint) return

    try {
      await routeService.updateWaypoint(editingWaypoint.id, {
        name,
        category: category || undefined,
        updatedAt: Date.now()
      })

      devLog('[Waypoint] Waypoint updated successfully:', name)
      setEditingWaypoint(null)
      // Trigger RouteSheet to reload data and re-group categories
      setDataChangeTrigger(prev => prev + 1)
    } catch (error) {
      devError('Failed to update waypoint:', error)
      alert('Kunne ikke oppdatere punktet')
    }
  }

  // Clear currently displayed route from map
  const handleClearMapRoute = () => {
    if (!map.current || !selectedRoute) return

    const lineSourceId = `route-${selectedRoute.id}-line`
    const pointsSourceId = `route-${selectedRoute.id}-points`
    const lineLayerId = `route-${selectedRoute.id}-line-layer`
    const pointsLayerId = `route-${selectedRoute.id}-points-layer`

    // Remove layers if they exist
    if (map.current.getLayer(lineLayerId)) {
      map.current.removeLayer(lineLayerId)
    }
    if (map.current.getLayer(pointsLayerId)) {
      map.current.removeLayer(pointsLayerId)
    }

    // Remove sources if they exist
    if (map.current.getSource(lineSourceId)) {
      map.current.removeSource(lineSourceId)
    }
    if (map.current.getSource(pointsSourceId)) {
      map.current.removeSource(pointsSourceId)
    }

    // Clear selected route state
    setSelectedRoute(null)

    devLog('[Map] Cleared route from map:', selectedRoute.name)
  }

  // Clear all waypoint markers from map
  const handleClearMapWaypoints = () => {
    // Remove all waypoint markers
    Object.values(waypointMarkers).forEach(marker => {
      marker.remove()
    })

    // Clear waypoint markers state
    setWaypointMarkers({})

    devLog('[Map] Cleared all waypoint markers from map')
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
            onMapPreferencesClick={handleMapPreferencesClick}
            onMeasurementClick={handleMeasurementClick}
            onWeatherClick={handleWeatherClick}
            onInstallClick={() => setInstallSheetOpen(true)}
            showInstall={!isInstalled && (canInstall || platform === 'ios')}
            visible={controlsVisible}
            sheetsOpen={searchSheetOpen || infoSheetOpen || downloadSheetOpen || routeSheetOpen || categorySheetOpen || poiDetailsSheetOpen || installSheetOpen || mapPreferencesSheetOpen || weatherSheetOpen}
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
                  onClick={() => {
                    // Open route details sheet to save with name and description
                    setRouteDetailsSheetOpen(true)
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

          {/* Measurement Tools */}
          <MeasurementTools
            isActive={measurementActive}
            onClose={handleMeasurementClose}
            mode={measurementMode}
            onModeChange={setMeasurementMode}
            points={measurementPoints}
            onPointsChange={setMeasurementPoints}
          />

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
              // Don't remove search marker - keep it visible
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
            onEditRoute={handleEditRoute}
            onEditWaypoint={handleEditWaypoint}
            onClearMapRoute={handleClearMapRoute}
            onClearMapWaypoints={handleClearMapWaypoints}
            onDataChanged={dataChangeTrigger}
            routesVisible={routesVisible}
            onToggleVisibility={() => setRoutesVisible(!routesVisible)}
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
          <WaypointDetailsSheet
            isOpen={waypointDetailsSheetOpen}
            onClose={() => {
              setWaypointDetailsSheetOpen(false)
              setEditingWaypoint(null)
              // Remove temporary marker if cancelled
              if (tempWaypointMarker.current) {
                tempWaypointMarker.current.remove()
                tempWaypointMarker.current = null
                setTempWaypointCoords(null)
              }
            }}
            onSave={editingWaypoint ? handleUpdateWaypoint : handleSaveWaypoint}
            coordinates={editingWaypoint ? editingWaypoint.coordinates : (tempWaypointCoords || [0, 0])}
            initialName={editingWaypoint?.name}
            initialCategory={editingWaypoint?.category}
            isEditing={!!editingWaypoint}
          />

          <RouteDetailsSheet
            isOpen={routeDetailsSheetOpen}
            onClose={() => {
              setRouteDetailsSheetOpen(false)
              setEditingRoute(null)
              // Don't clean up route points - user might want to continue editing
            }}
            onSave={editingRoute ? handleUpdateRoute : handleSaveRoute}
            distance={editingRoute ? editingRoute.distance : routeService.calculateDistance(routePoints)}
            pointCount={editingRoute ? editingRoute.coordinates.length : routePoints.length}
            initialName={editingRoute?.name}
            initialDescription={editingRoute?.description}
            isEditing={!!editingRoute}
          />

          <InstallSheet
            isOpen={installSheetOpen}
            onClose={() => setInstallSheetOpen(false)}
            onInstall={promptInstall}
            canInstall={canInstall}
            platform={platform}
          />

          <MapPreferencesSheet
            isOpen={mapPreferencesSheetOpen}
            onClose={() => setMapPreferencesSheetOpen(false)}
            onPreferencesChange={(newPreferences) => {
              setMapPreferences(newPreferences)
              setBaseLayer(newPreferences.baseLayer)
            }}
          />

          <WeatherSheet
            isOpen={weatherSheetOpen}
            onClose={() => setWeatherSheetOpen(false)}
            lat={userLocation?.coords.latitude || MAP_CONFIG.DEFAULT_CENTER[1]}
            lon={userLocation?.coords.longitude || MAP_CONFIG.DEFAULT_CENTER[0]}
          />

          {/* Weather widget - show when user has location and preference enabled */}
          {userLocation && mapPreferences.showWeatherWidget && (
            <WeatherWidget
              lat={userLocation.coords.latitude}
              lon={userLocation.coords.longitude}
              onExpand={() => setWeatherSheetOpen(true)}
            />
          )}
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
          {/* InfoPanel removed - using InfoSheet via FABMenu instead */}
        </>
      )}
      <div ref={mapContainer} className="map" />
    </div>
  )
}

export default Map
