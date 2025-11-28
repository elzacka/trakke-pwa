// Admin POI Sheet
// Form for creating and editing POIs
// Requires admin authentication

import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import { adminAuthService } from '../services/adminAuthService'
import { supabaseService, type SupabaseCategory, type SupabasePOI } from '../services/supabaseService'
import { type POICategory, type POI } from '../services/poiService'
import { devLog } from '../constants'
import '../styles/AdminPOISheet.css'

// Built-in category options that can have admin-added POIs
const BUILT_IN_CATEGORIES: { id: POICategory; name: string }[] = [
  { id: 'caves', name: 'Huler' },
  { id: 'wilderness_shelters', name: 'Gapahuk / Vindskjul' },
  { id: 'observation_towers', name: 'Observasjonstårn' },
  { id: 'war_memorials', name: 'Krigsminner' },
  { id: 'kulturminner', name: 'Kulturminner' }
]

interface AdminPOISheetProps {
  isOpen: boolean
  onClose: () => void
  coordinates: [number, number] | null  // [lon, lat] from map click
  editPoi?: POI | null  // POI to edit (for edit mode)
  onSuccess?: () => void  // Called after successful save
  onStartPlacement?: () => void  // Called when user wants to pick location on map
}

type CategoryType = 'supabase' | 'builtin'

