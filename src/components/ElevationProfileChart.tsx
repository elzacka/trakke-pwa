// Elevation Profile Chart Component for Tråkke PWA
// Uses Chart.js (self-hosted, no CDN) to display elevation profiles

import { useEffect, useRef } from 'react'
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  ChartConfiguration
} from 'chart.js'

// Register Chart.js components (tree-shaking friendly - only import what we need)
Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip)

interface ElevationProfileChartProps {
  elevations: number[]  // Array of elevation values (meters)
  distances: number[]   // Array of cumulative distances (meters)
  className?: string
}

const ElevationProfileChart = ({ elevations, distances, className }: ElevationProfileChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current || elevations.length === 0) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    // Destroy previous chart instance to prevent memory leaks
    if (chartRef.current) {
      chartRef.current.destroy()
    }

    // Convert distances to kilometers for better readability
    const distancesKm = distances.map(d => (d / 1000).toFixed(1))

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: distancesKm,
        datasets: [
          {
            label: 'Høyde (m.o.h.)',
            data: elevations,
            fill: true,
            backgroundColor: 'rgba(62, 69, 51, 0.15)',  // Nordisk ro brand green with transparency
            borderColor: 'rgb(62, 69, 51)',             // Nordisk ro brand green
            borderWidth: 2,
            pointRadius: 0,  // Hide points for cleaner look
            pointHoverRadius: 4,  // Show point on hover
            tension: 0.1     // Slight smoothing
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(62, 69, 51, 1)',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              title: (items) => {
                if (items.length === 0) return ''
                return `${items[0].label} km`
              },
              label: (item) => {
                return `${item.formattedValue} m.o.h.`
              }
            }
          },
          legend: {
            display: false  // Hide legend for cleaner UI
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Avstand (km)',
              color: '#6b7280',
              font: {
                size: 12,
                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }
            },
            grid: {
              display: false
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 11
              },
              maxRotation: 0,  // Keep labels horizontal
              autoSkipPadding: 20
            }
          },
          y: {
            title: {
              display: true,
              text: 'Høyde (m.o.h.)',
              color: '#6b7280',
              font: {
                size: 12,
                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
              drawTicks: false
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 11
              },
              padding: 8
            }
          }
        }
      }
    }

    chartRef.current = new Chart(ctx, config)

    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [elevations, distances])

  if (elevations.length === 0) {
    return (
      <div
        className={className}
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}
      >
        Ingen høydedata tilgjengelig
      </div>
    )
  }

  return (
    <div className={className} style={{ height: '220px', padding: '10px 0' }}>
      <canvas ref={canvasRef} aria-label="Høydeprofil for ruten" />
    </div>
  )
}

export default ElevationProfileChart
