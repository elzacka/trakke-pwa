import { useState, useEffect } from 'react'
import Sheet from './Sheet'
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

  const formats: CoordinateFormat[] = ['DD', 'DMS', 'DDM', 'UTM', 'MGRS']

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={40}
      halfHeight={70}
      initialHeight="half"
    >
      <div className="settings-sheet">
        <div className="settings-sheet-content">
          <div className="settings-menu">
            {/* Coordinate Format Section */}
            <div className="settings-section-simple">
              <h2 className="settings-simple-title">Koordinatformat</h2>

              <div className="settings-options-list">
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
                        <div className="settings-option-description">
                          {coordinateService.getFormatDescription(format)}
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
            </div>

            {/* Placeholder for future settings sections */}
            {/* Add more sections here as needed */}
          </div>
        </div>
      </div>
    </Sheet>
  )
}

export default SettingsSheet
