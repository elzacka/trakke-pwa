import { useState, useEffect, useCallback } from 'react'
import '../styles/FABMenu.css'

interface FABMenuProps {
  onSearchClick: () => void
  onDownloadClick: () => void
  onInfoClick: () => void
  onRoutesClick: () => void
  onCategoryClick: () => void
  onLocationClick: () => void
  onMapPreferencesClick: () => void
  onMeasurementClick: () => void
  onWeatherClick: () => void
  onInstallClick?: () => void
  showInstall?: boolean
  visible?: boolean
  sheetsOpen?: boolean
  menuOpen?: boolean
  onMenuOpenChange?: (open: boolean) => void
}

const FABMenu = ({
  onSearchClick,
  onDownloadClick,
  onInfoClick,
  onRoutesClick,
  onCategoryClick,
  onLocationClick,
  onMapPreferencesClick,
  onMeasurementClick,
  onWeatherClick,
  onInstallClick,
  showInstall = false,
  menuOpen,
  onMenuOpenChange
}: FABMenuProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)

  // Use external state if provided, otherwise use internal state
  const isOpen = menuOpen !== undefined ? menuOpen : internalIsOpen
  const setIsOpen = useCallback((open: boolean) => {
    if (onMenuOpenChange) {
      onMenuOpenChange(open)
    } else {
      setInternalIsOpen(open)
    }
  }, [onMenuOpenChange])

  const handlePrimaryClick = () => {
    // Toggle menu open/close
    setIsOpen(!isOpen)

    // Haptic feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(5)
    }
  }

  const handleMenuItemClick = (action: () => void) => {
    action()
    setIsOpen(false)
    // Light haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(5)
    }
  }

  // Close menu on outside click or escape key (consolidated effect)
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.fab-container')) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, setIsOpen])

  // FAB is always visible
  return (
    <div className="fab-container">
      {isOpen && (
        <div className="fab-menu" role="menu">
          {/* Group 1: Core Navigation */}
          <button
            className="fab-menu-item"
            onClick={() => handleMenuItemClick(onSearchClick)}
            aria-label="Søk"
            role="menuitem"
          >
            <span className="material-symbols-outlined">search</span>
            <span className="fab-menu-label">Søk</span>
          </button>
          <button
            className="fab-menu-item"
            onClick={() => handleMenuItemClick(onLocationClick)}
            aria-label="Min posisjon"
            role="menuitem"
          >
            <span className="material-symbols-outlined">my_location</span>
            <span className="fab-menu-label">Min posisjon</span>
          </button>
          <button
            className="fab-menu-item group-separator"
            onClick={() => handleMenuItemClick(onRoutesClick)}
            aria-label="Ruter og punkter"
            role="menuitem"
          >
            <span className="material-symbols-outlined">route</span>
            <span className="fab-menu-label">Ruter og punkter</span>
          </button>

          {/* Group 2: Active Tools */}
          <button
            className="fab-menu-item"
            onClick={() => handleMenuItemClick(onCategoryClick)}
            aria-label="Kategorier"
            role="menuitem"
          >
            <span className="material-symbols-outlined">layers</span>
            <span className="fab-menu-label">Kategorier</span>
          </button>
          <button
            className="fab-menu-item"
            onClick={() => handleMenuItemClick(onWeatherClick)}
            aria-label="Vær"
            role="menuitem"
          >
            <span className="material-symbols-outlined">partly_cloudy_day</span>
            <span className="fab-menu-label">Vær</span>
          </button>
          <button
            className="fab-menu-item group-separator"
            onClick={() => handleMenuItemClick(onMeasurementClick)}
            aria-label="Måleverktøy"
            role="menuitem"
          >
            <span className="material-symbols-outlined">straighten</span>
            <span className="fab-menu-label">Måleverktøy</span>
          </button>

          {/* Group 3: Configuration */}
          <button
            className="fab-menu-item"
            onClick={() => handleMenuItemClick(onDownloadClick)}
            aria-label="Offline kart"
            role="menuitem"
          >
            <span className="material-symbols-outlined">download</span>
            <span className="fab-menu-label">Offline kart</span>
          </button>
          <button
            className="fab-menu-item group-separator"
            onClick={() => handleMenuItemClick(onMapPreferencesClick)}
            aria-label="Innstillinger"
            role="menuitem"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="fab-menu-label">Innstillinger</span>
          </button>

          {/* Group 4: Meta/Help */}
          <button
            className="fab-menu-item"
            onClick={() => handleMenuItemClick(onInfoClick)}
            aria-label="Informasjon"
            role="menuitem"
          >
            <span className="material-symbols-outlined">info</span>
            <span className="fab-menu-label">Info</span>
          </button>

          {/* Special: Install PWA (conditional) */}
          {showInstall && onInstallClick && (
            <button
              className="fab-menu-item"
              onClick={() => handleMenuItemClick(onInstallClick)}
              aria-label="Installer"
              role="menuitem"
            >
              <span className="material-symbols-outlined">install_mobile</span>
              <span className="fab-menu-label">Installer</span>
            </button>
          )}
        </div>
      )}

      <button
        className="fab-primary"
        onClick={handlePrimaryClick}
        aria-label={isOpen ? 'Lukk meny' : 'Åpne meny'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="material-symbols-outlined">
          {isOpen ? 'close' : 'menu'}
        </span>
      </button>
    </div>
  )
}

export default FABMenu
