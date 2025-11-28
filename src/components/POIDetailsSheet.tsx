import { useState, useEffect, useRef } from 'react'
import Sheet from './Sheet'
import { poiService, type POI, type ShelterPOI, type CavePOI, type ObservationTowerPOI, type WarMemorialPOI, type WildernessShelterPOI, type KulturminnerPOI, type SupabasePOI } from '../services/poiService'
import { adminAuthService } from '../services/adminAuthService'
import { supabaseService } from '../services/supabaseService'
import { devLog } from '../constants'
import '../styles/POIDetailsSheet.css'

// Validate URL to prevent javascript: XSS attacks
const isValidHttpUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

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

  // Mounted ref to prevent state updates after unmount
  const mountedRef = useRef(true)
  const copyTimeoutRef = useRef<number | undefined>(undefined)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

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

    // Check if component is still mounted before updating state
    if (!mountedRef.current) return

    setIsDeleting(false)

    if (result.success) {
      devLog('[POIDetails] POI deleted successfully')
      onClose()
      onDelete?.()
    } else {
      setDeleteError(result.error || 'Kunne ikke slette')
    }
  }

  // Shared copy coordinates handler
  const handleCopyCoordinates = (coordinates: [number, number]) => {
    const [lon, lat] = coordinates
    const coords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
    navigator.clipboard.writeText(coords)
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
    setCopied(true)
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    copyTimeoutRef.current = window.setTimeout(() => {
      if (mountedRef.current) setCopied(false)
    }, 2000)
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
  // Reusable coordinate row component
  const CoordinateRow = ({ coordinates }: { coordinates: [number, number] }) => (
    <div className="poi-details-info-item poi-details-info-item-with-button">
      <div className="poi-details-info-label">Koordinater</div>
      <div className="poi-details-info-value">
        {coordinates[1].toFixed(5)}°N, {coordinates[0].toFixed(5)}°E
      </div>
      <button
        className={`poi-details-copy-button ${copied ? 'copied' : ''}`}
        onClick={() => handleCopyCoordinates(coordinates)}
        aria-label="Kopier koordinater"
        type="button"
      >
        <span className="material-symbols-outlined">
          {copied ? 'check' : 'content_copy'}
        </span>
      </button>
    </div>
  )

  const renderShelterDetails = (shelter: ShelterPOI) => (
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
      <CoordinateRow coordinates={shelter.coordinates} />
    </div>
  )

  const renderCaveDetails = (cave: CavePOI) => (
    <div className="poi-details-info">
      {cave.description && (
        <div className="poi-details-info-item">
          <div className="poi-details-info-label">Beskrivelse</div>
          <div className="poi-details-info-value">{cave.description}</div>
        </div>
      )}
      <CoordinateRow coordinates={cave.coordinates} />
    </div>
  )

  const renderObservationTowerDetails = (tower: ObservationTowerPOI) => (
    <div className="poi-details-info">
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
      <CoordinateRow coordinates={tower.coordinates} />
    </div>
  )

  const renderWarMemorialDetails = (memorial: WarMemorialPOI) => (
    <div className="poi-details-info">
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
      <CoordinateRow coordinates={memorial.coordinates} />
    </div>
  )

  // Norwegian shelter type labels
  const shelterTypeLabels: Record<string, string> = {
    'basic_hut': 'Gapahuk',
    'weather_shelter': 'Vindskjul',
    'rock_shelter': 'Helleskjul',
    'lavvu': 'Lavvo'
  }

  const renderWildernessShelterDetails = (shelter: WildernessShelterPOI) => (
    <div className="poi-details-info">
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
      <CoordinateRow coordinates={shelter.coordinates} />
    </div>
  )

  const renderKulturminnerDetails = (kulturminne: KulturminnerPOI) => (
    <div className="poi-details-info">
      {kulturminne.municipality && (
        <div className="poi-details-info-item">
          <div className="poi-details-info-label">Kommune</div>
          <div className="poi-details-info-value">{kulturminne.municipality}</div>
        </div>
      )}
      {kulturminne.link && isValidHttpUrl(kulturminne.link) && (
        <div className="poi-details-info-item">
          <div className="poi-details-info-label">Lenke og bilde</div>
          <div className="poi-details-info-value">
            <a href={kulturminne.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--trk-brand)', textDecoration: 'underline' }}>
              Kulturminnesøk
            </a>
          </div>
        </div>
      )}
      <CoordinateRow coordinates={kulturminne.coordinates} />
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
  )

  const renderSupabaseDetails = (supabasePoi: SupabasePOI) => (
    <div className="poi-details-info">
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
      {supabasePoi.externalUrl && isValidHttpUrl(supabasePoi.externalUrl) && (
        <div className="poi-details-info-item">
          <div className="poi-details-info-label">Lenke</div>
          <div className="poi-details-info-value">
            <a href={supabasePoi.externalUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--trk-brand)', textDecoration: 'underline' }}>
              Åpne
            </a>
          </div>
        </div>
      )}
      <CoordinateRow coordinates={supabasePoi.coordinates} />
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
  )

  // Get display name for title (removes redundant location info for Kulturminner)
  const getDisplayName = (): string => {
    if (poi.type === 'kulturminner') {
      // Remove " i [Kommune]" suffix since kommune is shown separately below
      // Pattern matches " i " followed by capital letter and rest of string at end
      return poi.name.replace(/\s+i\s+[A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅ][a-zæøå]+)*$/, '')
    }
    return poi.name
  }

  // Get category label for subtitle
  const getCategoryLabel = (): string => {
    switch (poi.type) {
      case 'shelter': return 'Tilfluktsrom'
      case 'cave': return 'Hule'
      case 'observation_tower': return 'Utsiktstårn'
      case 'war_memorial': return 'Krigsminne'
      case 'wilderness_shelter': return 'Gapahuk / Vindskjul'
      case 'kulturminner': return 'Kulturminne'
      case 'supabase': return categoryConfig?.name || 'Sted'
      default: return 'Sted'
    }
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
        {/* Header with title and category */}
        <div className="poi-details-header">
          <h2 className="poi-details-title">{getDisplayName()}</h2>
          <p className="poi-details-subtitle">{getCategoryLabel()}</p>
        </div>

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
                  <div className="poi-admin-buttons">
                    <button
                      className="trk-btn trk-btn--md trk-btn--secondary poi-admin-btn-flex"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Avbryt
                    </button>
                    <button
                      className="trk-btn trk-btn--md trk-btn--danger poi-admin-btn-flex"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Sletter...' : 'Slett'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="poi-admin-buttons">
                  <button
                    className="trk-btn trk-btn--md trk-btn--secondary poi-admin-btn-flex"
                    onClick={() => {
                      onClose()
                      onEdit?.(poi)
                    }}
                  >
                    Rediger
                  </button>
                  <button
                    className="trk-btn trk-btn--md trk-btn--danger poi-admin-btn-flex"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
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
