import BottomSheet from './BottomSheet'
import { poiService, type POI, type ShelterPOI } from '../services/poiService'
import '../styles/POIDetailsSheet.css'

interface POIDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  poi: POI | null
}

const POIDetailsSheet = ({ isOpen, onClose, poi }: POIDetailsSheetProps) => {
  if (!poi) return null

  // Map POI type to category (shelter -> shelters)
  const categoryMap: Record<string, 'shelters'> = {
    'shelter': 'shelters'
  }
  const category = categoryMap[poi.type] || 'shelters'
  const categoryConfig = poiService.getCategoryConfig(category)

  const renderShelterDetails = (shelter: ShelterPOI) => (
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
        <div className="poi-details-info-item">
          <span className="material-symbols-outlined">pin_drop</span>
          <div className="poi-details-info-label">Koordinater</div>
          <div className="poi-details-info-value">
            {shelter.coordinates[1].toFixed(5)}°N, {shelter.coordinates[0].toFixed(5)}°E
          </div>
        </div>
      </div>
    </>
  )

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
          <div className="poi-details-header-icon" style={{ color: categoryConfig.color }}>
            <span className="material-symbols-outlined">{categoryConfig.icon}</span>
          </div>
          <div className="poi-details-header-info">
            <div className="poi-details-category">{categoryConfig.name}</div>
            <h2 className="poi-details-title">{poi.name}</h2>
          </div>
        </div>

        <div className="poi-details-content">
          {poi.type === 'shelter' && renderShelterDetails(poi as ShelterPOI)}

          <div className="poi-details-actions">
            <button
              className="poi-details-action-button"
              onClick={() => {
                const [lon, lat] = poi.coordinates
                const coords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
                navigator.clipboard.writeText(coords)
                if ('vibrate' in navigator) {
                  navigator.vibrate(10)
                }
              }}
            >
              <span className="material-symbols-outlined">content_copy</span>
              <span>Kopier koordinater</span>
            </button>
          </div>

          <div className="poi-details-source">
            Data fra DSB
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

export default POIDetailsSheet
