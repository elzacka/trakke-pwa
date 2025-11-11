import type { CoordinateFormat } from './coordinateService'

interface AppSettings {
  coordinateFormat: CoordinateFormat
}

const DEFAULT_SETTINGS: AppSettings = {
  coordinateFormat: 'DD'
}

const SETTINGS_KEY = 'trakke-settings'

class SettingsService {
  private settings: AppSettings

  constructor() {
    this.settings = this.loadSettings()
  }

  // Load settings from localStorage
  private loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    return { ...DEFAULT_SETTINGS }
  }

  // Save settings to localStorage
  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  // Get current coordinate format
  getCoordinateFormat(): CoordinateFormat {
    return this.settings.coordinateFormat
  }

  // Set coordinate format
  setCoordinateFormat(format: CoordinateFormat): void {
    this.settings.coordinateFormat = format
    this.saveSettings()
  }

  // Get all settings
  getSettings(): AppSettings {
    return { ...this.settings }
  }

  // Reset to defaults
  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    this.saveSettings()
  }
}

export const settingsService = new SettingsService()
