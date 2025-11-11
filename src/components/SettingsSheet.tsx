import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { settingsService } from '../services/settingsService'
import { coordinateService, type CoordinateFormat } from '../services/coordinateService'
import '../styles/SettingsSheet.css'

interface SettingsSheetProps {
  isOpen: boolean
  onClose: () => void
}

const SettingsSheet = ({ isOpen, onClose }: SettingsSheetProps) => {
  const [selectedFormat, setSelectedFormat] = useState<CoordinateFormat>(
    settingsService.getCoordinateFormat()
  )
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Example coordinates for preview (Oslo, Norway)
  const exampleLon = 10.7522
  const exampleLat = 59.9139

  useEffect(() => {
    if (isOpen) {
      setSelectedFormat(settingsService.getCoordinateFormat())
    }
  }, [isOpen])

  const handleFormatChange = (format: CoordinateFormat) => {
    setSelectedFormat(format)
    settingsService.setCoordinateFormat(format)
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const formats: CoordinateFormat[] = ['DD', 'DMS', 'DDM', 'UTM', 'MGRS']

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={40}
      halfHeight={70}
      initialHeight="half"
    >
      <div className="settings-sheet">
        <div className="settings-sheet-header">
          <h2>Innstillinger</h2>
          <button
            className="settings-sheet-close"
            onClick={onClose}
            aria-label="Lukk"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="settings-sheet-content">
          <div className="settings-menu">
            {/* Coordinate Format Section */}
            <div className="settings-section">
              <button
                className="settings-section-header"
                onClick={() => toggleSection('coordinate-format')}
                aria-expanded={expandedSections.has('coordinate-format')}
              >
                <span className="settings-section-title">Koordinatformat</span>
                <span className="material-symbols-outlined settings-section-chevron">
                  {expandedSections.has('coordinate-format') ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {expandedSections.has('coordinate-format') && (
                <div className="settings-section-content">
                  {formats.map((format) => {
                    const formatted = coordinateService.format(exampleLon, exampleLat, format)
                    const isSelected = selectedFormat === format

                    return (
                      <button
                        key={format}
                        className={`settings-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleFormatChange(format)}
                      >
                        <div className="settings-option-info">
                          <div className="settings-option-name">
                            {coordinateService.getFormatName(format)}
                          </div>
                          <div className="settings-option-example">
                            {formatted.display}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="material-symbols-outlined settings-option-check">check</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Placeholder for future settings sections */}
            {/* Add more sections here as needed */}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

export default SettingsSheet
