// Elevation Profile Chart Component for Tråkke PWA
// Uses Chart.js (self-hosted, no CDN) to display elevation profiles
// Refactored for proper lifecycle management and Chart.js integration

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
import { devLog, devError } from '../constants'

// Register Chart.js components once globally (tree-shaking friendly)
Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip)

interface ElevationProfileChartProps {
  elevations: number[]  // Array of elevation values (meters)
  distances: number[]   // Array of cumulative distances (meters)
  className?: string
}

/**
 * Chart Configuration Factory (Single Responsibility Principle)
 * Separates chart configuration logic from lifecycle management
 */
class ChartConfigurationFactory {
  static create(elevations: number[], distances: number[]): ChartConfiguration {
    const distancesKm = distances.map(d => (d / 1000).toFixed(1))

    return {
      type: 'line',
      data: {
        labels: distancesKm,
        datasets: [
          {
            label: 'Høyde (m.o.h.)',
            data: elevations,
            fill: true,
            backgroundColor: 'rgba(62, 69, 51, 0.15)',
            borderColor: 'rgb(62, 69, 51)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1
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
            display: false
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
              maxRotation: 0,
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
  }
}

/**
 * Chart Lifecycle Manager (Single Responsibility Principle)
 * Handles Chart.js instance creation, updates, and cleanup
 */
class ChartLifecycleManager {
  private chart: Chart | null = null

  /**
   * Initialize new Chart.js instance
   * Defensive: checks for existing chart and destroys if found
   */
  initialize(canvas: HTMLCanvasElement, config: ChartConfiguration): void {
    // Defensive: destroy any existing chart before creating new one
    this.destroy()

    // Double-check Chart.js internal registry (defensive programming)
    const existingChart = Chart.getChart(canvas)
    if (existingChart) {
      existingChart.destroy()
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Cannot get 2D context from canvas element')
    }

    this.chart = new Chart(ctx, config)
  }

  /**
   * Update existing chart data without destroying/recreating
   * More efficient than full recreation for data changes
   */
  updateData(elevations: number[], distances: number[]): void {
    if (!this.chart) return

    const distancesKm = distances.map(d => (d / 1000).toFixed(1))

    this.chart.data.labels = distancesKm
    this.chart.data.datasets[0].data = elevations

    // Use Chart.js update with animation disabled for immediate update
    this.chart.update('none')
  }

  /**
   * Check if chart instance exists
   */
  hasChart(): boolean {
    return this.chart !== null
  }

  /**
   * Destroy chart instance and clean up resources
   */
  destroy(): void {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
  }
}

/**
 * ElevationProfileChart Component
 * Displays elevation profile using Chart.js with proper lifecycle management
 */
const ElevationProfileChart = ({ elevations, distances, className }: ElevationProfileChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartManagerRef = useRef(new ChartLifecycleManager())
  const mountedRef = useRef(true)

  // Cleanup on unmount (runs only once)
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      chartManagerRef.current.destroy()
    }
  }, [])

  // Chart initialization and data updates (runs when data changes)
  useEffect(() => {
    // Guard: ensure canvas exists and we have data
    if (!canvasRef.current || elevations.length === 0) return

    // Guard: ensure component is still mounted
    if (!mountedRef.current) return

    const chartManager = chartManagerRef.current

    // Strategy: update existing chart if possible, otherwise initialize new one
    if (chartManager.hasChart()) {
      // Efficient update path: just update data
      chartManager.updateData(elevations, distances)
    } else {
      // Initialization path: create new chart
      try {
        const config = ChartConfigurationFactory.create(elevations, distances)
        chartManager.initialize(canvasRef.current, config)
      } catch (error) {
        devError('Failed to initialize elevation chart:', error)
        // Defensive: ensure cleanup on initialization failure
        chartManager.destroy()
      }
    }

    // Note: No cleanup needed here - cleanup is handled by unmount effect
    // This prevents unnecessary destroy/recreate cycles on data changes
  }, [elevations, distances])

  // Early return for empty state (before canvas renders)
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
      <canvas
        ref={canvasRef}
        aria-label="Høydeprofil for ruten"
      />
    </div>
  )
}

export default ElevationProfileChart
