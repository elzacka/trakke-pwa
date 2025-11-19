import { useState, useEffect, useRef } from 'react'
import type { LngLatBounds } from 'maplibre-gl'
import Sheet from './Sheet'
import { offlineMapService, type DownloadArea, type DownloadProgress } from '../services/offlineMapService'
import '../styles/DownloadSheet.css'

interface DownloadSheetProps {
  isOpen: boolean
  onClose: () => void
  bounds: LngLatBounds | null
  zoom: number
  isSelecting: boolean
  onStartSelection: () => void
  onCancelSelection: () => void
  onNavigateToArea: (bounds: { north: number; south: number; east: number; west: number }) => void
}

type ViewMode = 'list' | 'configure' | 'downloading' | 'complete'

const DownloadSheet = ({
  isOpen,
  onClose,
  bounds,
  zoom,
  isSelecting,
  onStartSelection,
  onCancelSelection,
  onNavigateToArea
}: DownloadSheetProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [areaName, setAreaName] = useState('')
  const [minZoom, setMinZoom] = useState(Math.max(3, zoom - 2))
  const [maxZoom, setMaxZoom] = useState(Math.min(18, zoom + 2))
  const [downloadedAreas, setDownloadedAreas] = useState<DownloadArea[]>([])

  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true)
  const timeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      // Clear any pending timeouts on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Load downloaded areas when sheet opens
  useEffect(() => {
    if (isOpen && viewMode === 'list') {
      loadDownloadedAreas()
    }
  }, [isOpen, viewMode])

  // When bounds are set (after clicking "Neste"), switch to configure view
  useEffect(() => {
    // Only switch to configure if we're in list mode and bounds are newly set
    if (bounds && !isSelecting && isOpen && viewMode === 'list') {
      setViewMode('configure')
      setAreaName(`Område ${new Date().toLocaleDateString('nb-NO')}`)
      setMinZoom(Math.max(3, zoom - 2))
      setMaxZoom(Math.min(18, zoom + 2))
    }
  }, [bounds, isSelecting, isOpen, viewMode, zoom])

  // Reset to list view when sheet closes
  useEffect(() => {
    if (!isOpen && viewMode !== 'downloading') {
      setViewMode('list')
      setAreaName('')
    }
  }, [isOpen, viewMode])

  const loadDownloadedAreas = async () => {
    try {
      const areas = await offlineMapService.getDownloadedAreas()
      setDownloadedAreas(areas)
    } catch (error) {
      console.error('Failed to load downloaded areas:', error)
    }
  }

  const handleStartSelection = () => {
    onStartSelection()
    onClose() // Close sheet while selecting on map
  }

  const handleConfirmDownload = async () => {
    if (!bounds || !areaName.trim()) return

    const area: DownloadArea = {
      id: `area-${Date.now()}`,
      name: areaName.trim(),
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      },
      zoomLevels: {
        min: minZoom,
        max: maxZoom
      }
    }

    const tileCount = offlineMapService.calculateTileCount(area)
    const sizeMB = Math.round((tileCount * 15) / 1024)

    // Warn if large download
    if (tileCount > 1000) {
      const confirmed = window.confirm(
        `Dette vil laste ned ca. ${tileCount} kartfliser (~${sizeMB} MB). Fortsette?`
      )
      if (!confirmed) return
    }

    setIsDownloading(true)
    setViewMode('downloading')

    try {
      await offlineMapService.downloadArea(area, (p) => {
        setProgress(p)
      })

      // Download complete
      setIsDownloading(false)
      setViewMode('complete')

      // Wait to clear selection until after showing success and transitioning back
      timeoutRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          setViewMode('list')
          setProgress(null)
          loadDownloadedAreas()
          // Clear selection AFTER transitioning back to list
          onCancelSelection()
        }
      }, 2000)
    } catch (error) {
      console.error('Download error:', error)
      setIsDownloading(false)
      setViewMode('list')
      setProgress(null)
      alert('Nedlasting feilet')
      onCancelSelection()
    }
  }

  const handleDeleteArea = async (areaId: string) => {
    const confirmed = window.confirm('Er du sikker på at du vil slette dette området?')
    if (!confirmed) return

    try {
      await offlineMapService.deleteArea(areaId)
      await loadDownloadedAreas()
    } catch (error) {
      console.error('Failed to delete area:', error)
      alert('Kunne ikke slette området')
    }
  }

  const handleNavigateToArea = (area: DownloadArea) => {
    onNavigateToArea(area.bounds)
  }

  const handleCancel = () => {
    if (viewMode === 'configure') {
      setViewMode('list')
      onCancelSelection()
    }
  }

  const handleClose = () => {
    if (!isDownloading) {
      setViewMode('list')
      onCancelSelection()
      onClose()
    }
  }

  // Calculate estimated size for current configuration
  const getEstimatedInfo = () => {
    if (!bounds) return null

    const area: DownloadArea = {
      id: 'temp',
      name: '',
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      },
      zoomLevels: {
        min: minZoom,
        max: maxZoom
      }
    }

    const tileCount = offlineMapService.calculateTileCount(area)
    const sizeMB = Math.round((tileCount * 15) / 1024)

    return { tileCount, sizeMB }
  }

  const formatAreaSize = (bounds: { north: number; south: number; east: number; west: number }) => {
    // Convert degrees to approximate kilometers
    // At Norway's latitude (~60°N), 1° longitude ≈ 55 km, 1° latitude ≈ 111 km
    const avgLat = (bounds.north + bounds.south) / 2
    const latDegreeKm = 111 // ~111 km per degree latitude (constant)
    const lonDegreeKm = 111 * Math.cos((avgLat * Math.PI) / 180) // Varies by latitude

    const widthDegrees = Math.abs(bounds.east - bounds.west)
    const heightDegrees = Math.abs(bounds.north - bounds.south)

    const widthKm = widthDegrees * lonDegreeKm
    const heightKm = heightDegrees * latDegreeKm

    return `${widthKm.toFixed(1)} × ${heightKm.toFixed(1)} km`
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      peekHeight={40}
      halfHeight={70}
      initialHeight={viewMode === 'list' ? 'half' : 'half'}
    >
      <div className="download-sheet">
        <div className="download-sheet-content">
          {viewMode === 'downloading' ? (
            // Download in progress
            <div className="download-progress">
              <div className="progress-info">
                <span className="progress-text">
                  Laster ned {progress?.percentage ?? 0}%
                </span>
                <span className="progress-subtext">
                  {progress?.downloadedTiles ?? 0} / {progress?.totalTiles ?? 0} fliser
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress?.percentage ?? 0}%` }}
                />
              </div>
            </div>
          ) : viewMode === 'complete' ? (
            // Download complete
            <div className="download-complete">
              <span className="material-symbols-outlined success-icon">check_circle</span>
              <span className="success-text">Nedlasting fullført!</span>
            </div>
          ) : viewMode === 'configure' && bounds ? (
            // Configure download (after "Neste" clicked)
            <div className="download-configure">
              <div className="configure-section">
                <label htmlFor="area-name">Områdenavn</label>
                <input
                  id="area-name"
                  type="text"
                  className="area-name-input"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="Navn på området"
                />
              </div>

              <div className="configure-section">
                <label>Zoom-nivåer</label>
                <div className="zoom-inputs">
                  <div className="zoom-input-group">
                    <label htmlFor="min-zoom">Min</label>
                    <input
                      id="min-zoom"
                      type="number"
                      min="3"
                      max={maxZoom}
                      value={minZoom}
                      onChange={(e) => setMinZoom(parseInt(e.target.value))}
                    />
                  </div>
                  <span>til</span>
                  <div className="zoom-input-group">
                    <label htmlFor="max-zoom">Max</label>
                    <input
                      id="max-zoom"
                      type="number"
                      min={minZoom}
                      max="18"
                      value={maxZoom}
                      onChange={(e) => setMaxZoom(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="download-estimate">
                <span className="estimate-text">
                  {getEstimatedInfo()?.tileCount} fliser · ~{getEstimatedInfo()?.sizeMB} MB
                </span>
              </div>

              <div className="download-actions">
                <button className="download-button cancel" onClick={handleCancel}>
                  <span>Avbryt</span>
                </button>
                <button
                  className="download-button confirm"
                  onClick={handleConfirmDownload}
                  disabled={!areaName.trim()}
                >
                  <span className="material-symbols-outlined">download</span>
                  <span>Last ned</span>
                </button>
              </div>
            </div>
          ) : (
            // List view - show downloaded areas or "Velg område" button
            <div className="download-list">
              {downloadedAreas.length > 0 ? (
                <>
                  <div className="downloaded-areas">
                    {downloadedAreas.map((area) => (
                      <div key={area.id} className="area-item">
                        <div
                          className="area-info"
                          onClick={() => handleNavigateToArea(area)}
                        >
                          <span className="area-name">{area.name}</span>
                          <span className="area-details">
                            {formatAreaSize(area.bounds)} · Zoom {area.zoomLevels.min}-{area.zoomLevels.max}
                          </span>
                        </div>
                        <button
                          className="area-delete-button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteArea(area.id)
                          }}
                          aria-label="Slett"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="download-button primary" onClick={handleStartSelection}>
                    <span className="material-symbols-outlined">add</span>
                    <span>Last ned nytt område</span>
                  </button>
                </>
              ) : (
                <div className="download-initial">
                  <p className="empty-message">Ingen nedlastede områder</p>
                  <button className="download-button primary" onClick={handleStartSelection}>
                    <span className="material-symbols-outlined">download</span>
                    <span>Velg område</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}

export default DownloadSheet
