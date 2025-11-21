import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import { mapPreferencesService, type MapPreferences } from '../services/mapPreferencesService'
import { coordinateService, type CoordinateFormat } from '../services/coordinateService'
import '../styles/MapPreferencesSheet.css'

interface MapPreferencesSheetProps {
  isOpen: boolean
  onClose: () => void
  onPreferencesChange: (preferences: MapPreferences) => void
}

const MapPreferencesSheet = ({ isOpen, onClose, onPreferencesChange }: MapPreferencesSheetProps) => {
  const [preferences, setPreferences] = useState<MapPreferences>(
    mapPreferencesService.getPreferences()
  )

  // Example coordinates for preview (Norwegian location)
  const exampleLon = 8.728039696259001
  const exampleLat = 61.50355374677453

  // Load preferences when sheet opens
  useEffect(() => {
    if (isOpen) {
      setPreferences(mapPreferencesService.getPreferences())
    }
  }, [isOpen])

  const handleToggle = (key: keyof MapPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key]
    }
    setPreferences(newPreferences)
    mapPreferencesService.savePreferences(newPreferences)
    onPreferencesChange(newPreferences)
  }

  const handleReset = () => {
    mapPreferencesService.resetToDefaults()
    const defaults = mapPreferencesService.getPreferences()
    setPreferences(defaults)
    onPreferencesChange(defaults)
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={30}
      halfHeight={45}
      initialHeight="half"
    >
      <div className="map-preferences-sheet">
        <div className="map-preferences-content">
          <div className="preferences-list">
            <div className="preference-item">
              <div className="preference-info">
                <span className="preference-label">Vis kompass</span>
                <span className="preference-description">
                  Viser kompass øverst til høyre på kartet
                </span>
              </div>
              <button
                className={`toggle-switch ${preferences.showCompass ? 'active' : ''}`}
                onClick={() => handleToggle('showCompass')}
                aria-label="Toggle kompass"
              >
                <span className="toggle-slider"></span>
              </button>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <span className="preference-label">Vis målestokk</span>
                <span className="preference-description">
                  Viser målestokk nederst på kartet
                </span>
              </div>
              <button
                className={`toggle-switch ${preferences.showScaleBar ? 'active' : ''}`}
                onClick={() => handleToggle('showScaleBar')}
                aria-label="Toggle målestokk"
              >
                <span className="toggle-slider"></span>
              </button>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <span className="preference-label">Tillat kartrotering</span>
                <span className="preference-description">
                  Roter kartet med kompass eller to fingre
                </span>
              </div>
              <button
                className={`toggle-switch ${preferences.enableRotation ? 'active' : ''}`}
                onClick={() => handleToggle('enableRotation')}
                aria-label="Toggle kartrotering"
              >
                <span className="toggle-slider"></span>
              </button>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <span className="preference-label">Vis vær</span>
                <span className="preference-description">
                  Viser værwidget på kartet når posisjon er tilgjengelig
                </span>
              </div>
              <button
                className={`toggle-switch ${preferences.showWeatherWidget ? 'active' : ''}`}
                onClick={() => handleToggle('showWeatherWidget')}
                aria-label="Toggle værwidget"
              >
                <span className="toggle-slider"></span>
              </button>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <span className="preference-label">Forstørret markør</span>
                <span className="preference-description">
                  Større markør for bedre synlighet
                </span>
              </div>
              <button
                className={`toggle-switch ${preferences.enlargePointer ? 'active' : ''}`}
                onClick={() => handleToggle('enlargePointer')}
                aria-label="Toggle forstørret markør"
              >
                <span className="toggle-slider"></span>
              </button>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <span className="preference-label">Last kun offline kart</span>
                <span className="preference-description">
                  Bruk bare nedlastede kartfliser (sparer data)
                </span>
              </div>
              <button
                className={`toggle-switch ${preferences.offlineOnly ? 'active' : ''}`}
                onClick={() => handleToggle('offlineOnly')}
                aria-label="Toggle offline only"
              >
                <span className="toggle-slider"></span>
              </button>
            </div>

            <div className="coordinate-format-list">
              {(['DD', 'DMS', 'DDM', 'UTM', 'MGRS'] as CoordinateFormat[]).map((format) => {
                const formatted = coordinateService.format(exampleLon, exampleLat, format)
                return (
                  <button
                    key={format}
                    className={`coordinate-format-option ${preferences.coordinateFormat === format ? 'active' : ''}`}
                    onClick={() => {
                      const newPreferences = {
                        ...preferences,
                        coordinateFormat: format
                      }
                      setPreferences(newPreferences)
                      mapPreferencesService.savePreferences(newPreferences)
                      onPreferencesChange(newPreferences)
                    }}
                  >
                    <div className="format-name">{coordinateService.getFormatName(format)}</div>
                    <div className="format-description">{coordinateService.getFormatDescription(format)}</div>
                    <div className="format-example">{formatted.display}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="preferences-actions">
            <button
              className="reset-button"
              onClick={handleReset}
            >
              <span className="material-symbols-outlined">restart_alt</span>
              Tilbakestill til standardverdier
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

export default MapPreferencesSheet
