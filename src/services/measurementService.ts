/**
 * Measurement Service
 *
 * Provides utilities for measuring distances and areas on the map using:
 * - Haversine formula for distance calculations
 * - Spherical polygon area calculation for areas
 */

// Earth radius in meters
const EARTH_RADIUS = 6371000

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate [lon, lat]
 * @param coord2 Second coordinate [lon, lat]
 * @returns Distance in meters
 */
export function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1
  const [lon2, lat2] = coord2

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS * c
}

/**
 * Calculate total distance of a polyline (array of coordinates)
 * @param coordinates Array of coordinates [[lon, lat], ...]
 * @returns Total distance in meters
 */
export function calculatePolylineDistance(
  coordinates: Array<[number, number]>
): number {
  if (coordinates.length < 2) return 0

  let totalDistance = 0
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalDistance += calculateDistance(coordinates[i], coordinates[i + 1])
  }

  return totalDistance
}

/**
 * Calculate area of a polygon using spherical excess formula
 * @param coordinates Array of coordinates forming a closed polygon [[lon, lat], ...]
 * @returns Area in square meters
 */
export function calculatePolygonArea(
  coordinates: Array<[number, number]>
): number {
  if (coordinates.length < 3) return 0

  // Ensure polygon is closed (first and last point are the same)
  const coords = [...coordinates]
  if (
    coords[0][0] !== coords[coords.length - 1][0] ||
    coords[0][1] !== coords[coords.length - 1][1]
  ) {
    coords.push(coords[0])
  }

  // Use spherical polygon area formula
  let area = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i]
    const [lon2, lat2] = coords[i + 1]

    const dLon = toRadians(lon2 - lon1)
    const lat1Rad = toRadians(lat1)
    const lat2Rad = toRadians(lat2)

    area +=
      dLon *
      (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad))
  }

  area = Math.abs(area * EARTH_RADIUS * EARTH_RADIUS / 2)

  return area
}

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted string (e.g., "150 m", "2.5 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Format area for display
 * @param squareMeters Area in square meters
 * @returns Formatted string (e.g., "500 m²", "1.2 km²")
 */
export function formatArea(squareMeters: number): string {
  if (squareMeters < 10000) {
    return `${Math.round(squareMeters)} m²`
  }
  return `${(squareMeters / 1000000).toFixed(2)} km²`
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export const measurementService = {
  calculateDistance,
  calculatePolylineDistance,
  calculatePolygonArea,
  formatDistance,
  formatArea
}
