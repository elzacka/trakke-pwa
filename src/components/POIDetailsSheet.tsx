import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { poiService, type POI, type ShelterPOI } from '../services/poiService'
import '../styles/POIDetailsSheet.css'

interface POIDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  poi: POI | null
}

const POIDetailsSheet = ({ isOpen, onClose, poi }: POIDetailsSheetProps) => {
  const [copied, setCopied] = useState(false)

  if (!poi) return null

  // Map POI type to category (shelter -> shelters)
  const categoryMap: Record<string, 'shelters'> = {
    'shelter': 'shelters'
  }
  const category = categoryMap[poi.type] || 'shelters'
  const categoryConfig = poiService.getCategoryConfig(category)

  // Extract room number from name (e.g., "Tilfluktsrom 20292" -> "20292")
  const getRoomNumber = (name: string): string => {
    const match = name.match(/\d+/)
    return match ? match[0] : ''
  }

  const renderShelterDetails = (shelter: ShelterPOI) => {
    const handleCopyCoordinates = () => {
      const [lon, lat] = shelter.coordinates
      const coords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
      navigator.clipboard.writeText(coords)
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }

      // Show copied confirmation
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <>
        <div className="poi-details-info">
          <div className="poi-details-info-item">
            <span className="material-symbols-outlined">group</span>
            <div className="poi-details-info-label">Kapasitet</div>
            <div className="poi-details-info-value">
              {shelter.capacity} {shelter.capacity === 1 ? 'plass' : 'plasser'}
            </div>
          </div>
          <div className="poi-details-info-item">
            <span className="material-symbols-outlined">category</span>
            <div className="poi-details-info-label">Kategori</div>
            <div className="poi-details-info-value">{shelter.category}</div>
          </div>
          <div className="poi-details-info-item">
            <span className="material-symbols-outlined">location_on</span>
            <div className="poi-details-info-label">Adresse</div>
            <div className="poi-details-info-value">{shelter.address}</div>
          </div>
          <div className="poi-details-info-item poi-details-info-item-with-button">
            <span className="material-symbols-outlined">pin_drop</span>
            <div className="poi-details-info-label">Koordinater</div>
            <div className="poi-details-info-value">
              {shelter.coordinates[1].toFixed(5)}°N, {shelter.coordinates[0].toFixed(5)}°E
            </div>
            <button
              className={`poi-details-copy-button ${copied ? 'copied' : ''}`}
              onClick={handleCopyCoordinates}
              aria-label="Kopier koordinater"
            >
              <span className="material-symbols-outlined">
                {copied ? 'check' : 'content_copy'}
              </span>
            </button>
          </div>
        </div>
      </>
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
      <div className="poi-details-sheet">
        <div className="poi-details-header">
          <h2 className="poi-details-title">
            {categoryConfig.name} nr. {getRoomNumber(poi.name)}
          </h2>
          <button
            className="poi-details-close"
            onClick={onClose}
            aria-label="Lukk"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="poi-details-content">
          {poi.type === 'shelter' && renderShelterDetails(poi as ShelterPOI)}
        </div>
      </div>
    </BottomSheet>
  )
}

export default POIDetailsSheet
