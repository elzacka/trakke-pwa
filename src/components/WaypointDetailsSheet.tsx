import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import { coordinateService, type CoordinateFormat } from '../services/coordinateService'
import { mapPreferencesService } from '../services/mapPreferencesService'
import '../styles/WaypointDetailsSheet.css'

interface WaypointDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, category: string) => void
  coordinates: [number, number] // [lon, lat]
  initialName?: string
  initialCategory?: string
  isEditing?: boolean
}

const WaypointDetailsSheet = ({
  isOpen,
  onClose,
  onSave,
  coordinates,
  initialName = '',
  initialCategory = '',
  isEditing = false
}: WaypointDetailsSheetProps) => {
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState(initialCategory)
  const [coordinateFormat, setCoordinateFormat] = useState<CoordinateFormat>('DD')

  // Load coordinate format preference
  useEffect(() => {
    const preferences = mapPreferencesService.getPreferences()
    setCoordinateFormat(preferences.coordinateFormat)
  }, [])

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setCategory(initialCategory)
    }
  }, [isOpen, initialName, initialCategory])

  const handleSave = () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      alert('Navn kan ikke være tomt')
      return
    }

    // Sanitize HTML/script tags
    const sanitizedName = trimmedName.replace(/<[^>]*>/g, '')
    const sanitizedCategory = category.trim().replace(/<[^>]*>/g, '')

    if (sanitizedName !== trimmedName) {
      alert('Ugyldige tegn i navn')
      return
    }

    onSave(sanitizedName, sanitizedCategory)
    onClose()
  }

  const handleCancel = () => {
    setName(initialName)
    setCategory(initialCategory)
    onClose()
  }

  const [lon, lat] = coordinates
  const formattedCoord = coordinateService.format(lon, lat, coordinateFormat)

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleCancel}
      peekHeight={40}
      halfHeight={50}
      initialHeight="half"
    >
      <button className="sheet-close-button" onClick={handleCancel} aria-label="Lukk punktdetaljer">
        <span className="material-symbols-outlined">close</span>
      </button>
      <div className="waypoint-details-sheet">
        <div className="waypoint-details-header">
          <h2>{isEditing ? 'Rediger punkt' : 'Nytt punkt'}</h2>
        </div>

        <div className="waypoint-details-content">
          <div className="waypoint-details-form">
            <div className="form-group">
              <label htmlFor="waypoint-name">Navn *</label>
              <input
                id="waypoint-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="F.eks. Utsiktspunkt, Rasteplass..."
                maxLength={100}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="waypoint-category">Kategori (valgfritt)</label>
              <input
                id="waypoint-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="F.eks. Hengekøyeplass, Bålplass..."
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>Koordinater</label>
              <div className="coordinates-display">
                <div className="coordinate-value">{formattedCoord.display}</div>
                <button
                  className="copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(formattedCoord.copyText)
                    // Visual feedback
                    const btn = document.querySelector('.copy-button')
                    if (btn) {
                      btn.textContent = 'Kopiert!'
                      setTimeout(() => {
                        const iconSpan = document.createElement('span')
                        iconSpan.className = 'material-symbols-outlined'
                        iconSpan.textContent = 'content_copy'
                        btn.textContent = ''
                        btn.appendChild(iconSpan)
                      }, 1500)
                    }
                  }}
                  aria-label="Kopier koordinater"
                >
                  <span className="material-symbols-outlined">content_copy</span>
                </button>
              </div>
              <div className="coordinate-hint">Format: {coordinateService.getFormatName(coordinateFormat)}</div>
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
    </Sheet>
  )
}

export default WaypointDetailsSheet
