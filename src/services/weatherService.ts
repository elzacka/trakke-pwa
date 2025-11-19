// Weather Service for Tråkke PWA
// Fetches weather forecasts from MET Norway Locationforecast 2.0 API
// Caches forecasts in IndexedDB for 2 hours

import { dbService } from './dbService'

interface WeatherInstant {
  air_temperature: number
  wind_speed: number
  wind_from_direction: number
  relative_humidity: number
  cloud_area_fraction?: number
}

interface WeatherNext1Hours {
  summary: {
    symbol_code: string
  }
  details?: {
    precipitation_amount?: number
    precipitation_probability?: number
  }
}

interface WeatherTimepoint {
  time: string
  data: {
    instant: {
      details: WeatherInstant
    }
    next_1_hours?: WeatherNext1Hours
    next_6_hours?: WeatherNext1Hours
  }
}

export interface WeatherData {
  temperature: number
  feelsLike?: number
  precipitation: number
  precipitationProbability: number
  windSpeed: number
  windDirection: number
  humidity: number
  cloudCoverage: number
  symbol: string
  time: string
}

export interface WeatherForecast {
  location: { lat: number; lon: number }
  current: WeatherData
  hourly: WeatherData[]  // Next 24 hours
  daily: WeatherData[]   // Next 7 days (6-hour intervals)
  fetchedAt: number
  expiresAt: number
}

class WeatherService {
  private readonly API_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact'
  private readonly CACHE_TTL = 2 * 60 * 60 * 1000  // 2 hours (MET updates hourly)
  private readonly USER_AGENT = 'Trakke-PWA/1.0 (https://github.com/elzacka/trakke-pwa) hei@tazk.no'

