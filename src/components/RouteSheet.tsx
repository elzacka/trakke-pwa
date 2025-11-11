import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { routeService, type Route, type Waypoint } from '../services/routeService'
import '../styles/RouteSheet.css'

interface RouteSheetProps {
  isOpen: boolean
  onClose: () => void
  onStartDrawing: () => void
  onStartWaypointPlacement: () => void
  onSelectRoute: (route: Route) => void
}

type ViewMode = 'list' | 'detail' | 'create'

const RouteSheet = ({
  isOpen,
  onClose,
  onStartDrawing,
  onStartWaypointPlacement,
  onSelectRoute
}: RouteSheetProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [routes, setRoutes] = useState<Route[]>([])
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load routes and waypoints when sheet opens
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [loadedRoutes, loadedWaypoints] = await Promise.all([
        routeService.getAllRoutes(),
        routeService.getAllWaypoints()
      ])
      setRoutes(loadedRoutes)
      setWaypoints(loadedWaypoints)
    } catch (error) {
      console.error('Failed to load routes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRoute = () => {
    setViewMode('create')
  }

  const handleStartDrawing = () => {
    onStartDrawing()
    onClose()
  }

  const handleStartWaypoint = () => {
    onStartWaypointPlacement()
    onClose()
  }

  const handleRouteClick = (route: Route) => {
    setSelectedRoute(route)
    setViewMode('detail')
    onSelectRoute(route)
  }

  const handleBack = () => {
    if (viewMode === 'detail' || viewMode === 'create') {
      setViewMode('list')
      setSelectedRoute(null)
    } else {
      onClose()
    }
  }

  const handleDeleteRoute = async (routeId: string) => {
    const confirmed = window.confirm('Er du sikker på at du vil slette denne ruten?')
    if (!confirmed) return

    try {
      await routeService.deleteRoute(routeId)
      await loadData()
      if (selectedRoute?.id === routeId) {
        setViewMode('list')
        setSelectedRoute(null)
      }
    } catch (error) {
      console.error('Failed to delete route:', error)
      alert('Kunne ikke slette ruten')
    }
  }

  const handleDeleteWaypoint = async (waypointId: string) => {
    const confirmed = window.confirm('Er du sikker på at du vil slette dette punktet?')
    if (!confirmed) return

    try {
      await routeService.deleteWaypoint(waypointId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete waypoint:', error)
      alert('Kunne ikke slette punktet')
    }
  }

  const formatDistance = (meters?: number) => {
    if (!meters) return '-'
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(1)} km`
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (hours > 0) return `${hours}t ${mins}m`
    return `${mins}m`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('no', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // List view
  const renderListView = () => (
    <div className="route-sheet">
      <div className="route-sheet-header">
        <h2>Ruter og punkter</h2>
        <button
          className="route-sheet-close"
          onClick={onClose}
          aria-label="Lukk"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="route-sheet-content">
        {isLoading ? (
          <div className="route-loading">
            <p>Laster...</p>
          </div>
        ) : (
          <>
            {/* Create buttons */}
            <section className="route-actions">
              <button
                type="button"
                className="route-action-button primary"
                onClick={handleStartDrawing}
              >
                <span className="material-symbols-outlined">route</span>
                <span>Tegn ny rute</span>
              </button>
              <button
                type="button"
                className="route-action-button"
                onClick={handleStartWaypoint}
              >
                <span className="material-symbols-outlined">location_on</span>
                <span>Legg til punkt</span>
              </button>
            </section>

            {/* Routes list */}
            <section className="route-section">
              <h3>Mine ruter ({routes.length})</h3>
              {routes.length > 0 && (
                <div className="route-list">
                  {routes.map((route) => (
                    <div
                      key={route.id}
                      className="route-item"
                      onClick={() => handleRouteClick(route)}
                    >
                      <div className="route-item-icon">
                        <span className="material-symbols-outlined">route</span>
                      </div>
                      <div className="route-item-content">
                        <div className="route-item-name">{route.name}</div>
                        <div className="route-item-meta">
                          {formatDistance(route.distance)} • {formatDate(route.createdAt)}
                        </div>
                      </div>
                      <button
                        className="route-item-delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteRoute(route.id)
                        }}
                        aria-label="Slett rute"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Waypoints list */}
            <section className="route-section">
              <h3>Mine punkter ({waypoints.length})</h3>
              {waypoints.length > 0 && (
                <div className="route-list">
                  {waypoints.map((waypoint) => (
                    <div
                      key={waypoint.id}
                      className="route-item"
                    >
                      <div className="route-item-icon">
                        <span className="material-symbols-outlined">
                          {waypoint.icon || 'location_on'}
                        </span>
                      </div>
                      <div className="route-item-content">
                        <div className="route-item-name">{waypoint.name}</div>
                        <div className="route-item-meta">
                          {formatDate(waypoint.createdAt)}
                        </div>
                      </div>
                      <button
                        className="route-item-delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteWaypoint(waypoint.id)
                        }}
                        aria-label="Slett punkt"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )

  // Detail view
  const renderDetailView = () => {
    if (!selectedRoute) return null

    return (
      <div className="route-sheet">
        <div className="route-sheet-header">
          <button
            className="route-sheet-back"
            onClick={handleBack}
            aria-label="Tilbake"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2>{selectedRoute.name}</h2>
          <button
            className="route-sheet-close"
            onClick={onClose}
            aria-label="Lukk"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="route-sheet-content">
          <div className="route-detail">
            {selectedRoute.description && (
              <p className="route-detail-description">{selectedRoute.description}</p>
            )}

            <div className="route-detail-stats">
              <div className="route-stat">
                <span className="route-stat-label">Distanse</span>
                <span className="route-stat-value">{formatDistance(selectedRoute.distance)}</span>
              </div>
              <div className="route-stat">
                <span className="route-stat-label">Varighet</span>
                <span className="route-stat-value">{formatDuration(selectedRoute.duration)}</span>
              </div>
              {selectedRoute.elevationGain && (
                <div className="route-stat">
                  <span className="route-stat-label">Stigning</span>
                  <span className="route-stat-value">{selectedRoute.elevationGain} m</span>
                </div>
              )}
              {selectedRoute.difficulty && (
                <div className="route-stat">
                  <span className="route-stat-label">Vanskelighet</span>
                  <span className="route-stat-value">
                    {selectedRoute.difficulty === 'easy' && 'Lett'}
                    {selectedRoute.difficulty === 'moderate' && 'Middels'}
                    {selectedRoute.difficulty === 'hard' && 'Krevende'}
                  </span>
                </div>
              )}
            </div>

            <div className="route-detail-meta">
              <p>Opprettet: {formatDate(selectedRoute.createdAt)}</p>
              {selectedRoute.completedAt && (
                <p>Fullført: {formatDate(selectedRoute.completedAt)}</p>
              )}
            </div>

            <div className="route-detail-actions">
              <button
                className="route-detail-button"
                onClick={() => handleDeleteRoute(selectedRoute.id)}
              >
                <span className="material-symbols-outlined">delete</span>
                <span>Slett rute</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={40}
      halfHeight={70}
      initialHeight="half"
    >
      {viewMode === 'list' && renderListView()}
      {viewMode === 'detail' && renderDetailView()}
    </BottomSheet>
  )
}

export default RouteSheet
