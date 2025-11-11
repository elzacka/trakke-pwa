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
import { useAutoHide } from '../hooks/useAutoHide'
import type { SearchResult } from '../services/searchService'
import type { Route } from '../services/routeService'
import { routeService } from '../services/routeService'
import { poiService, type POICategory, type POI } from '../services/poiService'
import '../styles/Map.css'

interface MapProps {
  zenMode: boolean
}

const Map = ({ zenMode }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const userMarker = useRef<maplibregl.Marker | null>(null)
  const searchMarker = useRef<maplibregl.Marker | null>(null)
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

  // POI/Category state
  const [activePOIs, setActivePOIs] = useState<globalThis.Map<POICategory, POI[]>>(() => new globalThis.Map())
  const [poiMarkers, setPoiMarkers] = useState<maplibregl.Marker[]>([])
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null)

  // Route drawing state
  const [isDrawingRoute, setIsDrawingRoute] = useState(false)
  const [isPlacingWaypoint, setIsPlacingWaypoint] = useState(false)
  const [routePoints, setRoutePoints] = useState<Array<[number, number]>>([])
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)

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
      center: [10.7522, 59.9139], // Oslo, Norway
      zoom: 10,
      pitch: 60, // Default tilt (max is 85, 60 provides good 3D effect)
      maxZoom: 18,
      minZoom: 3,
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
      // Add custom clickable attribution with info icon in top-left
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

      map.current.addControl(new CustomAttributionControl(attributionContainer), 'top-left')
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

  // Handle Escape key to cancel drawing modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawingRoute) {
          setIsDrawingRoute(false)
          setRoutePoints([])
          cleanupDrawingLayers()
        } else if (isPlacingWaypoint) {
          setIsPlacingWaypoint(false)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDrawingRoute, isPlacingWaypoint])

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
  }, [isDrawingRoute, isPlacingWaypoint, routePoints, isSelectingArea])

  // Handle map clicks when selecting area, drawing routes, or placing waypoints
  const handleMapClick = async (e: maplibregl.MapMouseEvent) => {
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
      const name = prompt('Navn på punkt:')
      if (name) {
        try {
          await routeService.createWaypoint({
            name,
            coordinates: [e.lngLat.lng, e.lngLat.lat]
          })

          // Add marker to map
          const el = document.createElement('div')
          el.className = 'waypoint-marker'
          el.innerHTML = '<span class="material-symbols-outlined">location_on</span>'

          new maplibregl.Marker({ element: el })
            .setLngLat([e.lngLat.lng, e.lngLat.lat])
            .addTo(map.current!)

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
      // Create new marker
      const el = document.createElement('div')
      el.className = 'user-location-marker'
      el.innerHTML = '<span class="material-symbols-outlined">my_location</span>'

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

  // Add/remove drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleMouseMove)
      window.addEventListener('touchend', handleMouseUp)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        window.removeEventListener('touchmove', handleMouseMove)
        window.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [isDragging, overlayRect])

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
    setDownloadSheetOpen(true)
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

  const handleCategorySelect = async (category: POICategory) => {
    if (!map.current) return

    // Toggle category - if already active, remove it; otherwise add it
    const newActivePOIs = new globalThis.Map(activePOIs)

    if (newActivePOIs.has(category)) {
      // Remove category
      newActivePOIs.delete(category)

      // Remove markers for this category
      poiMarkers.forEach(marker => {
        const data = (marker as any)._poiData
        if (data && data.category === category) {
          marker.remove()
        }
      })
      setPoiMarkers(poiMarkers.filter(marker => {
        const data = (marker as any)._poiData
        return !data || data.category !== category
      }))
    } else {
      // Add category - fetch POIs
      const pois = await poiService.getPOIs(category)
      newActivePOIs.set(category, pois)

      // Add markers to map
      const newMarkers: maplibregl.Marker[] = []
      const categoryConfig = poiService.getCategoryConfig(category)

      pois.forEach(poi => {
        const el = document.createElement('div')
        el.className = 'poi-marker'
        el.innerHTML = `<span class="material-symbols-outlined" style="color: ${categoryConfig.color}">${categoryConfig.icon}</span>`

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(poi.coordinates)
          .addTo(map.current!)

        // Store POI data on marker for filtering
        ;(marker as any)._poiData = { category, id: poi.id }

        // Add click handler to show details
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          e.preventDefault()
          setSelectedPOI(poi)
          setPoiDetailsSheetOpen(true)
        })

        newMarkers.push(marker)
      })

      setPoiMarkers([...poiMarkers, ...newMarkers])
    }

    setActivePOIs(newActivePOIs)
  }

  const handleResetNorth = () => {
    if (map.current) {
      map.current.resetNorthPitch()
    }
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
      map.current.flyTo({
        center: route.coordinates[0],
        zoom: 13,
        essential: true
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
            onResetNorthClick={handleResetNorth}
            onSettingsClick={handleSettingsClick}
            visible={controlsVisible}
            sheetsOpen={searchSheetOpen || infoSheetOpen || downloadSheetOpen || routeSheetOpen || settingsSheetOpen || categorySheetOpen || poiDetailsSheetOpen}
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
                    const name = prompt('Navn på ruten:')
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
                    <strong>Velg nedlastingsområde</strong>
                    <span>Dra hjørnene for å endre størrelse</span>
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

              {/* Confirm button */}
              <button
                className="selection-confirm-button"
                onClick={handleConfirmSelection}
                aria-label="Bekreft valg"
              >
                <span className="material-symbols-outlined">check</span>
                <span>Bekreft</span>
              </button>
            </>
          )}

          <SearchSheet
            isOpen={searchSheetOpen}
            onClose={() => setSearchSheetOpen(false)}
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
          />
          <RouteSheet
            isOpen={routeSheetOpen}
            onClose={() => setRouteSheetOpen(false)}
            onStartDrawing={handleStartDrawing}
            onStartWaypointPlacement={handleStartWaypointPlacement}
            onSelectRoute={handleSelectRoute}
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
