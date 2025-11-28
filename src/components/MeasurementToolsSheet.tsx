import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import { measurementService } from '../services/measurementService'
import '../styles/MeasurementToolsSheet.css'

export type MeasurementMode = 'distance' | 'area' | null

interface MeasurementToolsSheetProps {
  isActive: boolean
  onClose: () => void
  mode: MeasurementMode
  onModeChange: (mode: MeasurementMode) => void
  points: Array<[number, number]>
  onPointsChange: (points: Array<[number, number]>) => void
}

const MeasurementToolsSheet = ({
  isActive,
  onClose,
  mode,
  onModeChange,
  points,
  onPointsChange
}: MeasurementToolsSheetProps) => {
  const [measurement, setMeasurement] = useState<string>('')

  // Calculate measurement whenever points change
  useEffect(() => {
    if (!mode || points.length === 0) {
      setMeasurement('')
      return
    }

    if (mode === 'distance') {
      if (points.length < 2) {
        setMeasurement('')
      } else {
        const distance = measurementService.calculatePolylineDistance(points)
        setMeasurement(measurementService.formatDistance(distance))
      }
    } else if (mode === 'area') {
      if (points.length < 3) {
        setMeasurement('')
      } else {
        const area = measurementService.calculatePolygonArea(points)
        setMeasurement(measurementService.formatArea(area))
      }
    }
  }, [points, mode])

  const handleClear = () => {
    onPointsChange([])
    setMeasurement('')
  }

  const handleUndo = () => {
    if (points.length > 0) {
      onPointsChange(points.slice(0, -1))
    }
  }

  return (
    <Sheet
      isOpen={isActive}
      onClose={onClose}
      peekHeight={40}
      halfHeight={50}
      initialHeight="peek"
      showBackdrop={false}
    >
      <button className="sheet-close-button" onClick={onClose} aria-label="Lukk måleverktøy">
        <span className="material-symbols-outlined">close</span>
      </button>
      <div className="measurement-tools">
        <div className="measurement-content">
        {!mode ? (
          <div className="measurement-mode-selector">
            <p className="measurement-instruction">Velg måletype:</p>
            <div className="measurement-mode-buttons">
              <button
                className="trk-btn trk-btn--md trk-btn--primary"
                onClick={() => onModeChange('distance')}
              >
                Avstand
              </button>
              <button
                className="trk-btn trk-btn--md trk-btn--secondary"
                onClick={() => onModeChange('area')}
              >
                Areal
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="measurement-info">
              <p className="measurement-instruction">
                {mode === 'distance'
                  ? 'Klikk på kartet for å legge til punkter'
                  : 'Klikk på kartet for å tegne polygon'}
              </p>
              {points.length > 0 && (
                <div className="measurement-stats">
                  <div className="measurement-stat">
                    <span className="stat-label">Punkter:</span>
                    <span className="stat-value">{points.length}</span>
                  </div>
                  {measurement && (
                    <div className="measurement-result">
                      <span className="result-label">
                        {mode === 'distance' ? 'Avstand:' : 'Areal:'}
                      </span>
                      <span className="result-value">{measurement}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="measurement-actions">
              <button
                className="trk-btn trk-btn--md trk-btn--ghost"
                onClick={() => onModeChange(null)}
                disabled={points.length > 0}
              >
                Bytt modus
              </button>
              {points.length > 0 && (
                <>
                  <button
                    className="trk-btn trk-btn--md trk-btn--ghost"
                    onClick={handleUndo}
                  >
                    Angre
                  </button>
                  <button
                    className="trk-btn trk-btn--md trk-btn--ghost"
                    onClick={handleClear}
                  >
                    Nullstill
                  </button>
                </>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </Sheet>
  )
}

export default MeasurementToolsSheet
