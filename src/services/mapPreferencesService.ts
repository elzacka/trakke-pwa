// Map preferences service for display settings
// Stores user preferences for map display (scale bar, compass, rotation, etc.)

import type { CoordinateFormat } from './coordinateService'
import type { BaseLayerType } from '../constants'
import { devLog, devError } from '../constants'

export interface MapPreferences {
  showScaleBar: boolean
  enableRotation: boolean
  showCompass: boolean
  enlargePointer: boolean
  offlineOnly: boolean
  coordinateFormat: CoordinateFormat
  showWeatherWidget: boolean
  baseLayer: BaseLayerType
}

const DEFAULT_PREFERENCES: MapPreferences = {
  showScaleBar: false,
  enableRotation: true,
  showCompass: false,
  enlargePointer: false,
  offlineOnly: false,
  coordinateFormat: 'DD',
  showWeatherWidget: false,
  baseLayer: 'topo'
}

const STORAGE_KEY = 'trakke_map_preferences'

class MapPreferencesService {
  /**
   * Get current map preferences
   */
  getPreferences(): MapPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to handle new preferences in updates
        return { ...DEFAULT_PREFERENCES, ...parsed }
      }
    } catch (error) {
      devError('Failed to load map preferences:', error)
    }
    return { ...DEFAULT_PREFERENCES }
  }

  /**
   * Save map preferences
   */
  savePreferences(preferences: MapPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
      devLog('Map preferences saved')
    } catch (error) {
      devError('Failed to save map preferences:', error)
    }
  }

  /**
   * Update a single preference
   */
  updatePreference<K extends keyof MapPreferences>(
    key: K,
    value: MapPreferences[K]
  ): void {
    const current = this.getPreferences()
    current[key] = value
    this.savePreferences(current)
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.savePreferences({ ...DEFAULT_PREFERENCES })
  }
}

export const mapPreferencesService = new MapPreferencesService()
