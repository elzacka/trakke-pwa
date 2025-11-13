import { useState } from 'react'
import type { LngLatBounds } from 'maplibre-gl'
import { offlineMapService, type DownloadArea, type DownloadProgress } from '../services/offlineMapService'
import '../styles/DownloadControl.css'

interface DownloadControlProps {
  bounds: LngLatBounds | null
  zoom: number
  onStartSelection: () => void
  onCancelSelection: () => void
}

const DownloadControl = ({
  bounds,
  zoom,
  onStartSelection,
  onCancelSelection
}: DownloadControlProps) => {
  const [isSelecting, setIsSelecting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)

  const handleStartSelection = () => {
    setIsSelecting(true)
    onStartSelection()
  }

  const handleConfirmDownload = async () => {
    if (!bounds) return

    const area: DownloadArea = {
      id: `area-${Date.now()}`,
      name: `Nedlastet ${new Date().toLocaleDateString('nb-NO')}`,
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

    // Confirm if large download
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
    setIsSelecting(false)

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
    setIsSelecting(false)
    setIsDownloading(false)
    setProgress(null)
    onCancelSelection()
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

  if (isDownloading && progress) {
    return (
      <div className="download-progress-panel">
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
    )
  }

  if (isSelecting && bounds) {
    const info = getEstimatedInfo()
    return (
      <div className="download-confirm-panel">
        <div className="confirm-info">
          <span className="confirm-text">
            {info?.tileCount} fliser · ~{info?.sizeMB} MB
          </span>
          <span className="confirm-subtext">Zoom {zoom - 2} til {zoom + 2}</span>
        </div>
        <div className="confirm-actions">
          <button className="confirm-button cancel" onClick={handleCancel}>
            <span className="material-symbols-outlined">close</span>
          </button>
          <button className="confirm-button download" onClick={handleConfirmDownload}>
            <span className="material-symbols-outlined">download</span>
          </button>
        </div>
      </div>
    )
  }

  if (isSelecting) {
    return (
      <div className="download-instruction-panel">
        <span className="instruction-text">Trykk to hjørner på kartet</span>
        <button className="instruction-cancel" onClick={handleCancel}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    )
  }

  return (
    <button
      className="download-toggle"
      onClick={handleStartSelection}
      title="Last ned kart for frakoblet bruk"
      aria-label="Last ned kart"
    >
      <span className="material-symbols-outlined">download</span>
    </button>
  )
}

export default DownloadControl