const AdminPOISheet = ({
  isOpen,
  onClose,
  coordinates,
  editPoi,
  onSuccess,
  onStartPlacement
}: AdminPOISheetProps) => {
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [place, setPlace] = useState('')
  const [externalUrl, setExternalUrl] = useState('')

  // Category selection
  const [categoryType, setCategoryType] = useState<CategoryType>('supabase')
  const [supabaseCategories, setSupabaseCategories] = useState<SupabaseCategory[]>([])
  const [selectedSupabaseCategory, setSelectedSupabaseCategory] = useState<string>('')
  const [selectedBuiltinCategory, setSelectedBuiltinCategory] = useState<POICategory | ''>('')

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Edit mode detection
  const isEditMode = !!editPoi

  // Load Supabase categories when sheet opens
  useEffect(() => {
    if (isOpen && supabaseService.isEnabled()) {
      setIsLoading(true)
      supabaseService.getCategories()
        .then(cats => {
          setSupabaseCategories(cats)
          // Auto-select first category if none selected
          if (cats.length > 0 && !selectedSupabaseCategory) {
            setSelectedSupabaseCategory(cats[0].id)
          }
        })
        .catch(err => {
          devLog('[AdminPOISheet] Failed to load categories:', err)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [isOpen])

  // Populate form when editing
  useEffect(() => {
    if (editPoi && isOpen) {
      setName(editPoi.name)

      if (editPoi.type === 'supabase') {
        const supabasePoi = editPoi as SupabasePOI
        setDescription(supabasePoi.description || '')
        setMunicipality(supabasePoi.municipality || '')
        setPlace(supabasePoi.place || '')
        setExternalUrl(supabasePoi.externalUrl || '')
        setCategoryType('supabase')
        setSelectedSupabaseCategory(supabasePoi.categoryId)
      } else {
        // Built-in category POI - limited editing
        setDescription('')
        setMunicipality('')
        setPlace('')
        setExternalUrl('')
      }
    } else if (!editPoi && isOpen) {
      // Reset form for new POI
      resetForm()
    }
  }, [editPoi, isOpen])

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const resetForm = () => {
    setName('')
    setDescription('')
    setMunicipality('')
    setPlace('')
    setExternalUrl('')
    setCategoryType('supabase')
    setSelectedBuiltinCategory('')
    // Keep selectedSupabaseCategory as is (user's last choice)
  }

  const handleSave = async () => {
    // Validate required fields
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Navn er påkrevd' })
      return
    }

    if (!coordinates) {
      setMessage({ type: 'error', text: 'Velg posisjon på kartet først' })
      return
    }

    if (categoryType === 'supabase' && !selectedSupabaseCategory) {
      setMessage({ type: 'error', text: 'Velg en kategori' })
      return
    }

    if (categoryType === 'builtin' && !selectedBuiltinCategory) {
      setMessage({ type: 'error', text: 'Velg en innebygd kategori' })
      return
    }

    // Get auth token
    const token = adminAuthService.getAccessToken()
    if (!token) {
      setMessage({ type: 'error', text: 'Du må være logget inn som admin' })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      if (isEditMode && editPoi?.type === 'supabase') {
        // Update existing POI
        const poiId = editPoi.id.replace('supabase-', '')
        const result = await supabaseService.updatePOI(
          poiId,
          {
            name: name.trim(),
            description: description.trim() || undefined,
            municipality: municipality.trim() || undefined,
            place: place.trim() || undefined,
            externalUrl: externalUrl.trim() || undefined,
            coordinates
          },
          token
        )

        if (result.success) {
          setMessage({ type: 'success', text: 'Stedet er oppdatert!' })
          onSuccess?.()
          setTimeout(() => {
            onClose()
          }, 1000)
        } else {
          setMessage({ type: 'error', text: result.error || 'Kunne ikke oppdatere' })
        }
      } else {
        // Create new POI
        const categoryId = categoryType === 'supabase'
          ? selectedSupabaseCategory
          : supabaseCategories[0]?.id || ''  // Need a Supabase category for storage

        const sourceCategory = categoryType === 'builtin'
          ? selectedBuiltinCategory
          : undefined

        // If adding to built-in category, we need at least one Supabase category
        if (categoryType === 'builtin' && !categoryId) {
          setMessage({ type: 'error', text: 'Opprett en Supabase-kategori først for lagring' })
          setIsSaving(false)
          return
        }

        const result = await supabaseService.createPOI(
          {
            name: name.trim(),
            categoryId,
            coordinates,
            description: description.trim() || undefined,
            municipality: municipality.trim() || undefined,
            place: place.trim() || undefined,
            externalUrl: externalUrl.trim() || undefined,
            sourceCategory
          },
          token
        )

        if (result.success) {
          setMessage({ type: 'success', text: 'Stedet er lagt til!' })
          resetForm()
          onSuccess?.()
          setTimeout(() => {
            onClose()
          }, 1000)
        } else {
          setMessage({ type: 'error', text: result.error || 'Kunne ikke lagre' })
        }
      }
    } catch (error) {
      devLog('[AdminPOISheet] Save error:', error)
      setMessage({ type: 'error', text: 'Nettverksfeil' })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePickLocation = () => {
    onStartPlacement?.()
    onClose()
  }

  // Check if user is authenticated
  if (!adminAuthService.isAdmin()) {
    return (
      <Sheet isOpen={isOpen} onClose={onClose} peekHeight={30} halfHeight={60}>
        <button className="sheet-close-button" onClick={onClose} aria-label="Lukk">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="admin-poi-sheet">
          <h2>
            <span className="material-symbols-outlined">add_location</span>
            {isEditMode ? 'Rediger sted' : 'Legg til sted'}
          </h2>
          <div className="admin-poi-not-logged-in">
            <span className="material-symbols-outlined">lock</span>
            <p>Du må være logget inn som admin for å legge til steder.</p>
          </div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} peekHeight={30} halfHeight={85}>
      <button className="sheet-close-button" onClick={onClose} aria-label="Lukk">
        <span className="material-symbols-outlined">close</span>
      </button>

      <div className="admin-poi-sheet">
        <h2>
          <span className="material-symbols-outlined">
            {isEditMode ? 'edit_location' : 'add_location'}
          </span>
          {isEditMode ? 'Rediger sted' : 'Legg til sted'}
        </h2>

        <div className="admin-poi-form">
          {/* Location section */}
          <div className="admin-poi-location-section">
            {coordinates ? (
              <div className="admin-poi-coordinates">
                <span className="material-symbols-outlined">location_on</span>
                <span>
                  {coordinates[1].toFixed(5)}°N, {coordinates[0].toFixed(5)}°E
                </span>
                {!isEditMode && (
                  <button
                    type="button"
                    className="admin-poi-change-location"
                    onClick={handlePickLocation}
                  >
                    Endre
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="admin-poi-pick-location"
                onClick={handlePickLocation}
              >
                <span className="material-symbols-outlined">pin_drop</span>
                <span>Velg posisjon på kartet</span>
              </button>
            )}
          </div>

          {/* Name */}
          <div className="form-group">
            <label htmlFor="poi-name">Navn *</label>
            <input
              type="text"
              id="poi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Navn på stedet"
              maxLength={100}
              disabled={isSaving}
            />
          </div>

          {/* Category selection */}
          {!isEditMode && (
            <div className="form-group">
              <label>Kategori</label>
              <div className="admin-poi-category-type">
                <button
                  type="button"
                  className={`category-type-button ${categoryType === 'supabase' ? 'active' : ''}`}
                  onClick={() => setCategoryType('supabase')}
                >
                  Tråkke spesial
                </button>
                <button
                  type="button"
                  className={`category-type-button ${categoryType === 'builtin' ? 'active' : ''}`}
                  onClick={() => setCategoryType('builtin')}
                >
                  Innebygd kategori
                </button>
              </div>

              {categoryType === 'supabase' ? (
                <select
                  value={selectedSupabaseCategory}
                  onChange={(e) => setSelectedSupabaseCategory(e.target.value)}
                  disabled={isLoading || isSaving}
                >
                  {isLoading ? (
                    <option value="">Laster...</option>
                  ) : supabaseCategories.length === 0 ? (
                    <option value="">Ingen kategorier funnet</option>
                  ) : (
                    supabaseCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))
                  )}
                </select>
              ) : (
                <select
                  value={selectedBuiltinCategory}
                  onChange={(e) => setSelectedBuiltinCategory(e.target.value as POICategory)}
                  disabled={isSaving}
                >
                  <option value="">Velg kategori...</option>
                  {BUILT_IN_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              )}

              {categoryType === 'builtin' && (
                <p className="form-hint">
                  Stedet vil vises sammen med andre {selectedBuiltinCategory ? BUILT_IN_CATEGORIES.find(c => c.id === selectedBuiltinCategory)?.name.toLowerCase() : 'steder'} fra OpenStreetMap.
                </p>
              )}
            </div>
          )}

          {/* Description */}
          <div className="form-group">
            <label htmlFor="poi-description">Beskrivelse</label>
            <textarea
              id="poi-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskrivelse av stedet"
              rows={3}
              maxLength={1000}
              disabled={isSaving}
            />
          </div>

          {/* Place */}
          <div className="form-group">
            <label htmlFor="poi-place">Stedsnavn</label>
            <input
              type="text"
              id="poi-place"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="F.eks. Nordmarka, Trollheimen"
              maxLength={100}
              disabled={isSaving}
            />
          </div>

          {/* Municipality */}
          <div className="form-group">
            <label htmlFor="poi-municipality">Kommune</label>
            <input
              type="text"
              id="poi-municipality"
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
              placeholder="F.eks. Oslo, Bergen"
              maxLength={100}
              disabled={isSaving}
            />
          </div>

          {/* External URL */}
          <div className="form-group">
            <label htmlFor="poi-url">Lenke (valgfritt)</label>
            <input
              type="url"
              id="poi-url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://..."
              maxLength={500}
              disabled={isSaving}
            />
          </div>

          {/* Message */}
          {message && (
            <div className={`admin-poi-message admin-poi-message-${message.type}`}>
              <span className="material-symbols-outlined">
                {message.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{message.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="admin-poi-actions">
            <button
              type="button"
              className="admin-poi-cancel"
              onClick={onClose}
              disabled={isSaving}
            >
              Avbryt
            </button>
            <button
              type="button"
              className="admin-poi-save"
              onClick={handleSave}
              disabled={isSaving || !name.trim() || !coordinates}
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined spinning">progress_activity</span>
                  <span>Lagrer...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  <span>{isEditMode ? 'Oppdater' : 'Lagre'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

export default AdminPOISheet
