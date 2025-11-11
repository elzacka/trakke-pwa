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
  onSettingsClick,
  visible = true,
  sheetsOpen = false
}: FABMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const longPressTimer = useRef<number | undefined>(undefined)
  const [isLongPress, setIsLongPress] = useState(false)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handlePrimaryClick = () => {
    if (isLongPress) {
      setIsLongPress(false)
      return
    }

    if (isOpen) {
      setIsOpen(false)
    } else {
      // Primary action: center on user location
      onLocationClick()
    }
  }

  const handleTouchStart = () => {
    setIsLongPress(false)
    longPressTimer.current = window.setTimeout(() => {
      setIsLongPress(true)
      setIsOpen(true)
      // Haptic feedback if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    }, 500) // 500ms long-press
  }

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current)
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

  // On mobile, hide FAB when sheets are open to prevent covering content
  const shouldHide = !visible || (isMobile && sheetsOpen)

  return (
    <div className={`fab-container ${shouldHide ? 'fab-hidden' : ''}`}>
      {isOpen && (
        <div className="fab-menu" role="menu">
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={isOpen ? 'Lukk meny' : 'Min posisjon'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      >
        <span className="material-symbols-outlined">
          {isOpen ? 'close' : 'my_location'}
        </span>
      </button>
    </div>
  )
}

export default FABMenu
