// Search service for Norwegian addresses, places, and coordinates
// Uses Kartverket's open APIs (GDPR compliant - Norwegian government)
// - Place names: Sentralt Stedsnavnregister (SSR) © Kartverket
// - Addresses: Adresseregister © Kartverket

import { levenshteinDistance } from '../utils/levenshtein'
import { devError, devLog } from '../constants'
import proj4 from 'proj4'
import * as mgrs from 'mgrs'

export interface SearchResult {
  id: string
  name: string
  type: 'address' | 'place' | 'coordinates'
  coordinates: [number, number] // [longitude, latitude]
  displayName: string
  subtext?: string
}

class SearchService {
  private readonly KARTVERKET_API = 'https://ws.geonorge.no/stedsnavn/v1/navn'
  private readonly KARTVERKET_ADDRESS_API = 'https://ws.geonorge.no/adresser/v1/sok'

  // Address scoring weights
  private readonly SCORE_EXACT_MATCH = 1000
  private readonly SCORE_STREET_PREFIX = 100
  private readonly SCORE_STREET_CONTAINS = 50
  private readonly SCORE_HOUSE_NUMBER_MATCH = 200
  private readonly SCORE_LETTER_MATCH = 100
  private readonly SCORE_NO_LETTER_BONUS = 50
  private readonly SCORE_WRONG_LETTER_PENALTY = -150
  private readonly SCORE_POOR_MATCH_THRESHOLD = -400
  private readonly SCORE_HOUSE_PREFIX_MATCH = 10
  private readonly SCORE_WRONG_HOUSE_PENALTY = -500

  // Place scoring weights
  private readonly SCORE_PLACE_EXACT = 1000
  private readonly SCORE_PLACE_PREFIX = 800
  private readonly SCORE_PLACE_PREFIX_LENGTH_BONUS_MAX = 100
  private readonly SCORE_PLACE_WORD_MATCH = 600
  private readonly SCORE_PLACE_SUBSTRING = 300
  private readonly SCORE_PLACE_FUZZY_BASE = 400
  private readonly SCORE_PLACE_FUZZY_PENALTY_PER_CHAR = 100
  private readonly SCORE_PLACE_FUZZY_MAX_DISTANCE = 3
  private readonly SCORE_PLACE_OUTDOOR_TYPE_BONUS = 50
  private readonly SCORE_PLACE_SHORT_NAME_BONUS = 30
  private readonly SCORE_PLACE_LONG_NAME_PENALTY = -20
  private readonly SCORE_PLACE_THRESHOLD = 100

  // Search configuration
  private readonly ADDRESS_SEARCH_MULTIPLIER = 3  // Fetch 3x results for filtering
  private readonly PLACE_SEARCH_LIMIT = 30
  private readonly SHORT_NAME_THRESHOLD = 15
  private readonly LONG_NAME_THRESHOLD = 30

  /**
   * Search for addresses using Kartverket's address API with smart filtering
   */
  async searchAddresses(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!query || query.length < 3) return []

