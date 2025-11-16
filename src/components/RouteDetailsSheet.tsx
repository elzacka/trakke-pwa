import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import '../styles/WaypointDetailsSheet.css'

interface RouteDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description: string) => void
  distance?: number // Distance in meters
  pointCount: number // Number of points in route
  initialName?: string
  initialDescription?: string
  isEditing?: boolean
}

const RouteDetailsSheet = ({
  isOpen,
  onClose,
  onSave,
  distance,
  pointCount,
  initialName = '',
  initialDescription = '',
  isEditing = false
}: RouteDetailsSheetProps) => {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setDescription(initialDescription)
    }
  }, [isOpen, initialName, initialDescription])

  const handleSave = () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      alert('Navn kan ikke være tomt')
      return
    }

    // Sanitize HTML/script tags
    const sanitizedName = trimmedName.replace(/<[^>]*>/g, '')
    const sanitizedDescription = description.trim().replace(/<[^>]*>/g, '')

    if (sanitizedName !== trimmedName) {
      alert('Ugyldige tegn i navn')
      return
    }

    onSave(sanitizedName, sanitizedDescription)
    onClose()
  }

  const handleCancel = () => {
    setName(initialName)
    setDescription(initialDescription)
    onClose()
  }

  const formatDistance = (meters?: number) => {
    if (!meters) return '-'
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(1)} km`
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleCancel}
      peekHeight={40}
      halfHeight={70}
      initialHeight="half"
    >
      <div className="waypoint-details-sheet">
        <div className="waypoint-details-header">
          <h2>{isEditing ? 'Rediger rute' : 'Ny rute'}</h2>
          <button
            className="waypoint-details-close"
            onClick={handleCancel}
            aria-label="Lukk"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="waypoint-details-content">
          <div className="waypoint-details-form">
            <div className="form-group">
              <label htmlFor="route-name">Navn *</label>
              <input
                id="route-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="F.eks. Tur til Kolsåstoppen, Søndagstur..."
                maxLength={100}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="route-description">Beskrivelse (valgfritt)</label>
              <textarea
                id="route-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="F.eks. Fin utsiktstur med lett terreng..."
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Ruteinformasjon</label>
              <div className="route-info-display">
                <div className="route-info-item">
                  <span className="route-info-label">Distanse:</span>
                  <span className="route-info-value">{formatDistance(distance)}</span>
                </div>
                <div className="route-info-item">
                  <span className="route-info-label">Punkter:</span>
                  <span className="route-info-value">{pointCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="waypoint-details-actions">
            <button
              className="waypoint-action-button secondary"
              onClick={handleCancel}
            >
              Avbryt
            </button>
            <button
              className="waypoint-action-button primary"
              onClick={handleSave}
            >
              Lagre
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

export default RouteDetailsSheet
