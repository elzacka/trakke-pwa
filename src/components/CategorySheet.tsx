import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import { poiService, type POICategory, type AnyCategoryId } from '../services/poiService'
import { supabaseService, type SupabaseCategory } from '../services/supabaseService'
import { getIconConfig } from '../services/iconService'
import '../styles/CategorySheet.css'

interface CategorySheetProps {
  isOpen: boolean
  onClose: () => void
  onCategorySelect: (category: AnyCategoryId) => void
}

// Category group structure
interface CategoryGroup {
  id: string
  name: string
  categories: POICategory[]
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'outdoor',
    name: 'Friluftsliv',
    categories: ['wilderness_shelters', 'caves', 'observation_towers']
  },
  {
    id: 'culture',
    name: 'Kultur',
    categories: ['war_memorials', 'kulturminner']
  },
  {
    id: 'emergency',
    name: 'Service',
    categories: ['shelters']
  }
  // Tråkke spesial is added dynamically when Supabase is enabled
]

const CategorySheet = ({ isOpen, onClose, onCategorySelect }: CategorySheetProps) => {
  const [selectedCategories, setSelectedCategories] = useState<Set<AnyCategoryId>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [supabaseCategories, setSupabaseCategories] = useState<SupabaseCategory[]>([])
  const [supabaseLoading, setSupabaseLoading] = useState(false)
  const categories = poiService.getAllCategories()

  // Fetch Supabase categories when sheet opens
  useEffect(() => {
    if (isOpen) {
      // Refresh category counts from cache when sheet opens
      setSelectedCategories(new Set(selectedCategories))

      // Load Supabase categories if enabled
      if (supabaseService.isEnabled()) {
        setSupabaseLoading(true)
        supabaseService.getCategories()
          .then(cats => {
            setSupabaseCategories(cats)
          })
          .catch(err => {
            console.error('Failed to load Supabase categories:', err)
            setSupabaseCategories([])
          })
          .finally(() => {
            setSupabaseLoading(false)
          })
      } else {
        setSupabaseCategories([])
      }
    }
  }, [isOpen])

  const handleCategoryToggle = (categoryId: AnyCategoryId) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
    } else {
      newSelected.add(categoryId)
    }
    setSelectedCategories(newSelected)
    onCategorySelect(categoryId)
  }

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const getCategoryConfig = (categoryId: POICategory) => {
    return categories.find(cat => cat.id === categoryId)
  }

  // Check if Supabase integration is enabled and has categories
  const showSupabaseGroup = supabaseService.isEnabled() && (supabaseCategories.length > 0 || supabaseLoading)

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={30}
      halfHeight={45}
      initialHeight="peek"
    >
      <button className="sheet-close-button" onClick={onClose} aria-label="Lukk kategorier">
        <span className="material-symbols-outlined">close</span>
      </button>
      <div className="category-sheet">
        <div className="category-sheet-content">
          <div className="category-menu">
            {CATEGORY_GROUPS.map((group) => (
              <div key={group.id} className="category-section">
                <button
                  className="category-section-header"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={expandedGroups.has(group.id)}
                >
                  <span className="category-section-title">{group.name}</span>
                  <span className="material-symbols-outlined category-section-chevron">
                    {expandedGroups.has(group.id) ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {expandedGroups.has(group.id) && (
                  <div className="category-section-content">
                    {group.categories.map((categoryId) => {
                      const category = getCategoryConfig(categoryId)
                      if (!category) return null

                      const isSelected = selectedCategories.has(categoryId)
                      const cachedCount = poiService.getCachedCount(categoryId)

                      const iconConfig = getIconConfig(categoryId)

                      return (
                        <button
                          key={categoryId}
                          className={`category-option ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleCategoryToggle(categoryId)}
                        >
                          <div className="category-option-icon">
                            {iconConfig.type === 'custom' && categoryId === 'shelters' ? (
                              // Custom T-marker for Tilfluktsrom (yellow background)
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="0.5" y="0.5" width="19" height="19" rx="2.5" fill="#fbbf24" stroke="#111827" strokeWidth="1"/>
                                <text x="10" y="10" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="12" fontWeight="400" fill="#111827" textAnchor="middle" dominantBaseline="central">T</text>
                              </svg>
                            ) : (iconConfig.type === 'osmic' || iconConfig.type === 'osm-carto') && iconConfig.path ? (
                              // All other icons: white background with black border and black symbol
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="0.5" y="0.5" width="19" height="19" rx="2.5" fill="#ffffff" stroke="#111827" strokeWidth="1"/>
                                <image
                                  href={iconConfig.path}
                                  x="3"
                                  y="3"
                                  width="14"
                                  height="14"
                                  style={{ filter: 'brightness(0) saturate(100%)' }}
                                />
                              </svg>
                            ) : (
                              // Material Symbol fallback
                              <span className="material-symbols-outlined" style={{ color: category.color }}>{category.icon}</span>
                            )}
                          </div>
                          <div className="category-option-info">
                            <div className="category-option-name">{category.name}</div>
                            {cachedCount > 0 && (
                              <div className="category-option-count">
                                {cachedCount} {cachedCount === 1 ? 'punkt' : 'punkter'}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined category-option-check">check</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Tråkke spesial - Dynamic Supabase categories (below Service) */}
            {showSupabaseGroup && (
              <div className="category-section">
                <button
                  className="category-section-header"
                  onClick={() => toggleGroup('supabase')}
                  aria-expanded={expandedGroups.has('supabase')}
                >
                  <span className="category-section-title">Tråkke spesial</span>
                  <span className="material-symbols-outlined category-section-chevron">
                    {expandedGroups.has('supabase') ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {expandedGroups.has('supabase') && (
                  <div className="category-section-content">
                    {supabaseLoading ? (
                      <div className="category-loading">
                        <span className="material-symbols-outlined spinning">sync</span>
                        <span>Laster kategorier...</span>
                      </div>
                    ) : supabaseCategories.length === 0 ? (
                      <div className="category-empty">
                        <span>Ingen kategorier funnet</span>
                      </div>
                    ) : (
                      supabaseCategories.map((supabaseCat) => {
                        const categoryId = `supabase:${supabaseCat.slug}` as AnyCategoryId
                        const isSelected = selectedCategories.has(categoryId)
                        const cachedCount = supabaseService.getCachedCount(supabaseCat.slug)

                        // Get color for Supabase category (default to green if not specified)
                        const categoryColor = supabaseCat.color || '#22c55e'

                        return (
                          <button
                            key={categoryId}
                            className={`category-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleCategoryToggle(categoryId)}
                          >
                            <div className="category-option-icon">
                              {/* Colored circle matching map marker */}
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="10" cy="10" r="10" fill={categoryColor} />
                              </svg>
                            </div>
                            <div className="category-option-info">
                              <div className="category-option-name">{supabaseCat.name}</div>
                              {supabaseCat.description && (
                                <div className="category-option-description">{supabaseCat.description}</div>
                              )}
                              {cachedCount > 0 && (
                                <div className="category-option-count">
                                  {cachedCount} {cachedCount === 1 ? 'punkt' : 'punkter'}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <span className="material-symbols-outlined category-option-check">check</span>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  )
}

export default CategorySheet
