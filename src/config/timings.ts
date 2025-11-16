// Timing constants for the Tråkke PWA
// Centralized location for all delay and timeout values

/**
 * UI interaction delays
 */
export const UI_DELAYS = {
  /** Auto-hide delay for controls (5 seconds) */
  AUTO_HIDE_CONTROLS: 5000,

  /** Search debounce delay (300ms) */
  SEARCH_DEBOUNCE: 300,

  /** POI viewport loading debounce (300ms) */
  POI_DEBOUNCE: 300,

  /** Long-press duration for waypoint details (500ms) */
  LONG_PRESS: 500,

  /** Notification display duration (2 seconds) */
  NOTIFICATION_DISPLAY: 2000,
} as const

/**
 * Cache and TTL settings
 */
export const CACHE_CONFIG = {
  /** POI cache time-to-live (5 minutes) */
  POI_TTL: 300000, // 5 minutes

  /** Map tile cache max entries (Workbox) */
  TILE_MAX_ENTRIES: 25000,

  /** Map tile cache max age (30 days in seconds) */
  TILE_MAX_AGE: 60 * 60 * 24 * 30, // 30 days

  /** Local font cache max age (1 year in seconds) */
  FONT_MAX_AGE: 60 * 60 * 24 * 365, // 1 year
} as const

/**
 * Validation limits
 */
export const VALIDATION = {
  /** Maximum length for user-entered names (routes, waypoints) */
  MAX_NAME_LENGTH: 100,
} as const

/**
 * Viewport and buffer settings
 */
export const VIEWPORT = {
  /** Buffer factor for POI viewport loading (20% padding) */
  POI_BUFFER_FACTOR: 1.2,

  /** Minimum zoom level for POI display */
  POI_MIN_ZOOM: 10,
} as const

/**
 * Gesture thresholds
 */
export const GESTURES = {
  /** Minimum swipe distance for bottom-edge FAB reveal (pixels) */
  BOTTOM_EDGE_SWIPE_MIN: 30,

  /** Bottom-edge detection zone (pixels from bottom) */
  BOTTOM_EDGE_ZONE: 50,
} as const
