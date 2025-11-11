import maplibregl from 'maplibre-gl'

interface NavigationLocationControlOptions {
  onLocationFound: (position: GeolocationPosition) => void
  onLocationError: (error: GeolocationPositionError) => void
  showCompass?: boolean
  visualizePitch?: boolean
}

/**
 * Custom MapLibre control that combines compass and location button
 * Minimalist mobile-first design with only essential controls
 * Zoom functionality provided by native gestures (pinch, double-tap-drag)
 */
class NavigationLocationControl implements maplibregl.IControl {
  private _map: maplibregl.Map | undefined
  private _container: HTMLDivElement | undefined
  private _visibilityButton: HTMLButtonElement | undefined
  private _compassButton: HTMLButtonElement | undefined
  private _compassIcon: HTMLElement | undefined
  private _scaleDisplay: HTMLDivElement | undefined
  private _zoomDisplay: HTMLDivElement | undefined
  private _locationButton: HTMLButtonElement | undefined
  private _isTracking: boolean = false
  private _watchId: number | null = null
  private _controlsVisible: boolean = true
  private _onLocationFound: (position: GeolocationPosition) => void
  private _onLocationError: (error: GeolocationPositionError) => void
  private _options: NavigationLocationControlOptions

  constructor(options: NavigationLocationControlOptions) {
    this._onLocationFound = options.onLocationFound
    this._onLocationError = options.onLocationError
    this._options = {
      showCompass: options.showCompass !== false,
      visualizePitch: options.visualizePitch !== false,
      ...options
    }
  }

  onAdd(map: maplibregl.Map): HTMLElement {
    this._map = map
    this._container = document.createElement('div')
    this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group'

    // Add visibility toggle button
    this._visibilityButton = this._createButton(
      'maplibregl-ctrl-visibility',
      'Toggle controls visibility',
      () => this._toggleControlsVisibility()
    )
    this._visibilityButton.innerHTML = '<span class="material-symbols-outlined">visibility</span>'
    this._container.appendChild(this._visibilityButton)

    // Add compass button
    if (this._options.showCompass) {
      this._compassButton = this._createButton(
        'maplibregl-ctrl-compass',
        'Reset bearing to north',
        () => {
          if (this._map) {
            if (this._options.visualizePitch) {
              this._map.resetNorthPitch()
            } else {
              this._map.resetNorth()
            }
          }
        }
      )
      this._compassButton.innerHTML = '<span class="material-symbols-outlined">explore</span>'
      this._compassIcon = this._compassButton.querySelector('.material-symbols-outlined') as HTMLElement
      this._container.appendChild(this._compassButton)

      // Update compass rotation when map rotates
      this._map.on('rotate', () => this._updateCompassRotation())
      // Set initial rotation
      this._updateCompassRotation()
    }

    // Add scale display
    this._scaleDisplay = document.createElement('div')
    this._scaleDisplay.className = 'maplibregl-ctrl-scale-display'
    this._container.appendChild(this._scaleDisplay)

    // Add zoom level display
    this._zoomDisplay = document.createElement('div')
    this._zoomDisplay.className = 'maplibregl-ctrl-zoom-display'
    this._container.appendChild(this._zoomDisplay)

    // Update displays when map moves or zooms
    this._map.on('move', () => this._updateDisplays())
    this._map.on('zoom', () => this._updateDisplays())
    // Set initial values
    this._updateDisplays()

    return this._container
  }

