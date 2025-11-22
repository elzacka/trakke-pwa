// Icon Service - Maps POI categories to their icon paths
// Uses OSM-Carto symbols for all POI categories (except custom T-marker for Tilfluktsrom)

import { type POICategory } from './poiService'
import { devError } from '../constants'

/**
 * POI Icon Configuration
 *
 * Icons are sourced from:
 * - Custom SVG: T-marker for Tilfluktsrom (Norwegian civil defense shelters)
 * - OSM-Carto (CC0): OpenStreetMap Carto style symbols (github.com/gravitystorm/openstreetmap-carto)
 *   - Matches OSM tag semantics (e.g., amenity=shelter → shelter.svg)
 *
 * All icons are self-hosted in public/icons/osm-carto/ for GDPR compliance
 */

export interface IconConfig {
  type: 'osmic' | 'osm-carto' | 'custom' | 'material-symbol'
  path?: string // For osmic, osm-carto, and custom types
  symbol?: string // For material-symbol type
  color: string // Hex color for category
}

// Base path for icons (from Vite config)
const ICON_BASE_PATH = '/trakke-pwa/'

export const POI_ICONS: Record<POICategory, IconConfig> = {
  shelters: {
    type: 'custom',
    path: `${ICON_BASE_PATH}icons/custom/t-marker.svg`, // Custom T-marker (Norwegian civil defense shelters)
    color: '#fbbf24' // Yellow
  },

  caves: {
    type: 'osm-carto',
    path: `${ICON_BASE_PATH}icons/osm-carto/cave.svg`, // natural=cave_entrance (OSM-Carto)
    color: '#8b4513' // Saddle brown
  },

  observation_towers: {
    type: 'osm-carto',
    path: `${ICON_BASE_PATH}icons/osm-carto/tower_observation.svg`, // man_made=tower + tower:type=observation (OSM-Carto)
    color: '#4a5568' // Gray
  },

  war_memorials: {
    type: 'osm-carto',
    path: `${ICON_BASE_PATH}icons/osm-carto/fort.svg`, // historic=fort/battlefield/bunker (OSM-Carto)
    color: '#6b7280' // Dark gray
  },

  wilderness_shelters: {
    type: 'osm-carto',
    path: `${ICON_BASE_PATH}icons/osm-carto/shelter.svg`, // amenity=shelter (OSM-Carto)
    color: '#b45309' // Brown/orange
  },

  kulturminner: {
    type: 'osm-carto',
    path: `${ICON_BASE_PATH}icons/geonorge/severdighet.svg`, // Geonorge Severdighet symbol
    color: '#8b7355' // Warm brown (cultural heritage theme)
  }
}

/**
 * Future category icon configurations (commented out until implemented)
 */
export const FUTURE_POI_ICONS = {
  parking: {
    type: 'osmic',
    path: '/trakke-pwa/icons/osmic/parking.svg',
    color: '#60a5fa' // Blue
  },

  alpine_huts: {
    type: 'osmic',
    path: '/trakke-pwa/icons/osmic/alpine-hut.svg',
    color: '#f59e0b' // Amber (DNT orange)
  },

  viewpoints: {
    type: 'osmic',
    path: '/trakke-pwa/icons/osmic/viewpoint.svg',
    color: '#10b981' // Green
  },

  memorials: {
    type: 'osmic',
    path: '/trakke-pwa/icons/osmic/memorial.svg',
    color: '#6b7280' // Dark gray
  }
}

/**
 * Get icon configuration for a POI category
 */
export function getIconConfig(category: POICategory): IconConfig {
  return POI_ICONS[category]
}

/**
 * Load SVG icon from path and return as string
 * Used for converting SVG to canvas for map markers
 */
export async function loadSVGIcon(path: string): Promise<string> {
  try {
    const response = await fetch(path)
    if (!response.ok) {
      throw new Error(`Failed to load icon: ${path}`)
    }
    return await response.text()
  } catch (error) {
    devError(`[IconService] Error loading SVG icon:`, error)
    return ''
  }
}

/**
 * Convert SVG string to Image element
 * Used for canvas rendering in MapLibre markers
 */
export function svgToImage(svgString: string, color?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    // Optionally recolor SVG by replacing fill/stroke attributes
    let processedSVG = svgString
    if (color) {
      processedSVG = svgString.replace(/fill="[^"]*"/g, `fill="${color}"`)
    }

    const blob = new Blob([processedSVG], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG image'))
    }

    img.src = url
  })
}
