// Search service for Norwegian addresses, places, and coordinates
// Uses Kartverket's open APIs (GDPR compliant - Norwegian government)
// - Place names: Sentralt Stedsnavnregister (SSR) © Kartverket
// - Addresses: Adresseregister © Kartverket

import { levenshteinDistance } from '../utils/levenshtein'

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
      console.error('Address search error:', error)
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
   * Search for place names using Kartverket's name API with smart fuzzy matching
   */
  async searchPlaces(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!query || query.length < 2) return []

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
      console.error('Place search error:', error)
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
   * Parse coordinates from query string
   * Supports formats: "lat,lon", "lat lon", "UTM"
   */
  parseCoordinates(query: string): SearchResult | null {
    const cleaned = query.trim()

    // Try decimal degrees: "59.9139,10.7522" or "59.9139 10.7522"
    const decimalMatch = cleaned.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/)
    if (decimalMatch) {
      const lat = parseFloat(decimalMatch[1])
      const lon = parseFloat(decimalMatch[2])

      // Validate coordinates (Norway bounds approximately)
      if (lat >= 57 && lat <= 72 && lon >= 4 && lon <= 32) {
        return {
          id: `coord-${lat}-${lon}`,
          name: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          type: 'coordinates',
          coordinates: [lon, lat],
          displayName: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          subtext: 'Koordinater'
        }
      }
    }

    return null
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