  onRemove(): void {
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId)
    }
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container)
    }
    this._map = undefined
  }

  private _createButton(
    className: string,
    ariaLabel: string,
    onClick: () => void
  ): HTMLButtonElement {
    const button = document.createElement('button')
    button.className = `maplibregl-ctrl-icon ${className}`
    button.type = 'button'
    button.setAttribute('aria-label', ariaLabel)
    button.addEventListener('click', onClick)
    return button
  }

  private _toggleTracking(): void {
    if (this._isTracking) {
      this._stopTracking()
    } else {
      this._startTracking()
    }
  }

  private _startTracking(): void {
    if (!navigator.geolocation) {
      alert('Geolokalisering støttes ikke av din nettleser')
      return
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        this._isTracking = true
        this._updateButtonState()
        this._onLocationFound(position)
      },
      (error) => {
        this._isTracking = false
        this._updateButtonState()
        this._onLocationError(error)

        let errorMessage = 'Kunne ikke hente posisjon'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Tilgang til posisjon ble nektet'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Posisjonsinformasjon er ikke tilgjengelig'
            break
          case error.TIMEOUT:
            errorMessage = 'Forespørselen om posisjon tidsavbrutt'
            break
        }
        alert(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )

    this._watchId = id
  }

  private _stopTracking(): void {
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId)
      this._watchId = null
      this._isTracking = false
      this._updateButtonState()
    }
  }

  private _updateButtonState(): void {
    if (!this._locationButton) return

    if (this._isTracking) {
      this._locationButton.classList.add('active')
      this._locationButton.innerHTML = '<span class="material-symbols-outlined">my_location</span>'
      this._locationButton.setAttribute('aria-label', 'Stop tracking location')
    } else {
      this._locationButton.classList.remove('active')
      this._locationButton.innerHTML = '<span class="material-symbols-outlined">location_searching</span>'
      this._locationButton.setAttribute('aria-label', 'Find my location')
    }
  }

  private _updateCompassRotation(): void {
    if (!this._map || !this._compassIcon) return

    const bearing = this._map.getBearing()
    this._compassIcon.style.transform = `rotate(${-bearing}deg)`
  }

  private _updateDisplays(): void {
    if (!this._map) return

    // Update scale display
    if (this._scaleDisplay) {
      const scale = this._getScale()
      this._scaleDisplay.textContent = scale
    }

    // Update zoom display
    if (this._zoomDisplay) {
      const currentZoom = Math.round(this._map.getZoom())
      const maxZoom = this._map.getMaxZoom()
      this._zoomDisplay.textContent = `${currentZoom}/${maxZoom}`
    }
  }

  private _getScale(): string {
    if (!this._map) return ''

    // Use MapLibre's scale calculation method
    // Calculate distance for 100px at center of map
    const container = this._map.getContainer()
    const y = container.clientHeight / 2
    const left = this._map.unproject([0, y])
    const right = this._map.unproject([100, y])
    const maxMeters = left.distanceTo(right)

    // Round to nice numbers like MapLibre's ScaleControl does
    let meters = maxMeters
    const pow10 = Math.pow(10, (`${Math.floor(meters)}`).length - 1)
    meters = Math.floor(meters / pow10) * pow10

    if (meters >= 1000) {
      return `${meters / 1000}km`
    } else {
      return `${meters}m`
    }
  }

  private _toggleControlsVisibility(): void {
    this._controlsVisible = !this._controlsVisible

    // Toggle visibility of other controls
    const elementsToToggle = [
      this._compassButton,
      this._scaleDisplay,
      this._zoomDisplay
    ]

    elementsToToggle.forEach(element => {
      if (element) {
        element.style.display = this._controlsVisible ? 'flex' : 'none'
      }
    })

    // Toggle attribution visibility
    const attribution = document.querySelector('.maplibregl-ctrl-attrib') as HTMLElement
    if (attribution) {
      attribution.style.display = this._controlsVisible ? '' : 'none'
    }

    // Update button icon
    if (this._visibilityButton) {
      const icon = this._controlsVisible ? 'visibility' : 'visibility_off'
      this._visibilityButton.innerHTML = `<span class="material-symbols-outlined">${icon}</span>`
      this._visibilityButton.setAttribute(
        'aria-label',
        this._controlsVisible ? 'Hide controls' : 'Show controls'
      )
    }
  }

  /**
   * Public method to toggle controls visibility (can be called from FAB menu)
   */
  public toggleVisibility(): void {
    this._toggleControlsVisibility()
  }

  /**
   * Get current visibility state
   */
  public isControlsVisible(): boolean {
    return this._controlsVisible
  }
}

export default NavigationLocationControl
