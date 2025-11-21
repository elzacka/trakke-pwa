// Application Constants
// Centralized configuration for Trakke PWA

// Map Configuration
export const MAP_CONFIG = {
  // Default center (Oslo, Norway)
  DEFAULT_CENTER: [10.7522, 59.9139] as [number, number],
  DEFAULT_ZOOM: 10,
  DEFAULT_PITCH: 0,
  MAX_ZOOM: 18,
  MIN_ZOOM: 3,

  // Kartverket tile URLs
  TILE_URL_TOPO: 'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
  TILE_URL_GRAYSCALE: 'https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png',

  // Legacy tile URL (deprecated - use TILE_URL_TOPO)
  TILE_URL: 'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',

  // Attribution
  ATTRIBUTION: '© <a href="https://www.kartverket.no/" target="_blank">Kartverket</a>',
} as const

// Base Layer Types
export type BaseLayerType = 'topo' | 'grayscale'

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

// Theme Colors - Nordisk ro Design System
export const COLORS = {
  // Brand
  BRAND: '#3e4533',           // Primary brand green
  BRAND_SOFT: '#606756',      // Softer variant for UI
  BRAND_TINT: '#e9ece6',      // Light tint for backgrounds

  // Neutrals
  BG: '#fafaf7',              // Main background
  SURFACE: '#ffffff',         // Cards, panels, overlays
  SURFACE_SUBTLE: '#f2f3f0',  // Subtle background
  BORDER: '#e4e5e1',          // Standard borders
  BORDER_STRONG: '#c9ccc5',   // Stronger borders

  // Text
  TEXT: '#1a1d1b',            // Primary text
  TEXT_MUTED: '#4a4f47',      // Secondary text
  TEXT_SOFT: '#7c8278',       // Tertiary text

  // Functional
  BLUE: '#1e6ce0',            // GPS, info, focus
  RED: '#d0443e',             // Waypoints, warnings
  GREEN: '#2e9e5b',           // Success

  // Legacy aliases (deprecated - use specific tokens above)
  PRIMARY: '#3e4533',         // Use BRAND instead
  TEXT_DARK: '#1a1d1b',       // Use TEXT instead
  TEXT_GRAY: '#7c8278',       // Use TEXT_SOFT instead
  ERROR: '#d0443e',           // Use RED instead
  BACKGROUND: '#ffffff',      // Use SURFACE instead
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
