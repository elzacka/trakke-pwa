// Search service for Norwegian addresses, places, and coordinates
// Uses Kartverket's open APIs (GDPR compliant - Norwegian government)
// - Place names: Sentralt Stedsnavnregister (SSR) © Kartverket
// - Addresses: Adresseregister © Kartverket

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

  /**
   * Search for addresses using Kartverket's address API with smart filtering
   */
  async searchAddresses(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!query || query.length < 3) return []

    try {
      // Fetch more results to allow for smart filtering
      const url = new URL(this.KARTVERKET_ADDRESS_API)
      url.searchParams.set('sok', query)
      url.searchParams.set('treffPerSide', (limit * 3).toString()) // Fetch 3x to filter
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
        score += 1000
      }

      // Street name matching
      if (streetName.startsWith(queryStreet)) {
        score += 100 // Prefix match
      } else if (streetName.includes(queryStreet)) {
        score += 50 // Contains match
      }

      // House number matching (strict)
      if (queryHouseNumber) {
        if (houseNum === queryHouseNumber) {
          score += 200 // Exact house number match

          // Letter matching
          if (queryLetter && letter === queryLetter) {
            score += 100 // Exact letter match
          } else if (!queryLetter && !letter) {
            score += 50 // Both have no letter
          } else if (queryLetter && letter !== queryLetter) {
            score -= 150 // Wrong letter penalty
          }
        } else if (houseNum.startsWith(queryHouseNumber)) {
          // Only match if house number is a prefix (e.g., "2" matches "25" only if ambiguous)
          // But penalize heavily to prefer exact matches
          score += 10
        } else {
          // Completely different house number - heavily penalize
          score -= 500
        }
      }

      // Levenshtein distance for fuzzy matching (minor factor)
      const distance = this.levenshteinDistance(queryLower, addrLower)
      score -= distance

      return { result, score }
    })

    // Sort by score and return top results (raw data automatically dropped)
    return scored
      .filter(item => item.score > -400) // Filter out poor matches
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
      url.searchParams.set('treffPerSide', '30') // Fetch more results for better matching
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
        score += 1000
      }

      // Direct prefix match (very high priority for autocomplete)
      // Example: "ulsrud" matches "ulsrudvannet"
      if (nameLower.startsWith(queryLower)) {
        score += 800
        // Stronger bonus for closer length match
        const lengthDiff = nameLower.length - queryLower.length
        score += Math.max(0, 100 - lengthDiff * 2)
      }

      // Word boundary prefix match (also high priority)
      // Example: "ulsr" could match "Ulsrudvannet" at word start
      const words = nameLower.split(/\s+/)
      let hasWordMatch = false
      for (const word of words) {
        if (word.startsWith(queryLower)) {
          score += 600 // Any word starts with query
          hasWordMatch = true
          break
        }
      }

      // Substring match within name (medium priority)
      if (!hasWordMatch && nameLower.includes(queryLower)) {
        score += 300
      }

      // Character-by-character prefix fuzzy match
      // Example: "ulsru" very close to "ulsrud" in "ulsrudvannet"
      const namePrefix = nameLower.substring(0, Math.min(queryLower.length + 5, nameLower.length))
      const distance = this.levenshteinDistance(queryLower, namePrefix)
      if (distance <= 3) {
        // Allow typos and partial matches
        score += Math.max(0, 400 - (distance * 100))
      }

      // Bonus for popular outdoor place types
      const placeType = (rawPlace.navneobjekttype || '').toLowerCase()
      if (['fjell', 'vann', 'dal', 'bre', 'fjord', 'øy'].includes(placeType)) {
        score += 50 // Higher bonus for outdoor/nature features
      }

      // Bonus for shorter names (more specific/likely what user wants)
      if (nameLower.length <= 15) {
        score += 30
      }

      // Penalty for very long names (less specific)
      if (nameLower.length > 30) {
        score -= 20
      }

      return { result, score }
    })

    // Sort by score and return top results (raw data automatically dropped)
    return scored
      .filter(item => item.score > 100) // Higher threshold to filter noise
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.result)
  }

  /**
   * Calculate Levenshtein distance between two strings (edit distance)
   * Used for fuzzy matching to handle typos
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length
    const len2 = str2.length
    const matrix: number[][] = []

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    // Calculate distances
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        )
      }
    }

    return matrix[len1][len2]
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
