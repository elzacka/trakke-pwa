import { useState, useEffect, useRef } from 'react'
import '../styles/FABMenu.css'

interface FABMenuProps {
  onSearchClick: () => void
  onDownloadClick: () => void
  onInfoClick: () => void
  onRoutesClick: () => void
  onCategoryClick: () => void
  onLocationClick: () => void
  onResetNorthClick: () => void
  onSettingsClick: () => void
  visible?: boolean
  sheetsOpen?: boolean
}

const FABMenu = ({
  onSearchClick,
  onDownloadClick,
  onInfoClick,
  onRoutesClick,
  onCategoryClick,
  onLocationClick,
  onResetNorthClick,
  onSettingsClick
}: FABMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)

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

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (isOpen && !target.closest('.fab-container')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // FAB is always visible
  return (
    <div className="fab-container">
      {isOpen && (
        <div className="fab-menu" role="menu">
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
            onClick={() => handleMenuItemClick(onRoutesClick)}
            aria-label="Ruter og punkter"
            role="menuitem"
          >
            <span className="material-symbols-outlined">route</span>
            <span className="fab-menu-label">Ruter</span>
          </button>
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
            onClick={() => handleMenuItemClick(onDownloadClick)}
            aria-label="Last ned kart"
            role="menuitem"
          >
            <span className="material-symbols-outlined">download</span>
            <span className="fab-menu-label">Last ned</span>
          </button>
          <button
            className="fab-menu-item"
            onClick={() => handleMenuItemClick(onResetNorthClick)}
            aria-label="Tilbakestill retning"
            role="menuitem"
          >
            <span className="material-symbols-outlined">explore</span>
            <span className="fab-menu-label">Tilbakestill</span>
          </button>
          <button
            className="fab-menu-item"
            onClick={() => handleMenuItemClick(onSettingsClick)}
            aria-label="Innstillinger"
            role="menuitem"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="fab-menu-label">Innstillinger</span>
          </button>
          <button
            className="fab-menu-item"
            onClick={() => handleMenuItemClick(onInfoClick)}
            aria-label="Informasjon"
            role="menuitem"
          >
            <span className="material-symbols-outlined">info</span>
            <span className="fab-menu-label">Info</span>
          </button>
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
