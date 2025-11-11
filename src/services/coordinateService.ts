import proj4 from 'proj4'
import * as mgrs from 'mgrs'

export type CoordinateFormat = 'DD' | 'DMS' | 'DDM' | 'UTM' | 'MGRS'

export interface FormattedCoordinate {
  format: CoordinateFormat
  display: string
  copyText: string
}

// Define UTM projection for Norway (zones 32-35)
// Norway spans multiple UTM zones, we'll detect the correct one based on longitude
const getUTMZone = (lon: number): number => {
  return Math.floor((lon + 180) / 6) + 1
}

const getUTMProjection = (lon: number, lat: number): string => {
  const zone = getUTMZone(lon)
  const hemisphere = lat >= 0 ? '+north' : '+south'
  return `+proj=utm +zone=${zone} ${hemisphere} +datum=WGS84 +units=m +no_defs`
}

class CoordinateService {
  // Convert decimal degrees to degrees, minutes, seconds
  private toDMS(decimal: number, isLongitude: boolean): string {
    const absolute = Math.abs(decimal)
    const degrees = Math.floor(absolute)
    const minutesFloat = (absolute - degrees) * 60
    const minutes = Math.floor(minutesFloat)
    const seconds = ((minutesFloat - minutes) * 60).toFixed(1)

    let direction = ''
    if (isLongitude) {
      direction = decimal >= 0 ? 'E' : 'W'
    } else {
      direction = decimal >= 0 ? 'N' : 'S'
    }

    return `${degrees}°${minutes}'${seconds}"${direction}`
  }

  // Convert decimal degrees to degrees and decimal minutes
  private toDDM(decimal: number, isLongitude: boolean): string {
    const absolute = Math.abs(decimal)
    const degrees = Math.floor(absolute)
    const minutes = ((absolute - degrees) * 60).toFixed(3)

    let direction = ''
    if (isLongitude) {
      direction = decimal >= 0 ? 'E' : 'W'
    } else {
      direction = decimal >= 0 ? 'N' : 'S'
    }

    return `${degrees}°${minutes}'${direction}`
  }

  // Format as decimal degrees
  formatDD(lon: number, lat: number): FormattedCoordinate {
    const display = `${lat.toFixed(6)}°N, ${lon.toFixed(6)}°E`
    const copyText = `${lat.toFixed(6)}, ${lon.toFixed(6)}`

    return {
      format: 'DD',
      display,
      copyText
    }
  }

  // Format as degrees, minutes, seconds
  formatDMS(lon: number, lat: number): FormattedCoordinate {
    const latDMS = this.toDMS(lat, false)
    const lonDMS = this.toDMS(lon, true)
    const display = `${latDMS}, ${lonDMS}`

    return {
      format: 'DMS',
      display,
      copyText: display
    }
  }

  // Format as degrees and decimal minutes
  formatDDM(lon: number, lat: number): FormattedCoordinate {
    const latDDM = this.toDDM(lat, false)
    const lonDDM = this.toDDM(lon, true)
    const display = `${latDDM}, ${lonDDM}`

    return {
      format: 'DDM',
      display,
      copyText: display
    }
  }

  // Format as UTM
  formatUTM(lon: number, lat: number): FormattedCoordinate {
    try {
      const utmProj = getUTMProjection(lon, lat)
      const [easting, northing] = proj4('EPSG:4326', utmProj, [lon, lat])
      const zone = getUTMZone(lon)
      const band = this.getUTMLatitudeBand(lat)

      const display = `${zone}${band} ${Math.round(easting)}E ${Math.round(northing)}N`
      const copyText = `${zone}${band} ${Math.round(easting)} ${Math.round(northing)}`

      return {
        format: 'UTM',
        display,
        copyText
      }
    } catch (error) {
      console.error('UTM conversion error:', error)
      return {
        format: 'UTM',
        display: 'UTM conversion error',
        copyText: ''
      }
    }
  }

  // Format as MGRS
  formatMGRS(lon: number, lat: number): FormattedCoordinate {
    try {
      const mgrsString = mgrs.forward([lon, lat], 5) // 5 digits = 1m precision
      // Format: 33WWM9342171394
      // Split into: Zone(33) Band(W) Square(WM) Easting(93421) Northing(71394)
      const formatted = mgrsString.replace(/(\d{2})([A-Z])([A-Z]{2})(\d{5})(\d{5})/, '$1$2 $3 $4 $5')

      return {
        format: 'MGRS',
        display: formatted,
        copyText: mgrsString
      }
    } catch (error) {
      console.error('MGRS conversion error:', error)
      return {
        format: 'MGRS',
        display: 'MGRS conversion error',
        copyText: ''
      }
    }
  }

  // Get UTM latitude band letter
  private getUTMLatitudeBand(lat: number): string {
    const bands = 'CDEFGHJKLMNPQRSTUVWX'
    const index = Math.floor((lat + 80) / 8)
    return bands[Math.max(0, Math.min(index, bands.length - 1))]
  }

  // Format coordinates in the specified format
  format(lon: number, lat: number, format: CoordinateFormat): FormattedCoordinate {
    switch (format) {
      case 'DD':
        return this.formatDD(lon, lat)
      case 'DMS':
        return this.formatDMS(lon, lat)
      case 'DDM':
        return this.formatDDM(lon, lat)
      case 'UTM':
        return this.formatUTM(lon, lat)
      case 'MGRS':
        return this.formatMGRS(lon, lat)
      default:
        return this.formatDD(lon, lat)
    }
  }

  // Get all formats for a coordinate
  getAllFormats(lon: number, lat: number): FormattedCoordinate[] {
    return [
      this.formatDD(lon, lat),
      this.formatDMS(lon, lat),
      this.formatDDM(lon, lat),
      this.formatUTM(lon, lat),
      this.formatMGRS(lon, lat)
    ]
  }

  // Get format display name
  getFormatName(format: CoordinateFormat): string {
    switch (format) {
      case 'DD':
        return 'Desimalgrader (DD)'
      case 'DMS':
        return 'Grader, minutter, sekunder (DMS)'
      case 'DDM':
        return 'Grader, desimalminutter (DDM)'
      case 'UTM':
        return 'UTM'
      case 'MGRS':
        return 'MGRS'
      default:
        return format
    }
  }

  // Get format description
  getFormatDescription(format: CoordinateFormat): string {
    switch (format) {
      case 'DD':
        return 'Standard GPS-format'
      case 'DMS':
        return 'Tradisjonell navigasjon'
      case 'DDM':
        return 'Sjøkart og navigasjon'
      case 'UTM':
        return 'Nødetater og forvaltning'
      case 'MGRS':
        return 'Militært og presisjon'
      default:
        return ''
    }
  }
}

export const coordinateService = new CoordinateService()
