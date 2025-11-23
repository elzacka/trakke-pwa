import { useState } from 'react'
import Sheet from './Sheet'
import { poiService, type POI, type ShelterPOI, type CavePOI, type ObservationTowerPOI, type WarMemorialPOI, type WildernessShelterPOI, type KulturminnerPOI } from '../services/poiService'
import '../styles/POIDetailsSheet.css'

interface POIDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  poi: POI | null
}

const POIDetailsSheet = ({ isOpen, onClose, poi }: POIDetailsSheetProps) => {
  const [copied, setCopied] = useState(false)

  if (!poi) return null

  // Map POI type to category
  const categoryMap: Record<string, 'shelters' | 'caves' | 'observation_towers' | 'war_memorials' | 'wilderness_shelters' | 'kulturminner'> = {
    'shelter': 'shelters',
    'cave': 'caves',
    'observation_tower': 'observation_towers',
    'war_memorial': 'war_memorials',
    'wilderness_shelter': 'wilderness_shelters',
    'kulturminner': 'kulturminner'
  }
  const category = categoryMap[poi.type] || 'shelters'
  const categoryConfig = poiService.getCategoryConfig(category)

  // Extract room number from name (e.g., "Tilfluktsrom 20292" -> "20292")
  const getRoomNumber = (name: string): string => {
    const match = name.match(/\d+/)
    return match ? match[0] : ''
  }

  /**
   * Render POI details for all categories
   *
   * DESIGN DECISION (2025-11-17):
   * - NO Material Symbol icons in POI detail items
   * - Clean, text-only information display
   * - Copy button icon is the ONLY exception (functional purpose)
   *
   * IMPORTANT: When adding new POI categories in the future:
   * - DO NOT add icons to info items (no <span className="material-symbols-outlined">)
   * - Only show: label + value in a two-column grid layout
   * - Keep the copy button on coordinates row (it's functional, not decorative)
   */
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
            <div className="poi-details-info-label">Kapasitet</div>
            <div className="poi-details-info-value">
              {shelter.capacity} {shelter.capacity === 1 ? 'plass' : 'plasser'}
            </div>
          </div>
          <div className="poi-details-info-item">
            <div className="poi-details-info-label">Kategori</div>
            <div className="poi-details-info-value">{shelter.category}</div>
          </div>
          <div className="poi-details-info-item">
            <div className="poi-details-info-label">Adresse</div>
            <div className="poi-details-info-value">{shelter.address}</div>
          </div>
          <div className="poi-details-info-item poi-details-info-item-with-button">
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

  const renderCaveDetails = (cave: CavePOI) => {
    const handleCopyCoordinates = () => {
      const [lon, lat] = cave.coordinates
      const coords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
      navigator.clipboard.writeText(coords)
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <>
        <div className="poi-details-info">
          <div className="poi-details-info-item">
            <div className="poi-details-info-label">Navn</div>
            <div className="poi-details-info-value">{cave.name}</div>
          </div>
          {cave.description && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Beskrivelse</div>
              <div className="poi-details-info-value">{cave.description}</div>
            </div>
          )}
          <div className="poi-details-info-item poi-details-info-item-with-button">
            <div className="poi-details-info-label">Koordinater</div>
            <div className="poi-details-info-value">
              {cave.coordinates[1].toFixed(5)}°N, {cave.coordinates[0].toFixed(5)}°E
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

  const renderObservationTowerDetails = (tower: ObservationTowerPOI) => {
    const handleCopyCoordinates = () => {
      const [lon, lat] = tower.coordinates
      const coords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
      navigator.clipboard.writeText(coords)
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <>
        <div className="poi-details-info">
          <div className="poi-details-info-item">
            <div className="poi-details-info-label">Navn</div>
            <div className="poi-details-info-value">{tower.name}</div>
          </div>
          {tower.height && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Høyde</div>
              <div className="poi-details-info-value">{tower.height} m</div>
            </div>
          )}
          {tower.operator && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Operatør</div>
              <div className="poi-details-info-value">{tower.operator}</div>
            </div>
          )}
          <div className="poi-details-info-item poi-details-info-item-with-button">
            <div className="poi-details-info-label">Koordinater</div>
            <div className="poi-details-info-value">
              {tower.coordinates[1].toFixed(5)}°N, {tower.coordinates[0].toFixed(5)}°E
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

  const renderWarMemorialDetails = (memorial: WarMemorialPOI) => {
    const handleCopyCoordinates = () => {
      const [lon, lat] = memorial.coordinates
      const coords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
      navigator.clipboard.writeText(coords)
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <>
        <div className="poi-details-info">
          <div className="poi-details-info-item">
            <div className="poi-details-info-label">Navn</div>
            <div className="poi-details-info-value">{memorial.name}</div>
          </div>
          {memorial.period && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Periode</div>
              <div className="poi-details-info-value">{memorial.period}</div>
            </div>
          )}
          {memorial.inscription && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Inskript</div>
              <div className="poi-details-info-value">{memorial.inscription}</div>
            </div>
          )}
          <div className="poi-details-info-item poi-details-info-item-with-button">
            <div className="poi-details-info-label">Koordinater</div>
            <div className="poi-details-info-value">
              {memorial.coordinates[1].toFixed(5)}°N, {memorial.coordinates[0].toFixed(5)}°E
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

  const renderWildernessShelterDetails = (shelter: WildernessShelterPOI) => {
    const handleCopyCoordinates = () => {
      const [lon, lat] = shelter.coordinates
      const coords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
      navigator.clipboard.writeText(coords)
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    // Norwegian shelter type labels
    const shelterTypeLabels: Record<string, string> = {
      'basic_hut': 'Gapahuk',
      'weather_shelter': 'Vindskjul',
      'rock_shelter': 'Helleskjul',
      'lavvu': 'Lavvo'
    }

    return (
      <>
        <div className="poi-details-info">
          <div className="poi-details-info-item">
            <div className="poi-details-info-label">Navn</div>
            <div className="poi-details-info-value">{shelter.name}</div>
          </div>
          {shelter.shelter_type && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Type</div>
              <div className="poi-details-info-value">
                {shelterTypeLabels[shelter.shelter_type] || shelter.shelter_type}
              </div>
            </div>
          )}
          {shelter.description && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Beskrivelse</div>
              <div className="poi-details-info-value">{shelter.description}</div>
            </div>
          )}
          <div className="poi-details-info-item poi-details-info-item-with-button">
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

  const renderKulturminnerDetails = (kulturminne: KulturminnerPOI) => {
    const handleCopyCoordinates = () => {
      const [lon, lat] = kulturminne.coordinates
      const coords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
      navigator.clipboard.writeText(coords)
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <>
        <div className="poi-details-info">
          <div className="poi-details-info-item">
            <div className="poi-details-info-label">Navn</div>
            <div className="poi-details-info-value">{kulturminne.name}</div>
          </div>
          {kulturminne.municipality && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Kommune</div>
              <div className="poi-details-info-value">{kulturminne.municipality}</div>
            </div>
          )}
          {kulturminne.created_by && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Opprettet av</div>
              <div className="poi-details-info-value">{kulturminne.created_by}</div>
            </div>
          )}
          {kulturminne.link && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Lenke</div>
              <div className="poi-details-info-value">
                <a href={kulturminne.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--trk-brand)', textDecoration: 'underline' }}>
                  Kulturminnesøk
                </a>
              </div>
            </div>
          )}
          <div className="poi-details-info-item poi-details-info-item-with-button">
            <div className="poi-details-info-label">Koordinater</div>
            <div className="poi-details-info-value">
              {kulturminne.coordinates[1].toFixed(5)}°N, {kulturminne.coordinates[0].toFixed(5)}°E
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
          {kulturminne.description && (
            <div className="poi-details-info-item kulturminner-description">
              <div className="poi-details-info-label">Beskrivelse</div>
              <div className="poi-details-info-value">{kulturminne.description}</div>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={30}
      halfHeight={50}
      initialHeight="half"
    >
      <button className="sheet-close-button" onClick={onClose} aria-label="Lukk detaljer">
        <span className="material-symbols-outlined">close</span>
      </button>
      <div className="poi-details-sheet">
        <div className="poi-details-content">
          {poi.type === 'shelter' && renderShelterDetails(poi as ShelterPOI)}
          {poi.type === 'cave' && renderCaveDetails(poi as CavePOI)}
          {poi.type === 'observation_tower' && renderObservationTowerDetails(poi as ObservationTowerPOI)}
          {poi.type === 'war_memorial' && renderWarMemorialDetails(poi as WarMemorialPOI)}
          {poi.type === 'wilderness_shelter' && renderWildernessShelterDetails(poi as WildernessShelterPOI)}
          {poi.type === 'kulturminner' && renderKulturminnerDetails(poi as KulturminnerPOI)}
        </div>
      </div>
    </Sheet>
  )
}

export default POIDetailsSheet
