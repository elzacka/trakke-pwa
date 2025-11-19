// Weather Widget Component for Tråkke PWA
// Compact weather display on map (top-right, below compass)

import { useState, useEffect } from 'react'
import weatherService, { type WeatherForecast } from '../services/weatherService'
import '../styles/WeatherWidget.css'

interface WeatherWidgetProps {
  lat: number
  lon: number
  onExpand?: () => void
}

const WeatherWidget = ({ lat, lon, onExpand }: WeatherWidgetProps) => {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadWeather = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await weatherService.getForecast(lat, lon)
        setForecast(data)
      } catch (err) {
        console.error('[WeatherWidget] Failed to load weather:', err)
        setError(err instanceof Error ? err.message : 'Kunne ikke laste værdata')
      } finally {
        setLoading(false)
      }
    }

    loadWeather()
  }, [lat, lon])

  if (loading) {
    return (
      <div className="weather-widget loading">
        <span className="material-symbols-outlined spinning">progress_activity</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="weather-widget error" title={error}>
        <span className="material-symbols-outlined">cloud_off</span>
      </div>
    )
  }

  if (!forecast) return null

  const { current } = forecast
  const emoji = weatherService.getWeatherEmoji(current.symbol)
  const temp = Math.round(current.temperature)

  return (
    <div
      className="weather-widget"
      onClick={onExpand}
      role="button"
      tabIndex={0}
      aria-label={`Vær: ${temp} grader, ${emoji}. Klikk for detaljer`}
      title="Klikk for værdetaljer"
    >
      <div className="weather-icon">{emoji}</div>
      <div className="weather-temp">{temp}°</div>
    </div>
  )
}

export default WeatherWidget
