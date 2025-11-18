/**
 * Haversine formula for calculating distance between two coordinates
 * Used across the app for route distance calculations
 */

const EARTH_RADIUS = 6371000 // meters

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate [lon, lat]
 * @param coord2 Second coordinate [lon, lat]
 * @returns Distance in meters
 */
export function calculateHaversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1
  const [lon2, lat2] = coord2

  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS * c
}
