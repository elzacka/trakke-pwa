// Application Constants
// Centralized configuration for Trakke PWA

// Map Configuration
export const MAP_CONFIG = {
  // Default center (Oslo, Norway)
  DEFAULT_CENTER: [10.7522, 59.9139] as [number, number],
  DEFAULT_ZOOM: 10,
  DEFAULT_PITCH: 60,
  MAX_ZOOM: 18,
  MIN_ZOOM: 3,

  // Kartverket tile URL
  TILE_URL: 'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',

  // Attribution
  ATTRIBUTION: '© <a href="https://www.kartverket.no/" target="_blank">Kartverket</a>',
} as const

// UI Timing
export const TIMING = {
  // Auto-hide delay for controls (milliseconds)
  AUTO_HIDE_DELAY: 5000,

  // Long-press delay for FAB menu (milliseconds)
  LONG_PRESS_DELAY: 500,

  // Search debounce delay (milliseconds)
  SEARCH_DEBOUNCE: 300,

  // Haptic feedback duration (milliseconds)
  HAPTIC_DURATION: 10,
} as const

// Offline Map Configuration
export const OFFLINE_CONFIG = {
  // Batch size for tile downloads
  DOWNLOAD_BATCH_SIZE: 5,

  // Estimated tile size in bytes (~15KB)
  TILE_SIZE_ESTIMATE: 15000,

  // Cache expiration (30 days in seconds)
  CACHE_MAX_AGE: 60 * 60 * 24 * 30,

  // Maximum cached tiles
  MAX_CACHED_TILES: 500,
} as const

// Theme Colors
export const COLORS = {
  PRIMARY: '#3e4533', // Trakke green
  TEXT_DARK: '#111827',
  TEXT_GRAY: '#64748b',
  ERROR: '#ef4444',
  BACKGROUND: '#ffffff',
} as const

// Development Mode
export const IS_DEV = import.meta.env?.DEV ?? false

// Development Logging Helper
export const devLog = (...args: unknown[]) => {
  if (IS_DEV) {
    console.log(...args)
  }
}

export const devError = (...args: unknown[]) => {
  if (IS_DEV) {
    console.error(...args)
  }
}
