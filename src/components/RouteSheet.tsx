import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import { routeService, type Route, type Waypoint, type Project } from '../services/routeService'
import { exportRouteToGpx, exportMultipleRoutesToGpx, downloadGpx, canExportRoute } from '../utils/gpxExport'
import { validateName } from '../utils/validation'
import elevationService, { type ElevationProfile } from '../services/elevationService'
import ElevationProfileChart from './ElevationProfileChart'
import { devLog, devError } from '../constants'
import '../styles/RouteSheet.css'

interface RouteSheetProps {
  isOpen: boolean
  onClose: () => void
  onStartDrawing: () => void
  onStartWaypointPlacement: () => void
  onSelectRoute: (route: Route) => void
  onSelectWaypoint: (waypoint: Waypoint) => void
  onDeleteRoute: (routeId: string) => void
  onDeleteWaypoint: (waypointId: string) => void
  onEditRoute: (route: Route) => void
  onEditWaypoint: (waypoint: Waypoint) => void
  onClearMapRoute: () => void
  onClearMapWaypoints: () => void
  onDataChanged?: number
  routesVisible: boolean
  onToggleVisibility: () => void
}

type ViewMode = 'list' | 'detail' | 'create'
type TabMode = 'routes' | 'projects'

const RouteSheet = ({
  isOpen,
  onClose,
  onStartDrawing,
  onStartWaypointPlacement,
  onSelectRoute,
  onSelectWaypoint,
  onDeleteRoute,
  onDeleteWaypoint,
  onEditRoute,
  onEditWaypoint,
  onClearMapRoute,
  onClearMapWaypoints,
  onDataChanged,
  routesVisible,
  onToggleVisibility
}: RouteSheetProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [tabMode, setTabMode] = useState<TabMode>('routes')
  const [routes, setRoutes] = useState<Route[]>([])
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [elevationProfile, setElevationProfile] = useState<ElevationProfile | null>(null)
  const [loadingElevation, setLoadingElevation] = useState(false)

  // Load routes and waypoints when sheet opens or data changes
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, onDataChanged])

  // Load elevation profile when route is selected
  useEffect(() => {
    if (!selectedRoute || !selectedRoute.coordinates || selectedRoute.coordinates.length < 2) {
      setElevationProfile(null)
      return
    }

    const loadElevation = async () => {
      setLoadingElevation(true)
      try {
        const profile = await elevationService.getElevationProfile(
          selectedRoute.id,
          selectedRoute.coordinates
        )
        setElevationProfile(profile)
      } catch (error) {
        devError('Failed to load elevation profile:', error)
        setElevationProfile(null)
      } finally {
        setLoadingElevation(false)
      }
    }

    loadElevation()
  }, [selectedRoute])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [loadedRoutes, loadedWaypoints, loadedProjects] = await Promise.all([
        routeService.getAllRoutes(),
        routeService.getAllWaypoints(),
        routeService.getAllProjects()
      ])
      setRoutes(loadedRoutes)
      setWaypoints(loadedWaypoints)
      setProjects(loadedProjects)
    } catch (error) {
      devError('Failed to load data:', error)
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
      setSelectedProject(null)
      setElevationProfile(null)
    } else {
      onClose()
    }
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setViewMode('detail')
  }

  const handleCreateProject = async () => {
    const inputName = window.prompt('Navn på prosjekt:')
    const name = validateName(inputName)
    if (!name) return

    try {
      await routeService.createProject({
        name,
        routes: [],
        waypoints: []
      })
      await loadData()
    } catch (error) {
      devError('Failed to create project:', error)
      alert('Kunne ikke opprette prosjekt')
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    const confirmed = window.confirm('Er du sikker på at du vil slette dette prosjektet?')
    if (!confirmed) return

    try {
      await routeService.deleteProject(projectId)
      await loadData()
      if (selectedProject?.id === projectId) {
        setViewMode('list')
        setSelectedProject(null)
      }
    } catch (error) {
      devError('Failed to delete project:', error)
      alert('Kunne ikke slette prosjektet')
    }
  }

  const handleAddRouteToProject = async (projectId: string, routeId: string) => {
    try {
      const project = await routeService.getProject(projectId)
      if (!project) throw new Error('Project not found')

      if (project.routes.includes(routeId)) {
        alert('Ruten er allerede i dette prosjektet')
        return
      }

      await routeService.updateProject(projectId, {
        routes: [...project.routes, routeId]
      })
      await loadData()
    } catch (error) {
      devError('Failed to add route to project:', error)
      alert('Kunne ikke legge til rute i prosjekt')
    }
  }

  const handleRemoveRouteFromProject = async (projectId: string, routeId: string) => {
    try {
      const project = await routeService.getProject(projectId)
      if (!project) throw new Error('Project not found')

      await routeService.updateProject(projectId, {
        routes: project.routes.filter(id => id !== routeId)
      })
      await loadData()
    } catch (error) {
      devError('Failed to remove route from project:', error)
      alert('Kunne ikke fjerne rute fra prosjekt')
    }
  }

  const handleExportRouteGpx = async (routeId: string) => {
    try {
      const route = routes.find(r => r.id === routeId)
      if (!route) throw new Error('Route not found')

      if (!canExportRoute(route)) {
        alert('Ruten må ha minst 2 punkter for å eksporteres')
        return
      }

      // Get waypoints for this route
      const routeWaypoints = waypoints.filter(wp =>
        route.waypoints && route.waypoints.includes(wp.id)
      )

      const gpxContent = exportRouteToGpx(route, routeWaypoints)
      downloadGpx(gpxContent, route.name)
    } catch (error) {
      devError('Failed to export GPX:', error)
      alert('Kunne ikke eksportere GPX')
    }
  }

  const handleExportProjectGpx = async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId)
      if (!project) throw new Error('Project not found')

      const projectRoutes = routes.filter(r => project.routes.includes(r.id))
      if (projectRoutes.length === 0) {
        alert('Prosjektet har ingen ruter å eksportere')
        return
      }

      const projectWaypoints = waypoints.filter(wp =>
        project.waypoints.includes(wp.id)
      )

      const gpxContent = exportMultipleRoutesToGpx(projectRoutes, projectWaypoints, project.name)
      downloadGpx(gpxContent, project.name)
    } catch (error) {
      devError('Failed to export project GPX:', error)
      alert('Kunne ikke eksportere prosjekt som GPX')
    }
  }

  const handleDeleteRoute = async (routeId: string) => {
    const confirmed = window.confirm('Er du sikker på at du vil slette denne ruten?')
    if (!confirmed) return

    try {
      await routeService.deleteRoute(routeId)
      onDeleteRoute(routeId) // Notify Map to remove from map
      await loadData()
      if (selectedRoute?.id === routeId) {
        setViewMode('list')
        setSelectedRoute(null)
      }
    } catch (error) {
      devError('Failed to delete route:', error)
      alert('Kunne ikke slette ruten')
    }
  }

  const handleDeleteWaypoint = async (waypointId: string) => {
    const confirmed = window.confirm('Er du sikker på at du vil slette dette punktet?')
    if (!confirmed) return

    try {
      await routeService.deleteWaypoint(waypointId)
      onDeleteWaypoint(waypointId) // Notify Map to remove from map
      await loadData()
    } catch (error) {
      devError('Failed to delete waypoint:', error)
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

  // Group waypoints by category
  const groupWaypointsByCategory = () => {
    const grouped = new Map<string, Waypoint[]>()

    waypoints.forEach(waypoint => {
      const category = waypoint.category || 'Ukategorisert'
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(waypoint)
    })

    // Sort categories alphabetically
    const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
      // Put "Ukategorisert" last
      if (a === 'Ukategorisert') return 1
      if (b === 'Ukategorisert') return -1
      return a.localeCompare(b, 'no')
    })

    return sortedCategories.map(category => ({
      category,
      waypoints: grouped.get(category)!
    }))
  }

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Initialize all categories as collapsed
  useEffect(() => {
    if (waypoints.length > 0 && collapsedCategories.size === 0) {
      const categories = new Set(waypoints.map(w => w.category || 'Ukategorisert'))
      setCollapsedCategories(categories)
    }
  }, [waypoints])

  // List view
  const renderListView = () => (
    <div className="route-sheet">
      {/* Tab switcher */}
      <div className="route-tabs">
        <button
          className={`route-tab ${tabMode === 'routes' ? 'active' : ''}`}
          onClick={() => setTabMode('routes')}
        >
          Ruter
        </button>
        <button
          className={`route-tab ${tabMode === 'projects' ? 'active' : ''}`}
          onClick={() => setTabMode('projects')}
        >
          Prosjekter
        </button>
      </div>

      <div className="route-sheet-content">
        {isLoading ? (
          <div className="route-loading">
            <p>Laster...</p>
          </div>
        ) : tabMode === 'routes' ? (
          <>
            {/* Routes Tab Content */}
            {/* Create buttons */}
            <section className="route-actions">
              <button
                type="button"
                className="trk-btn trk-btn--md trk-btn--primary"
                onClick={handleStartDrawing}
              >
                Tegn ny rute
              </button>
              <button
                type="button"
                className="trk-btn trk-btn--md trk-btn--secondary"
                onClick={handleStartWaypoint}
              >
                Legg til punkt
              </button>
            </section>

            {/* Clear map buttons */}
            <section className="route-actions">
              <button
                type="button"
                className="trk-btn trk-btn--md trk-btn--ghost"
                onClick={onClearMapRoute}
              >
                Fjern rute fra kart
              </button>
              <button
                type="button"
                className="trk-btn trk-btn--md trk-btn--ghost"
                onClick={() => {
                  devLog('[RouteSheet] Toggle button clicked, current routesVisible:', routesVisible)
                  onToggleVisibility()
                }}
              >
                {routesVisible ? 'Skjul punkter' : 'Vis punkter'}
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
                      <div className="route-item-actions">
                        <button
                          className="route-item-edit"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditRoute(route)
                          }}
                          aria-label="Rediger rute"
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
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
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Waypoints list - Hierarchical by category */}
            <section className="route-section">
              <h3>Mine punkter ({waypoints.length})</h3>
              {waypoints.length > 0 && (
                <div className="waypoint-categories">
                  {groupWaypointsByCategory().map(({ category, waypoints: categoryWaypoints }) => {
                    const isCollapsed = collapsedCategories.has(category)
                    return (
                      <div key={category} className="waypoint-category">
                        <button
                          className="category-header"
                          onClick={() => toggleCategory(category)}
                          aria-expanded={!isCollapsed}
                        >
                          <span className="material-symbols-outlined category-chevron">
                            {isCollapsed ? 'chevron_right' : 'expand_more'}
                          </span>
                          <span className="category-name">{category}</span>
                          <span className="category-count">({categoryWaypoints.length})</span>
                        </button>
                        {!isCollapsed && (
                          <div className="route-list">
                            {categoryWaypoints.map((waypoint) => (
                              <div
                                key={waypoint.id}
                                className="route-item"
                                onClick={() => onSelectWaypoint(waypoint)}
                                style={{ cursor: 'pointer' }}
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
                                <div className="route-item-actions">
                                  <button
                                    className="route-item-edit"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onEditWaypoint(waypoint)
                                    }}
                                    aria-label="Rediger punkt"
                                  >
                                    <span className="material-symbols-outlined">edit</span>
                                  </button>
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
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            {/* Projects Tab Content */}
            <section className="route-actions">
              <button
                type="button"
                className="trk-btn trk-btn--md trk-btn--primary"
                onClick={handleCreateProject}
              >
                Nytt prosjekt
              </button>
            </section>

            {/* Projects list */}
            <section className="route-section">
              <h3>Mine prosjekter ({projects.length})</h3>
              {projects.length > 0 ? (
                <div className="route-list">
                  {projects.map((project) => {
                    const projectRoutes = routes.filter(r => project.routes.includes(r.id))
                    const projectWaypoints = waypoints.filter(w => project.waypoints.includes(w.id))

                    return (
                      <div
                        key={project.id}
                        className="route-item"
                        onClick={() => handleProjectClick(project)}
                      >
                        <div className="route-item-icon">
                          <span className="material-symbols-outlined">folder</span>
                        </div>
                        <div className="route-item-content">
                          <div className="route-item-name">{project.name}</div>
                          <div className="route-item-meta">
                            {projectRoutes.length} {projectRoutes.length === 1 ? 'rute' : 'ruter'} • {projectWaypoints.length} {projectWaypoints.length === 1 ? 'punkt' : 'punkter'}
                          </div>
                        </div>
                        <div className="route-item-actions">
                          <button
                            className="route-item-delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteProject(project.id)
                            }}
                            aria-label="Slett prosjekt"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="route-empty-state">Ingen prosjekter ennå. Opprett et prosjekt for å organisere ruter og punkter.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )

  // Project Detail View
  const renderProjectDetail = (project: Project) => {
    const projectRoutes = routes.filter(r => project.routes.includes(r.id))
    const projectWaypoints = waypoints.filter(w => project.waypoints.includes(w.id))

    return (
      <div className="route-sheet">
        <div className="route-sheet-content">
          <div className="route-detail">
            {project.description && (
              <p className="route-detail-description">{project.description}</p>
            )}

            <div className="route-detail-stats">
              <div className="route-stat">
                <span className="route-stat-label">Ruter</span>
                <span className="route-stat-value">{projectRoutes.length}</span>
              </div>
              <div className="route-stat">
                <span className="route-stat-label">Punkter</span>
                <span className="route-stat-value">{projectWaypoints.length}</span>
              </div>
            </div>

            <div className="route-detail-meta">
              <p>Opprettet: {formatDate(project.createdAt)}</p>
            </div>

            {/* Routes in project */}
            {projectRoutes.length > 0 && (
              <section className="route-section">
                <h3>Ruter i prosjekt</h3>
                <div className="route-list">
                  {projectRoutes.map((route) => (
                    <div key={route.id} className="route-item">
                      <div className="route-item-icon">
                        <span className="material-symbols-outlined">route</span>
                      </div>
                      <div className="route-item-content">
                        <div className="route-item-name">{route.name}</div>
                        <div className="route-item-meta">
                          {formatDistance(route.distance)}
                        </div>
                      </div>
                      <div className="route-item-actions">
                        <button
                          className="route-item-delete"
                          onClick={() => handleRemoveRouteFromProject(project.id, route.id)}
                          aria-label="Fjern fra prosjekt"
                        >
                          <span className="material-symbols-outlined">remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="route-detail-actions">
              {projectRoutes.length > 0 && (
                <button
                  className="trk-btn trk-btn--md trk-btn--primary"
                  onClick={() => handleExportProjectGpx(project.id)}
                >
                  Eksporter GPX
                </button>
              )}
              <button
                className="trk-btn trk-btn--md trk-btn--danger"
                onClick={() => handleDeleteProject(project.id)}
              >
                Slett prosjekt
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Route Detail View
  const renderRouteDetail = (route: Route) => {
    return (
      <div className="route-sheet">
        <div className="route-sheet-content">
          <div className="route-detail">
            {route.description && (
              <p className="route-detail-description">{route.description}</p>
            )}

            <div className="route-detail-stats">
              <div className="route-stat">
                <span className="route-stat-label">Distanse</span>
                <span className="route-stat-value">{formatDistance(route.distance)}</span>
              </div>
              <div className="route-stat">
                <span className="route-stat-label">Varighet</span>
                <span className="route-stat-value">{formatDuration(route.duration)}</span>
              </div>
              {route.elevationGain && (
                <div className="route-stat">
                  <span className="route-stat-label">Stigning</span>
                  <span className="route-stat-value">{route.elevationGain} m</span>
                </div>
              )}
              {route.difficulty && (
                <div className="route-stat">
                  <span className="route-stat-label">Vanskelighet</span>
                  <span className="route-stat-value">
                    {route.difficulty === 'easy' && 'Lett'}
                    {route.difficulty === 'moderate' && 'Middels'}
                    {route.difficulty === 'hard' && 'Krevende'}
                  </span>
                </div>
              )}
            </div>

            <div className="route-detail-meta">
              <p>Opprettet: {formatDate(route.createdAt)}</p>
              {route.completedAt && (
                <p>Fullført: {formatDate(route.completedAt)}</p>
              )}
            </div>

            {/* Elevation Profile Section */}
            {route.coordinates && route.coordinates.length >= 2 && (
              <section className="route-section" style={{ marginTop: '24px' }}>
                <h3>Høydeprofil</h3>
                {loadingElevation && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    <p>Laster høydedata...</p>
                  </div>
                )}
                {!loadingElevation && elevationProfile && (
                  <>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      marginBottom: '16px',
                      fontSize: '13px'
                    }}>
                      <div>
                        <span style={{ color: '#6b7280' }}>Stigning:</span>{' '}
                        <strong>{elevationProfile.statistics.totalGain} m</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Nedstigning:</span>{' '}
                        <strong>{elevationProfile.statistics.totalLoss} m</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Min høyde:</span>{' '}
                        <strong>{elevationProfile.statistics.minElevation} m</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Maks høyde:</span>{' '}
                        <strong>{elevationProfile.statistics.maxElevation} m</strong>
                      </div>
                    </div>
                    <ElevationProfileChart
                      elevations={elevationProfile.points.map(p => p.z)}
                      distances={elevationService.getCumulativeDistances(elevationProfile.points)}
                    />
                  </>
                )}
                {!loadingElevation && !elevationProfile && (
                  <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                    Kunne ikke laste høydedata
                  </p>
                )}
              </section>
            )}

            <div className="route-detail-actions">
              <button
                className="trk-btn trk-btn--md trk-btn--primary"
                onClick={() => handleExportRouteGpx(route.id)}
                disabled={!canExportRoute(route)}
              >
                Eksporter GPX
              </button>
              <button
                className="trk-btn trk-btn--md trk-btn--danger"
                onClick={() => handleDeleteRoute(route.id)}
              >
                Slett rute
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={40}
      halfHeight={50}
      initialHeight="half"
    >
      <button className="sheet-close-button" onClick={onClose} aria-label="Lukk ruter og punkter">
        <span className="material-symbols-outlined">close</span>
      </button>
      {viewMode === 'list' && renderListView()}
      {viewMode === 'detail' && selectedRoute && renderRouteDetail(selectedRoute)}
      {viewMode === 'detail' && selectedProject && renderProjectDetail(selectedProject)}
    </Sheet>
  )
}

export default RouteSheet
