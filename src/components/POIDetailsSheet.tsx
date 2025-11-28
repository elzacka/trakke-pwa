import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import { poiService, type POI, type ShelterPOI, type CavePOI, type ObservationTowerPOI, type WarMemorialPOI, type WildernessShelterPOI, type KulturminnerPOI, type SupabasePOI } from '../services/poiService'
import { adminAuthService } from '../services/adminAuthService'
import { supabaseService } from '../services/supabaseService'
import { devLog } from '../constants'
import '../styles/POIDetailsSheet.css'

interface POIDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  poi: POI | null
  onEdit?: (poi: POI) => void  // Called when edit is requested
  onDelete?: () => void  // Called when deletion is successful
}

const POIDetailsSheet = ({ isOpen, onClose, poi, onEdit, onDelete }: POIDetailsSheetProps) => {
  const [copied, setCopied] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Check admin status when sheet opens
  useEffect(() => {
    if (isOpen) {
      setIsAdmin(adminAuthService.isAdmin())
      setShowDeleteConfirm(false)
      setDeleteError(null)
    }
  }, [isOpen])

  // Handle delete
  const handleDelete = async () => {
    if (!poi || poi.type !== 'supabase') return

    const token = adminAuthService.getAccessToken()
    if (!token) {
      setDeleteError('Du må være logget inn som admin')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    // Extract UUID from POI id (remove 'supabase-' prefix)
    const poiId = poi.id.replace('supabase-', '')

    const result = await supabaseService.deletePOI(poiId, token)

    setIsDeleting(false)

    if (result.success) {
      devLog('[POIDetails] POI deleted successfully')
      onClose()
      onDelete?.()
    } else {
      setDeleteError(result.error || 'Kunne ikke slette')
    }
  }

  // Check if this POI can be edited/deleted (only Supabase POIs)
  const canEditDelete = poi?.type === 'supabase' && isAdmin

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
          {kulturminne.link && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Lenke og bilde</div>
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
            <>
              <div className="kulturminner-description-header">
                <div className="poi-details-info-label">Beskrivelse</div>
              </div>
              <div className="kulturminner-description-text">
                {kulturminne.description}
              </div>
            </>
          )}
        </div>
      </>
    )
  }

  const renderSupabaseDetails = (supabasePoi: SupabasePOI) => {
    const handleCopyCoordinates = () => {
      const [lon, lat] = supabasePoi.coordinates
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
            <div className="poi-details-info-value">{supabasePoi.name}</div>
          </div>
          {supabasePoi.place && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Sted</div>
              <div className="poi-details-info-value">{supabasePoi.place}</div>
            </div>
          )}
          {supabasePoi.municipality && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Kommune</div>
              <div className="poi-details-info-value">{supabasePoi.municipality}</div>
            </div>
          )}
          {supabasePoi.externalUrl && (
            <div className="poi-details-info-item">
              <div className="poi-details-info-label">Lenke</div>
              <div className="poi-details-info-value">
                <a href={supabasePoi.externalUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--trk-brand)', textDecoration: 'underline' }}>
                  Åpne
                </a>
              </div>
            </div>
          )}
          <div className="poi-details-info-item poi-details-info-item-with-button">
            <div className="poi-details-info-label">Koordinater</div>
            <div className="poi-details-info-value">
              {supabasePoi.coordinates[1].toFixed(5)}°N, {supabasePoi.coordinates[0].toFixed(5)}°E
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
          {supabasePoi.description && (
            <>
              <div className="kulturminner-description-header">
                <div className="poi-details-info-label">Beskrivelse</div>
              </div>
              <div className="kulturminner-description-text" style={{ whiteSpace: 'pre-line' }}>
                {supabasePoi.description}
              </div>
            </>
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
          {poi.type === 'supabase' && renderSupabaseDetails(poi as SupabasePOI)}

          {/* Admin actions for Supabase POIs */}
          {canEditDelete && (
            <div className="poi-admin-actions">
              {showDeleteConfirm ? (
                <div className="poi-delete-confirm">
                  <p>Er du sikker på at du vil slette dette stedet?</p>
                  {deleteError && (
                    <div className="poi-delete-error">
                      <span className="material-symbols-outlined">error</span>
                      {deleteError}
                    </div>
                  )}
                  <div className="poi-delete-confirm-buttons">
                    <button
                      className="poi-admin-button poi-cancel-button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Avbryt
                    </button>
                    <button
                      className="poi-admin-button poi-delete-button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <span className="material-symbols-outlined spinning">progress_activity</span>
                          Sletter...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">delete</span>
                          Slett
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="poi-admin-buttons">
                  <button
                    className="poi-admin-button poi-edit-button"
                    onClick={() => {
                      onClose()
                      onEdit?.(poi)
                    }}
                  >
                    <span className="material-symbols-outlined">edit</span>
                    Rediger
                  </button>
                  <button
                    className="poi-admin-button poi-delete-button"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <span className="material-symbols-outlined">delete</span>
                    Slett
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

export default POIDetailsSheet