    try {
      // Fetch more results to allow for smart filtering
      const url = new URL(this.KARTVERKET_ADDRESS_API)
      url.searchParams.set('sok', query)
      url.searchParams.set('treffPerSide', (limit * this.ADDRESS_SEARCH_MULTIPLIER).toString())
      url.searchParams.set('side', '0')
      url.searchParams.set('asciiKompatibel', 'true')

      const response = await fetch(url.toString())
      if (!response.ok) return []

      const data = await response.json()

      // Map results with raw data for filtering
      const resultsWithRaw = (data.adresser || []).map((addr: any, index: number) => ({
        result: {
          id: `addr-${addr.adressenavn || ''}-${addr.nummer || ''}-${addr.bokstav || ''}-${addr.postnummer || ''}-${index}`,
          name: this.formatAddressName(addr),
          type: 'address' as const,
          coordinates: [
            addr.representasjonspunkt?.lon || 0,
            addr.representasjonspunkt?.lat || 0
          ] as [number, number],
          displayName: this.formatAddressName(addr),
          subtext: this.formatAddressSubtext(addr)
        },
        rawAddr: addr
      }))

      // Smart filtering for addresses
      return this.smartFilterAddresses(resultsWithRaw, query, limit)
    } catch (error) {
      devError('Address search error:', error)
      return []
    }
  }

  /**
   * Smart filter addresses to match user intent
   * Example: "Radarveien 25" should match exactly, not "Radarveien 2"
   */
  private smartFilterAddresses(resultsWithRaw: Array<{ result: SearchResult; rawAddr: any }>, query: string, limit: number): SearchResult[] {
    const queryLower = query.toLowerCase().trim()

    // Extract house number from query if present
    const houseNumberMatch = queryLower.match(/\b(\d+)([a-z]?)$/)
    const queryHouseNumber = houseNumberMatch ? houseNumberMatch[1] : null
    const queryLetter = houseNumberMatch ? houseNumberMatch[2] : null

    // Extract street name (everything before the house number)
    const queryStreet = houseNumberMatch
      ? queryLower.substring(0, houseNumberMatch.index).trim()
      : queryLower

    const scored = resultsWithRaw.map(({ result, rawAddr }) => {
      const score = this.scoreAddress(
        result,
        rawAddr,
        queryLower,
        queryStreet,
        queryHouseNumber,
        queryLetter
      )
      return { result, score }
    })

    // Sort by score and return top results (raw data automatically dropped)
    return scored
      .filter(item => item.score > this.SCORE_POOR_MATCH_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.result)
  }

  /**
   * Score an address result based on how well it matches the query
   */
  private scoreAddress(
    result: SearchResult,
    rawAddr: any,
    queryLower: string,
    queryStreet: string,
    queryHouseNumber: string | null,
    queryLetter: string | null
  ): number {
    const addrLower = result.displayName.toLowerCase()
    const streetName = (rawAddr.adressenavn || '').toLowerCase()
    const houseNum = rawAddr.nummer?.toString() || ''
    const letter = (rawAddr.bokstav || '').toLowerCase()

    let score = 0

    // Exact match bonus (highest priority)
    if (addrLower === queryLower) {
      score += this.SCORE_EXACT_MATCH
    }

    // Street name matching
    if (streetName.startsWith(queryStreet)) {
      score += this.SCORE_STREET_PREFIX
    } else if (streetName.includes(queryStreet)) {
      score += this.SCORE_STREET_CONTAINS
    }

    // House number matching (strict)
    if (queryHouseNumber) {
      if (houseNum === queryHouseNumber) {
        score += this.SCORE_HOUSE_NUMBER_MATCH

        // Letter matching
        if (queryLetter && letter === queryLetter) {
          score += this.SCORE_LETTER_MATCH
        } else if (!queryLetter && !letter) {
          score += this.SCORE_NO_LETTER_BONUS
        } else if (queryLetter && letter !== queryLetter) {
          score += this.SCORE_WRONG_LETTER_PENALTY
        }
      } else if (houseNum.startsWith(queryHouseNumber)) {
        score += this.SCORE_HOUSE_PREFIX_MATCH
      } else {
        score += this.SCORE_WRONG_HOUSE_PENALTY
      }
    }

    // Levenshtein distance for fuzzy matching (minor factor)
    const distance = levenshteinDistance(queryLower, addrLower)
    score -= distance

    return score
  }

  /**
   * Search for place names using Kartverket's name API with smart fuzzy matching
   * Also handles coordinate input for direct navigation
   */
  async searchPlaces(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!query || query.length < 2) return []

    // Check if query is coordinates first
    const coordResult = this.parseCoordinates(query.trim())
    if (coordResult) {
      return [coordResult]
    }

    try {
      // Fetch many more results for better autocomplete/fuzzy matching
      const url = new URL(this.KARTVERKET_API)
      url.searchParams.set('sok', query)
      url.searchParams.set('treffPerSide', this.PLACE_SEARCH_LIMIT.toString())
      url.searchParams.set('side', '1') // API uses 1-indexed pages
      url.searchParams.set('utkoordsys', '4326') // WGS84 (standard lon/lat)
      url.searchParams.set('fuzzy', 'true') // Enable fuzzy matching in API

      const response = await fetch(url.toString())
      if (!response.ok) return []

      const data = await response.json()

      // Map results with raw data for filtering
      const resultsWithRaw = (data.navn || []).map((place: any) => ({
        result: {
          id: `place-${place.stedsnummer || Math.random()}`,
          name: place.skrivemåte || '',
          type: 'place' as const,
          coordinates: [
            place.representasjonspunkt?.øst || 0,  // øst = longitude in WGS84
            place.representasjonspunkt?.nord || 0   // nord = latitude in WGS84
          ] as [number, number],
          displayName: place.skrivemåte || '',
          subtext: this.formatPlaceSubtext(place)
        },
        rawPlace: place
      }))

      // Smart fuzzy filtering for places
      return this.smartFilterPlaces(resultsWithRaw, query, limit)
    } catch (error) {
      devError('Place search error:', error)
      return []
    }
  }

  /**
   * Smart filter places with fuzzy matching
   * Example: "Ulsrudvann" should match "Ulsrud" partially typed
   */
  private smartFilterPlaces(resultsWithRaw: Array<{ result: SearchResult; rawPlace: any }>, query: string, limit: number): SearchResult[] {
    const queryLower = query.toLowerCase().trim()

    const scored = resultsWithRaw.map(({ result, rawPlace }) => {
      const score = this.scorePlace(result, rawPlace, queryLower)
      return { result, score }
    })

    // Sort by score and return top results (raw data automatically dropped)
    return scored
      .filter(item => item.score > this.SCORE_PLACE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.result)
  }

  /**
   * Score a place result based on how well it matches the query
   */
  private scorePlace(
    result: SearchResult,
    rawPlace: any,
    queryLower: string
  ): number {
    const nameLower = result.displayName.toLowerCase()

    let score = 0

    // Exact match (highest priority)
    if (nameLower === queryLower) {
      score += this.SCORE_PLACE_EXACT
    }

    // Direct prefix match (very high priority for autocomplete)
    // Example: "ulsrud" matches "ulsrudvannet"
    if (nameLower.startsWith(queryLower)) {
      score += this.SCORE_PLACE_PREFIX
      // Stronger bonus for closer length match
      const lengthDiff = nameLower.length - queryLower.length
      score += Math.max(0, this.SCORE_PLACE_PREFIX_LENGTH_BONUS_MAX - lengthDiff * 2)
    }

    // Word boundary prefix match (also high priority)
    // Example: "ulsr" could match "Ulsrudvannet" at word start
    const words = nameLower.split(/\s+/)
    let hasWordMatch = false
    for (const word of words) {
      if (word.startsWith(queryLower)) {
        score += this.SCORE_PLACE_WORD_MATCH
        hasWordMatch = true
        break
      }
    }

    // Substring match within name (medium priority)
    if (!hasWordMatch && nameLower.includes(queryLower)) {
      score += this.SCORE_PLACE_SUBSTRING
    }

    // Character-by-character prefix fuzzy match
    // Example: "ulsru" very close to "ulsrud" in "ulsrudvannet"
    const namePrefix = nameLower.substring(0, Math.min(queryLower.length + 5, nameLower.length))
    const distance = levenshteinDistance(queryLower, namePrefix)
    if (distance <= this.SCORE_PLACE_FUZZY_MAX_DISTANCE) {
      score += Math.max(0, this.SCORE_PLACE_FUZZY_BASE - (distance * this.SCORE_PLACE_FUZZY_PENALTY_PER_CHAR))
    }

    // Bonus for popular outdoor place types
    const placeType = (rawPlace.navneobjekttype || '').toLowerCase()
    if (['fjell', 'vann', 'dal', 'bre', 'fjord', 'øy'].includes(placeType)) {
      score += this.SCORE_PLACE_OUTDOOR_TYPE_BONUS
    }

    // Bonus for shorter names (more specific/likely what user wants)
    if (nameLower.length <= this.SHORT_NAME_THRESHOLD) {
      score += this.SCORE_PLACE_SHORT_NAME_BONUS
    }

    // Penalty for very long names (less specific)
    if (nameLower.length > this.LONG_NAME_THRESHOLD) {
      score += this.SCORE_PLACE_LONG_NAME_PENALTY
    }

    return score
  }

  /**
   * Parse coordinates from query string
   * Supports formats: DD, DMS, DDM, UTM, MGRS
   */
  parseCoordinates(query: string): SearchResult | null {
    const cleaned = query.trim()

    // Try each format in order of specificity
    const result =
      this.parseDecimalDegrees(cleaned) ||
      this.parseDMS(cleaned) ||
      this.parseDDM(cleaned) ||
      this.parseUTM(cleaned) ||
      this.parseMGRS(cleaned)

    if (result) {
      devLog('[SearchService] Parsed coordinates:', result)
    }

    return result
  }

  /**
   * Parse Decimal Degrees (DD) format
   * Examples: "59.9139, 10.7522", "59.9139 10.7522", "N59.9139 E10.7522"
   */
  private parseDecimalDegrees(query: string): SearchResult | null {
    // Pattern with direction letters: N59.9139 E10.7522 or 59.9139N 10.7522E
    const dirPattern = /^([NS])?(-?\d+\.?\d*)[°]?([NS])?\s*[,\s]\s*([EWØ])?(-?\d+\.?\d*)[°]?([EWØ])?$/i
    const dirMatch = query.match(dirPattern)

    if (dirMatch) {
      let lat = parseFloat(dirMatch[2])
      let lon = parseFloat(dirMatch[5])

      // Apply direction
      const latDir = (dirMatch[1] || dirMatch[3] || '').toUpperCase()
      const lonDir = (dirMatch[4] || dirMatch[6] || '').toUpperCase()

      if (latDir === 'S') lat = -lat
      if (lonDir === 'W') lon = -lon
      // Ø is Norwegian for East, so no change needed

      return this.createCoordinateResult(lon, lat, 'DD')
    }

    // Simple pattern: "59.9139, 10.7522" or "59.9139 10.7522"
    const simplePattern = /^(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)$/
    const simpleMatch = query.match(simplePattern)

    if (simpleMatch) {
      const first = parseFloat(simpleMatch[1])
      const second = parseFloat(simpleMatch[2])

      // Determine which is lat/lon based on Norwegian bounds
      // Norway: lat ~57-72, lon ~4-32
      let lat: number, lon: number

      if (first >= 57 && first <= 72 && second >= 4 && second <= 32) {
        // First is lat, second is lon (most common: lat, lon)
        lat = first
        lon = second
      } else if (second >= 57 && second <= 72 && first >= 4 && first <= 32) {
        // First is lon, second is lat (lon, lat format)
        lon = first
        lat = second
      } else {
        // Outside Norway bounds, assume lat, lon
        lat = first
        lon = second
      }

      return this.createCoordinateResult(lon, lat, 'DD')
    }

    return null
  }

  /**
   * Parse Degrees Minutes Seconds (DMS) format
   * Examples: "59°54'50.0"N, 10°45'7.9"E", "59°54'50"N 10°45'8"E"
   */
  private parseDMS(query: string): SearchResult | null {
    // Pattern: 59°54'50.0"N, 10°45'7.9"E
    const dmsPattern = /(\d+)[°]\s*(\d+)['\u2032]\s*(\d+\.?\d*)["\u2033]?\s*([NS])\s*[,\s]\s*(\d+)[°]\s*(\d+)['\u2032]\s*(\d+\.?\d*)["\u2033]?\s*([EWØ])/i
    const match = query.match(dmsPattern)

    if (match) {
      const latDeg = parseInt(match[1])
      const latMin = parseInt(match[2])
      const latSec = parseFloat(match[3])
      const latDir = match[4].toUpperCase()

      const lonDeg = parseInt(match[5])
      const lonMin = parseInt(match[6])
      const lonSec = parseFloat(match[7])
      const lonDir = match[8].toUpperCase()

      let lat = latDeg + latMin / 60 + latSec / 3600
      let lon = lonDeg + lonMin / 60 + lonSec / 3600

      if (latDir === 'S') lat = -lat
      if (lonDir === 'W') lon = -lon

      return this.createCoordinateResult(lon, lat, 'DMS')
    }

    return null
  }

  /**
   * Parse Degrees Decimal Minutes (DDM) format
   * Examples: "59°54.833'N, 10°45.132'E"
   */
  private parseDDM(query: string): SearchResult | null {
    // Pattern: 59°54.833'N, 10°45.132'E
    const ddmPattern = /(\d+)[°]\s*(\d+\.?\d*)['\u2032]\s*([NS])\s*[,\s]\s*(\d+)[°]\s*(\d+\.?\d*)['\u2032]\s*([EWØ])/i
    const match = query.match(ddmPattern)

    if (match) {
      const latDeg = parseInt(match[1])
      const latMin = parseFloat(match[2])
      const latDir = match[3].toUpperCase()

      const lonDeg = parseInt(match[4])
      const lonMin = parseFloat(match[5])
      const lonDir = match[6].toUpperCase()

      let lat = latDeg + latMin / 60
      let lon = lonDeg + lonMin / 60

      if (latDir === 'S') lat = -lat
      if (lonDir === 'W') lon = -lon

      return this.createCoordinateResult(lon, lat, 'DDM')
    }

    return null
  }

  /**
   * Parse UTM format
   * Examples: "32V 597423 6643460", "32V597423 6643460", "32 V 597423 6643460"
   */
  private parseUTM(query: string): SearchResult | null {
    // Pattern: zone + band + easting + northing
    // Flexible spacing: "32V 597423 6643460" or "32 V 597423 6643460"
    const utmPattern = /^(\d{1,2})\s*([C-X])\s+(\d{5,7})\s*[EØ]?\s+(\d{6,8})\s*N?$/i
    const match = query.match(utmPattern)

    if (match) {
      const zone = parseInt(match[1])
      const band = match[2].toUpperCase()
      const easting = parseFloat(match[3])
      const northing = parseFloat(match[4])

      // Validate zone (1-60) and band (C-X, excluding I and O)
      if (zone < 1 || zone > 60) return null
      if (!/[C-HJ-NP-X]/.test(band)) return null

      try {
        // Determine hemisphere from band
        const hemisphere = band >= 'N' ? '+north' : '+south'
        const utmProj = `+proj=utm +zone=${zone} ${hemisphere} +datum=WGS84 +units=m +no_defs`

        const [lon, lat] = proj4(utmProj, 'EPSG:4326', [easting, northing])

        return this.createCoordinateResult(lon, lat, 'UTM')
      } catch (error) {
        devError('[SearchService] UTM parse error:', error)
        return null
      }
    }

    return null
  }

  /**
   * Parse MGRS format
   * Examples: "32VNM9742371394", "32V NM 97423 71394"
   */
  private parseMGRS(query: string): SearchResult | null {
    // Remove spaces for MGRS parsing
    const cleanedMgrs = query.replace(/\s+/g, '').toUpperCase()

    // MGRS pattern: zone(1-2 digits) + band(1 letter) + square(2 letters) + coordinates(even digits)
    const mgrsPattern = /^(\d{1,2})([C-X])([A-HJ-NP-Z]{2})(\d{2,10})$/
    const match = cleanedMgrs.match(mgrsPattern)

    if (match) {
      const coords = match[4]
      // Coordinates must be even (split into easting/northing)
      if (coords.length % 2 !== 0) return null

      try {
        const [lon, lat] = mgrs.toPoint(cleanedMgrs)
        return this.createCoordinateResult(lon, lat, 'MGRS')
      } catch (error) {
        devError('[SearchService] MGRS parse error:', error)
        return null
      }
    }

    return null
  }

  /**
   * Create a SearchResult for parsed coordinates
   */
  private createCoordinateResult(lon: number, lat: number, format: string): SearchResult | null {
    // Validate coordinates are reasonable (world bounds, with focus on Norway)
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return null
    }

    // Check if within extended Norway bounds (generous for edge cases)
    const inNorway = lat >= 55 && lat <= 75 && lon >= 2 && lon <= 35
    const locationHint = inNorway ? '' : ' (utenfor Norge)'

    return {
      id: `coord-${lat.toFixed(6)}-${lon.toFixed(6)}`,
      name: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      type: 'coordinates',
      coordinates: [lon, lat],
      displayName: `${lat.toFixed(6)}°N, ${lon.toFixed(6)}°E`,
      subtext: `Koordinater (${format})${locationHint}`
    }
  }

  /**
   * Unified search across addresses, places, and coordinates
   */
  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) return []

    const trimmed = query.trim()

    // Check if query is coordinates
    const coordResult = this.parseCoordinates(trimmed)
    if (coordResult) {
      return [coordResult]
    }

    // Search both addresses and places in parallel
    // Prioritize places (more relevant for outdoor/hiking app)
    const [places, addresses] = await Promise.all([
      this.searchPlaces(trimmed, 6), // More places
      this.searchAddresses(trimmed, 3) // Fewer addresses
    ])

    // Combine results, prioritize places for outdoor use
    return [...places, ...addresses].slice(0, limit)
  }

  /**
   * Format address name for display
   */
  private formatAddressName(addr: any): string {
    const parts: string[] = []

    if (addr.adressenavn) parts.push(addr.adressenavn)
    if (addr.nummer) parts.push(addr.nummer)
    if (addr.bokstav) parts.push(addr.bokstav)

    return parts.join(' ')
  }

  /**
   * Format address subtext (postcode + city)
   */
  private formatAddressSubtext(addr: any): string {
    const parts: string[] = []

    if (addr.postnummer) parts.push(addr.postnummer)
    if (addr.poststed) parts.push(addr.poststed)

    return parts.join(' ')
  }

  /**
   * Format place subtext (type and municipality)
   */
  private formatPlaceSubtext(place: any): string {
    const parts: string[] = []

    if (place.navneobjekttype) parts.push(place.navneobjekttype)
    if (place.kommuner?.[0]?.kommunenavn) {
      parts.push(place.kommuner[0].kommunenavn)
    }

    return parts.join(' · ')
  }
}

export const searchService = new SearchService()