  /**
   * Get weather forecast for coordinates
   * Truncates to 4 decimals (MET requirement), caches in IndexedDB
   *
   * PRIVACY NOTE: Direct API calls expose user IP to MET Norway.
   * MET Norway logs IP addresses in Oslo, Norway datacenter.
   */
  async getForecast(lat: number, lon: number): Promise<WeatherForecast> {
    // Truncate coordinates to 4 decimals (~11m accuracy, MET requirement)
    const truncLat = Math.round(lat * 10000) / 10000
    const truncLon = Math.round(lon * 10000) / 10000

    // Check IndexedDB cache
    const cached = await this.getCachedForecast(truncLat, truncLon)
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`[WeatherService] Using cached forecast for ${truncLat},${truncLon}`)
      return cached
    }

    console.log(`[WeatherService] Fetching forecast from MET Norway for ${truncLat},${truncLon}`)

    // Fetch from MET Norway API
    const url = `${this.API_URL}?lat=${truncLat}&lon=${truncLon}`

    try {
      const response = await fetch(url, {
        headers: {
          // Note: User-Agent header is restricted in browsers
          // MET Norway accepts Origin/Referer as fallback
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('For mange forespørsler til MET Norway. Prøv igjen om litt.')
        }
        if (response.status === 403) {
          throw new Error('Tilgang nektet. Koordinatene kan være utenfor Norge.')
        }
        throw new Error(`MET Norway API returnerte ${response.status}: ${response.statusText}`)
      }

      const metData = await response.json()
      const forecast = this.parseMetData(metData, truncLat, truncLon)

      // Cache in IndexedDB
      await this.cacheForecast(forecast)

      return forecast
    } catch (error) {
      console.error('[WeatherService] Failed to fetch weather:', error)

      // Try to return stale cache if available
      if (cached) {
        console.log('[WeatherService] Returning stale cached data due to API error')
        return cached
      }

      throw error
    }
  }

  /**
   * Parse MET Norway API response format
   */
  private parseMetData(data: any, lat: number, lon: number): WeatherForecast {
    const timeseries: WeatherTimepoint[] = data.properties.timeseries

    if (!timeseries || timeseries.length === 0) {
      throw new Error('No weather data available from MET Norway')
    }

    // Find the closest timepoint to current time (MET returns future forecasts)
    const now = new Date()
    let closestIndex = 0
    let minTimeDiff = Math.abs(new Date(timeseries[0].time).getTime() - now.getTime())

    for (let i = 1; i < Math.min(5, timeseries.length); i++) {
      const timeDiff = Math.abs(new Date(timeseries[i].time).getTime() - now.getTime())
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff
        closestIndex = i
      }
    }

    const current = this.parseWeatherTimepoint(timeseries[closestIndex])

    // Next 24 hours (hourly data from current point)
    const hourly = timeseries.slice(closestIndex, closestIndex + 24).map(t => this.parseWeatherTimepoint(t))

    // Next 7 days: Group by calendar day (Norway timezone) and take noon forecast for each day
    const daily = this.groupByDay(timeseries.slice(closestIndex))

    const nowTimestamp = Date.now()
    return {
      location: { lat, lon },
      current,
      hourly,
      daily,
      fetchedAt: nowTimestamp,
      expiresAt: nowTimestamp + this.CACHE_TTL
    }
  }

  /**
   * Group forecast data by calendar day and return one representative forecast per day
   * Takes the forecast closest to noon (12:00) for each unique day
   */
  private groupByDay(timeseries: WeatherTimepoint[]): WeatherData[] {
    const dayMap = new Map<string, WeatherTimepoint[]>()

    // Group timepoints by calendar day (YYYY-MM-DD in Norway timezone)
    for (const timepoint of timeseries) {
      const date = new Date(timepoint.time)
      // Use Norwegian timezone (UTC+1/UTC+2)
      const dateKey = date.toLocaleDateString('no-NO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Europe/Oslo'
      })

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, [])
      }
      dayMap.get(dateKey)!.push(timepoint)
    }

    // For each day, select the forecast closest to noon (12:00)
    const dailyForecasts: WeatherData[] = []

    for (const [, timepoints] of dayMap) {
      // Find timepoint closest to 12:00 (noon)
      let closestToNoon = timepoints[0]
      let minDiff = Math.abs(new Date(timepoints[0].time).getHours() - 12)

      for (const tp of timepoints) {
        const hour = new Date(tp.time).getHours()
        const diff = Math.abs(hour - 12)
        if (diff < minDiff) {
          minDiff = diff
          closestToNoon = tp
        }
      }

      dailyForecasts.push(this.parseWeatherTimepoint(closestToNoon))
    }

    // Return up to 7 days
    return dailyForecasts.slice(0, 7)
  }

  /**
   * Parse individual weather timepoint
   */
  private parseWeatherTimepoint(timepoint: WeatherTimepoint): WeatherData {
    const instant = timepoint.data.instant.details
    const next1h = timepoint.data.next_1_hours
    const next6h = timepoint.data.next_6_hours

    // Use next_1_hours if available, otherwise next_6_hours
    const forecast = next1h || next6h

    return {
      temperature: instant.air_temperature,
      precipitation: forecast?.details?.precipitation_amount || 0,
      precipitationProbability: forecast?.details?.precipitation_probability || 0,
      windSpeed: instant.wind_speed,
      windDirection: instant.wind_from_direction,
      humidity: instant.relative_humidity,
      cloudCoverage: instant.cloud_area_fraction || 0,
      symbol: forecast?.summary?.symbol_code || 'unknown',
      time: timepoint.time
    }
  }

  /**
   * Get weather symbol icon path for display
   * Returns path to MET Norway official SVG weather icon
   * Symbol codes from API directly match icon filenames
   *
   * Icons: © 2015-2017 Yr, MIT License
   * Source: https://github.com/metno/weathericons
   */
  getWeatherIcon(symbol: string): string {
    // Symbol code from API directly maps to SVG filename
    // Use BASE_URL to handle /trakke-pwa/ subdirectory in production
    const baseUrl = import.meta.env.BASE_URL
    return `${baseUrl}icons/weather/${symbol}.svg`
  }

  /**
   * Get human-readable wind direction
   */
  getWindDirection(degrees: number): string {
    const directions = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV']
    const index = Math.round(degrees / 45) % 8
    return directions[index]
  }

  // --- IndexedDB Cache Methods ---

  /**
   * Get cached weather forecast
   */
  private async getCachedForecast(lat: number, lon: number): Promise<WeatherForecast | null> {
    try {
      const db = await dbService.getDatabase()
      const tx = db.transaction('weatherCache', 'readonly')
      const store = tx.objectStore('weatherCache')
      const id = `${lat},${lon}`
      const request = store.get(id)

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result || null)
        }
        request.onerror = () => {
          console.error('[WeatherService] Failed to read from cache:', request.error)
          resolve(null)
        }
      })
    } catch (error) {
      console.error('[WeatherService] Cache read error:', error)
      return null
    }
  }

  /**
   * Cache weather forecast in IndexedDB
   */
  private async cacheForecast(forecast: WeatherForecast): Promise<void> {
    try {
      const db = await dbService.getDatabase()
      const tx = db.transaction('weatherCache', 'readwrite')
      const store = tx.objectStore('weatherCache')
      const id = `${forecast.location.lat},${forecast.location.lon}`

      const cacheEntry = {
        id,
        ...forecast
      }

      const request = store.put(cacheEntry)

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log(`[WeatherService] Cached forecast for ${id}`)
          resolve()
        }
        request.onerror = () => {
          console.error('[WeatherService] Failed to write to cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('[WeatherService] Cache write error:', error)
      throw error
    }
  }

  /**
   * Clear expired cache entries (cleanup utility)
   */
  async clearExpiredCache(): Promise<number> {
    try {
      const db = await dbService.getDatabase()
      const tx = db.transaction('weatherCache', 'readwrite')
      const store = tx.objectStore('weatherCache')
      const index = store.index('expiresAt')

      const now = Date.now()
      const range = IDBKeyRange.upperBound(now)
      const request = index.openCursor(range)

      let deletedCount = 0

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            cursor.delete()
            deletedCount++
            cursor.continue()
          } else {
            console.log(`[WeatherService] Cleared ${deletedCount} expired cache entries`)
            resolve(deletedCount)
          }
        }
        request.onerror = () => {
          console.error('[WeatherService] Failed to clear expired cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('[WeatherService] Cache cleanup error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const weatherService = new WeatherService()
export default weatherService
