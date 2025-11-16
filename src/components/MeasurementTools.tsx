import { useState, useEffect } from 'react'
import { measurementService } from '../services/measurementService'
import '../styles/MeasurementTools.css'

export type MeasurementMode = 'distance' | 'area' | null

interface MeasurementToolsProps {
  isActive: boolean
  onClose: () => void
  mode: MeasurementMode
  onModeChange: (mode: MeasurementMode) => void
  points: Array<[number, number]>
  onPointsChange: (points: Array<[number, number]>) => void
}

const MeasurementTools = ({
  isActive,
  onClose,
  mode,
  onModeChange,
  points,
  onPointsChange
}: MeasurementToolsProps) => {
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

  if (!isActive) return null

  return (
    <div className="measurement-tools">
      <div className="measurement-header">
        <div className="measurement-title">
          <span className="material-symbols-outlined">
            {mode === 'distance' ? 'straighten' : 'square_foot'}
          </span>
          <h3>{mode === 'distance' ? 'Måle avstand' : 'Måle areal'}</h3>
        </div>
        <button
          className="measurement-close"
          onClick={onClose}
          aria-label="Lukk"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="measurement-content">
        {!mode ? (
          <div className="measurement-mode-selector">
            <p className="measurement-instruction">Velg måletype:</p>
            <div className="measurement-mode-buttons">
              <button
                className="measurement-mode-button"
                onClick={() => onModeChange('distance')}
              >
                <span className="material-symbols-outlined">straighten</span>
                <span>Avstand</span>
              </button>
              <button
                className="measurement-mode-button"
                onClick={() => onModeChange('area')}
              >
                <span className="material-symbols-outlined">square_foot</span>
                <span>Areal</span>
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
                className="measurement-action-button secondary"
                onClick={() => onModeChange(null)}
                disabled={points.length > 0}
              >
                <span className="material-symbols-outlined">swap_horiz</span>
                <span>Bytt modus</span>
              </button>
              {points.length > 0 && (
                <>
                  <button
                    className="measurement-action-button secondary"
                    onClick={handleUndo}
                  >
                    <span className="material-symbols-outlined">undo</span>
                    <span>Angre</span>
                  </button>
                  <button
                    className="measurement-action-button secondary"
                    onClick={handleClear}
                  >
                    <span className="material-symbols-outlined">clear</span>
                    <span>Nullstill</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MeasurementTools
