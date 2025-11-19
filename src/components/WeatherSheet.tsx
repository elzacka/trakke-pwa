// Weather Sheet Component for Tråkke PWA
// Detailed weather forecast in bottom sheet

import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import weatherService, { type WeatherForecast } from '../services/weatherService'
import '../styles/WeatherSheet.css'

interface WeatherSheetProps {
  isOpen: boolean
  onClose: () => void
  lat: number
  lon: number
}

const WeatherSheet = ({ isOpen, onClose, lat, lon }: WeatherSheetProps) => {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const loadForecast = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await weatherService.getForecast(lat, lon)
        setForecast(data)
      } catch (err) {
        console.error('[WeatherSheet] Failed to load forecast:', err)
        setError(err instanceof Error ? err.message : 'Kunne ikke laste værvarsel')
      } finally {
        setLoading(false)
      }
    }

    loadForecast()
  }, [isOpen, lat, lon])

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleDateString('no-NO', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} peekHeight={40} halfHeight={70}>
      <div className="weather-sheet">
        <div className="weather-sheet-content">
          {loading && (
            <div className="weather-loading">
              <span className="material-symbols-outlined spinning">progress_activity</span>
              <p>Laster værdata...</p>
            </div>
          )}

          {error && (
            <div className="weather-error">
              <span className="material-symbols-outlined">cloud_off</span>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && forecast && (
            <>
              {/* Current Weather */}
              <section className="weather-section">
                <h3>Nå</h3>
                <div className="weather-current">
                  <div className="weather-current-main">
                    <div className="weather-current-icon">
                      <img
                        src={weatherService.getWeatherIcon(forecast.current.symbol)}
                        alt={forecast.current.symbol}
                        className="weather-icon weather-icon-large"
                      />
                    </div>
                    <div className="weather-current-temp">
                      {Math.round(forecast.current.temperature)}°
                    </div>
                  </div>
                  <div className="weather-current-details">
                    <div className="weather-detail">
                      <span className="material-symbols-outlined">air</span>
                      <span>
                        {Math.round(forecast.current.windSpeed)} m/s{' '}
                        {weatherService.getWindDirection(forecast.current.windDirection)}
                      </span>
                    </div>
                    <div className="weather-detail">
                      <span className="material-symbols-outlined">water_drop</span>
                      <span>{Math.round(forecast.current.precipitationProbability)}% nedbør</span>
                    </div>
                    <div className="weather-detail">
                      <span className="material-symbols-outlined">humidity_percentage</span>
                      <span>{Math.round(forecast.current.humidity)}% fuktighet</span>
                    </div>
                    <div className="weather-detail">
                      <span className="material-symbols-outlined">cloud</span>
                      <span>{Math.round(forecast.current.cloudCoverage)}% skydekke</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Hourly Forecast */}
              <section className="weather-section">
                <h3>Neste 24 timer</h3>
                <div className="weather-hourly">
                  {forecast.hourly.slice(0, 12).map((hour, index) => (
                    <div key={index} className="weather-hour">
                      <div className="weather-hour-time">{formatTime(hour.time)}</div>
                      <div className="weather-hour-icon">
                        <img
                          src={weatherService.getWeatherIcon(hour.symbol)}
                          alt={hour.symbol}
                          className="weather-icon weather-icon-small"
                        />
                      </div>
                      <div className="weather-hour-temp">
                        {Math.round(hour.temperature)}°
                      </div>
                      {hour.precipitationProbability > 0 && (
                        <div className="weather-hour-precip">
                          {Math.round(hour.precipitationProbability)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Daily Forecast */}
              <section className="weather-section">
                <h3>Neste 7 dager</h3>
                <div className="weather-daily">
                  {forecast.daily.map((day, index) => (
                    <div key={index} className="weather-day">
                      <div className="weather-day-date">{formatDate(day.time)}</div>
                      <div className="weather-day-icon">
                        <img
                          src={weatherService.getWeatherIcon(day.symbol)}
                          alt={day.symbol}
                          className="weather-icon weather-icon-medium"
                        />
                      </div>
                      <div className="weather-day-temp">
                        {Math.round(day.temperature)}°
                      </div>
                      <div className="weather-day-details">
                        <span className="material-symbols-outlined">air</span>
                        {Math.round(day.windSpeed)} m/s
                        {day.precipitationProbability > 0 && (
                          <>
                            {' · '}
                            <span className="material-symbols-outlined">water_drop</span>
                            {Math.round(day.precipitationProbability)}%
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Attribution */}
              <div className="weather-attribution">
                <p>
                  Værdata fra{' '}
                  <a
                    href="https://www.met.no/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    MET Norway
                  </a>
                  . Oppdatert:{' '}
                  {new Date(forecast.fetchedAt).toLocaleString('no-NO', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Sheet>
  )
}

export default WeatherSheet
