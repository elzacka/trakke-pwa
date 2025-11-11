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
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={40}
      halfHeight={70}
      initialHeight="half"
    >
      <div className="settings-sheet">
        <div className="settings-sheet-header">
          <h2>Koordinatformat</h2>
        </div>

        <div className="settings-sheet-content">
          <div className="coordinate-format-list">
            {formats.map((format) => {
              const formatted = coordinateService.format(exampleLon, exampleLat, format)
              const isSelected = selectedFormat === format

              return (
                <button
                  key={format}
                  className={`coordinate-format-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleFormatChange(format)}
                >
                  <div className="format-option-info">
                    <div className="format-option-name">
                      {coordinateService.getFormatName(format)}
                    </div>
                    <div className="format-option-example">
                      {formatted.display}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined format-option-check">check</span>
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

export default SettingsSheet
