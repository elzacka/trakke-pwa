import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { poiService, type POICategory } from '../services/poiService'
import '../styles/CategorySheet.css'

interface CategorySheetProps {
  isOpen: boolean
  onClose: () => void
  onCategorySelect: (category: POICategory) => void
}

const CategorySheet = ({ isOpen, onClose, onCategorySelect }: CategorySheetProps) => {
  const [selectedCategories, setSelectedCategories] = useState<Set<POICategory>>(new Set())
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

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={40}
      halfHeight={70}
      initialHeight="half"
    >
      <div className="category-sheet">
        <div className="category-sheet-header">
          <h2>Kategorier</h2>
        </div>

        <div className="category-sheet-content">
          <div className="category-list">
            {categories.map((category) => {
              const isSelected = selectedCategories.has(category.id)
              const cachedCount = poiService.getCachedCount(category.id)

              return (
                <button
                  key={category.id}
                  className={`category-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleCategoryToggle(category.id)}
                >
                  <div className="category-item-icon" style={{ color: category.color }}>
                    <span className="material-symbols-outlined">{category.icon}</span>
                  </div>
                  <div className="category-item-info">
                    <div className="category-item-name">{category.name}</div>
                    {cachedCount > 0 && (
                      <div className="category-item-count">
                        {cachedCount} {cachedCount === 1 ? 'punkt' : 'punkter'}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined category-item-check">check</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

export default CategorySheet
