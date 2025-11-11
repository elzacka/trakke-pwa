import { useState } from 'react'
import type { LngLatBounds } from 'maplibre-gl'
import BottomSheet from './BottomSheet'
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
}

const DownloadSheet = ({
  isOpen,
  onClose,
  bounds,
  zoom,
  isSelecting,
  onStartSelection,
  onCancelSelection
}: DownloadSheetProps) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)

  const handleStartSelection = () => {
    onStartSelection()
    onClose() // Close sheet while selecting on map
  }

  const handleConfirmDownload = async () => {
    if (!bounds) return

    const area: DownloadArea = {
      id: `area-${Date.now()}`,
      name: `Nedlastet ${new Date().toLocaleDateString('no')}`,
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      },
      zoomLevels: {
        min: Math.max(3, zoom - 2),
        max: Math.min(18, zoom + 2)
      }
    }

    const tileCount = offlineMapService.calculateTileCount(area)

    // Warn if large download
    if (tileCount > 1000) {
      const confirm = window.confirm(
        `Dette vil laste ned ca. ${tileCount} kartfliser (~${Math.round((tileCount * 15) / 1024)} MB). Fortsette?`
      )
      if (!confirm) {
        handleCancel()
        return
      }
    }

    setIsDownloading(true)

    try {
      await offlineMapService.downloadArea(area, (p) => {
        setProgress(p)
      })

      // Download complete
      setTimeout(() => {
        setIsDownloading(false)
        setProgress(null)
        onCancelSelection()
      }, 1500)
    } catch (error) {
      console.error('Download error:', error)
      setIsDownloading(false)
      setProgress(null)
      alert('Nedlasting feilet')
    }
  }

  const handleCancel = () => {
    setIsDownloading(false)
    setProgress(null)
    onCancelSelection()
  }

  const handleClose = () => {
    if (!isDownloading) {
      handleCancel()
      onClose()
    }
  }

  // Calculate estimated size
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
        min: Math.max(3, zoom - 2),
        max: Math.min(18, zoom + 2)
      }
    }

    const tileCount = offlineMapService.calculateTileCount(area)
    const sizeMB = Math.round((tileCount * 15) / 1024)

    return { tileCount, sizeMB }
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      peekHeight={30}
      halfHeight={60}
      initialHeight="peek"
    >
      <div className="download-sheet">
        <div className="download-sheet-header">
          <h2>Last ned kart</h2>
          <button
            className="download-sheet-close"
            onClick={handleClose}
            aria-label="Lukk"
            disabled={isDownloading}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="download-sheet-content">
          {isDownloading && progress ? (
            // Download in progress
            <div className="download-progress">
              <div className="progress-info">
                <span className="progress-text">Laster ned {progress.percentage}%</span>
                <span className="progress-subtext">
                  {progress.downloadedTiles} / {progress.totalTiles} fliser
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          ) : isSelecting && bounds ? (
            // Area selected - show confirmation
            <>
              <div className="download-confirm">
                <div className="confirm-info">
                  <span className="confirm-text">
                    {getEstimatedInfo()?.tileCount} fliser · ~{getEstimatedInfo()?.sizeMB} MB
                  </span>
                  <span className="confirm-subtext">
                    Zoom nivå {zoom - 2} til {zoom + 2}
                  </span>
                </div>
              </div>
              <div className="download-actions">
                <button className="download-button cancel" onClick={handleCancel}>
                  <span className="material-symbols-outlined">close</span>
                  <span>Avbryt</span>
                </button>
                <button className="download-button confirm" onClick={handleConfirmDownload}>
                  <span className="material-symbols-outlined">download</span>
                  <span>Last ned</span>
                </button>
              </div>
            </>
          ) : isSelecting ? (
            // Selecting area
            <div className="download-instruction">
              <button className="download-button cancel" onClick={handleCancel}>
                Avbryt
              </button>
            </div>
          ) : (
            // Initial state
            <div className="download-initial">
              <button className="download-button primary" onClick={handleStartSelection}>
                <span className="material-symbols-outlined">download</span>
                <span>Velg område</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

export default DownloadSheet
