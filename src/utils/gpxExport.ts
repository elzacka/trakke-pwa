// GPX Export Utility for Tråkke PWA
// Generates GPX 1.1 XML from routes and waypoints

import type { Route, Waypoint } from '../services/routeService'

/**
 * Escapes XML special characters to prevent malformed XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Formats a timestamp as ISO 8601 date-time string for GPX
 */
function formatGpxTime(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

/**
 * Generates GPX XML for a single route
 *
 * @param route - Route object with coordinates and metadata
 * @param waypoints - Optional array of waypoints associated with the route
 * @returns GPX 1.1 XML string
 */
export function exportRouteToGpx(route: Route, waypoints: Waypoint[] = []): string {
  const routeName = escapeXml(route.name)
  const routeDesc = route.description ? escapeXml(route.description) : ''

  // GPX header
  let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n'
  gpx += '<gpx version="1.1" creator="Tråkke PWA" '
  gpx += 'xmlns="http://www.topografix.com/GPX/1/1" '
  gpx += 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
  gpx += 'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n'

  // Metadata
  gpx += '  <metadata>\n'
  gpx += `    <name>${routeName}</name>\n`
  if (routeDesc) {
    gpx += `    <desc>${routeDesc}</desc>\n`
  }
  gpx += `    <time>${formatGpxTime(route.createdAt)}</time>\n`
  gpx += '  </metadata>\n'

  // Waypoints (route-associated waypoints)
  if (waypoints.length > 0) {
    waypoints.forEach((waypoint) => {
      const [lon, lat] = waypoint.coordinates
      const wpName = escapeXml(waypoint.name)
      const wpDesc = waypoint.description ? escapeXml(waypoint.description) : ''

      gpx += `  <wpt lat="${lat}" lon="${lon}">\n`
      if (waypoint.elevation !== undefined) {
        gpx += `    <ele>${waypoint.elevation}</ele>\n`
      }
      gpx += `    <time>${formatGpxTime(waypoint.createdAt)}</time>\n`
      gpx += `    <name>${wpName}</name>\n`
      if (wpDesc) {
        gpx += `    <desc>${wpDesc}</desc>\n`
      }
      if (waypoint.category) {
        gpx += `    <type>${escapeXml(waypoint.category)}</type>\n`
      }
      gpx += '  </wpt>\n'
    })
  }

  // Track
  gpx += '  <trk>\n'
  gpx += `    <name>${routeName}</name>\n`
  if (routeDesc) {
    gpx += `    <desc>${routeDesc}</desc>\n`
  }

  // Track segment
  gpx += '    <trkseg>\n'
  route.coordinates.forEach((coord) => {
    const [lon, lat] = coord
    gpx += `      <trkpt lat="${lat}" lon="${lon}">\n`
    // Note: We don't have timestamps for each track point in current schema
    // Could be added in future for recorded tracks
    gpx += '      </trkpt>\n'
  })
  gpx += '    </trkseg>\n'
  gpx += '  </trk>\n'

  // Close GPX
  gpx += '</gpx>'

  return gpx
}

/**
 * Exports multiple routes as a single GPX file with multiple tracks
 * Useful for exporting entire projects
 *
 * @param routes - Array of routes to export
 * @param waypoints - Array of all waypoints (will be filtered by route)
 * @param projectName - Optional name for the GPX file metadata
 * @returns GPX 1.1 XML string
 */
export function exportMultipleRoutesToGpx(
  routes: Route[],
  waypoints: Waypoint[],
  projectName?: string
): string {
  if (routes.length === 0) {
    throw new Error('No routes to export')
  }

  const gpxName = projectName ? escapeXml(projectName) : 'Tråkke Routes'

  // GPX header
  let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n'
  gpx += '<gpx version="1.1" creator="Tråkke PWA" '
  gpx += 'xmlns="http://www.topografix.com/GPX/1/1" '
  gpx += 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
  gpx += 'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n'

  // Metadata
  gpx += '  <metadata>\n'
  gpx += `    <name>${gpxName}</name>\n`
  gpx += `    <time>${formatGpxTime(Date.now())}</time>\n`
  gpx += '  </metadata>\n'

  // All waypoints (avoiding duplicates)
  const uniqueWaypoints = new Map<string, Waypoint>()
  waypoints.forEach(wp => uniqueWaypoints.set(wp.id, wp))

  uniqueWaypoints.forEach((waypoint) => {
    const [lon, lat] = waypoint.coordinates
    const wpName = escapeXml(waypoint.name)
    const wpDesc = waypoint.description ? escapeXml(waypoint.description) : ''

    gpx += `  <wpt lat="${lat}" lon="${lon}">\n`
    if (waypoint.elevation !== undefined) {
      gpx += `    <ele>${waypoint.elevation}</ele>\n`
    }
    gpx += `    <time>${formatGpxTime(waypoint.createdAt)}</time>\n`
    gpx += `    <name>${wpName}</name>\n`
    if (wpDesc) {
      gpx += `    <desc>${wpDesc}</desc>\n`
    }
    if (waypoint.category) {
      gpx += `    <type>${escapeXml(waypoint.category)}</type>\n`
    }
    gpx += '  </wpt>\n'
  })

  // Tracks (one per route)
  routes.forEach((route) => {
    const routeName = escapeXml(route.name)
    const routeDesc = route.description ? escapeXml(route.description) : ''

    gpx += '  <trk>\n'
    gpx += `    <name>${routeName}</name>\n`
    if (routeDesc) {
      gpx += `    <desc>${routeDesc}</desc>\n`
    }

    // Track segment
    gpx += '    <trkseg>\n'
    route.coordinates.forEach((coord) => {
      const [lon, lat] = coord
      gpx += `      <trkpt lat="${lat}" lon="${lon}">\n`
      gpx += '      </trkpt>\n'
    })
    gpx += '    </trkseg>\n'
    gpx += '  </trk>\n'
  })

  // Close GPX
  gpx += '</gpx>'

  return gpx
}

/**
 * Downloads GPX content as a file
 *
 * @param gpxContent - GPX XML string
 * @param filename - Filename for download (without .gpx extension)
 */
export function downloadGpx(gpxContent: string, filename: string): void {
  // Ensure filename is safe and has .gpx extension
  const safeFilename = filename
    .replace(/[^a-z0-9_\-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase()

  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFilename}.gpx`

  // Trigger download
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Validates that a route has the minimum required data for GPX export
 */
export function canExportRoute(route: Route): boolean {
  return route.coordinates && route.coordinates.length >= 2
}
