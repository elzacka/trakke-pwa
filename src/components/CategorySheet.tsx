import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import { poiService, type POICategory } from '../services/poiService'
import { getIconConfig } from '../services/iconService'
import '../styles/CategorySheet.css'

interface CategorySheetProps {
  isOpen: boolean
  onClose: () => void
  onCategorySelect: (category: POICategory) => void
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
    categories: ['war_memorials']
  },
  {
    id: 'emergency',
    name: 'Service',
    categories: ['shelters']
  }
  // Future categories:
  // { id: 'infrastructure', name: 'Infrastruktur', categories: ['parking', 'facilities'] }
]

const CategorySheet = ({ isOpen, onClose, onCategorySelect }: CategorySheetProps) => {
  const [selectedCategories, setSelectedCategories] = useState<Set<POICategory>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const categories = poiService.getAllCategories()

  useEffect(() => {
    if (isOpen) {
      // Refresh category counts from cache when sheet opens
      setSelectedCategories(new Set(selectedCategories))
    }
  }, [isOpen])

  const handleCategoryToggle = (categoryId: POICategory) => {
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

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={30}
      halfHeight={45}
      initialHeight="peek"
    >
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
                              // Custom T-marker for Tilfluktsrom
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="0.5" y="0.5" width="19" height="19" rx="2.5" fill="#fbbf24" stroke="#111827" strokeWidth="1"/>
                                <text x="10" y="10" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="12" fontWeight="400" fill="#111827" textAnchor="middle" dominantBaseline="central">T</text>
                              </svg>
                            ) : (iconConfig.type === 'osmic' || iconConfig.type === 'osm-carto') && iconConfig.path ? (
                              // Osmic or OSM-Carto SVG icon
                              <img
                                src={iconConfig.path}
                                alt={category.name}
                                style={{ width: '20px', height: '20px', filter: `brightness(0) saturate(100%)`, opacity: 0.8 }}
                              />
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
          </div>
        </div>
      </div>
    </Sheet>
  )
}

export default CategorySheet
