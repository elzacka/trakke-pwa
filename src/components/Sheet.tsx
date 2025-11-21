import { useEffect, useRef, useState } from 'react'
import '../styles/Sheet.css'

export type SheetHeight = 'peek' | 'half' | 'full' | 'closed'

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  peekHeight?: number
  halfHeight?: number
  initialHeight?: SheetHeight
  height?: SheetHeight // External height control
  onHeightChange?: (height: SheetHeight) => void
  showBackdrop?: boolean // Whether to show the backdrop (default: true)
}

const Sheet = ({
  isOpen,
  onClose,
  children,
  peekHeight = 30,
  halfHeight = 50,
  initialHeight = 'peek',
  height: externalHeight,
  onHeightChange,
  showBackdrop = true
}: SheetProps) => {
  const [internalHeight, setInternalHeight] = useState<SheetHeight>(initialHeight)

  // Use external height if provided, otherwise use internal state
  const height = externalHeight !== undefined ? externalHeight : internalHeight

  // Wrapper to handle both internal and external height changes
  const updateHeight = (newHeight: SheetHeight) => {
    if (externalHeight === undefined) {
      setInternalHeight(newHeight)
    }
    onHeightChange?.(newHeight)
  }
  const [isMobile, setIsMobile] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1023)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle Visual Viewport API for keyboard detection (iOS Safari fix)
  useEffect(() => {
    if (!isMobile || typeof window.visualViewport === 'undefined') return

    const handleViewportResize = () => {
      const viewport = window.visualViewport
      if (!viewport) return

      const newHeight = viewport.height
      const offsetTop = viewport.offsetTop || 0

      setViewportHeight(newHeight)

      // Detect keyboard: if visual viewport height is significantly less than window height
      const windowHeight = window.innerHeight
      const keyboardIsVisible = windowHeight - newHeight > 150 // 150px threshold for keyboard
      setKeyboardVisible(keyboardIsVisible)

      // For bottom sheets, the CSS max-height constraints handle keyboard visibility
      // No need to manipulate position or transform
    }

    handleViewportResize() // Initial call
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize)
      window.visualViewport.addEventListener('scroll', handleViewportResize)
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize)
        window.visualViewport.removeEventListener('scroll', handleViewportResize)
      }
    }
  }, [isMobile])

  const handleDragStart = (clientY: number) => {
    startY.current = clientY
    currentY.current = clientY
  }

  const handleDragMove = (clientY: number) => {
    currentY.current = clientY
  }

  const handleDragEnd = () => {
    const diff = startY.current - currentY.current
    const threshold = 50

    if (Math.abs(diff) < threshold) return

    if (isMobile) {
      // Mobile: bottom-positioned sheets
      // Swipe up: finger moves up, currentY < startY, diff > 0 (positive)
      // Swipe down: finger moves down, currentY > startY, diff < 0 (negative)
      if (diff > 0) {
        // Swipe up (expand)
        if (height === 'peek') updateHeight('half')
        else if (height === 'half') updateHeight('full')
      } else {
        // Swipe down (collapse)
        if (height === 'full') updateHeight('half')
        else if (height === 'half') updateHeight('peek')
        else if (height === 'peek') onClose()
      }
    } else {
      // Desktop: centered modal, swipe up to expand, down to close
      if (diff > 0) {
        // Swipe up
        if (height === 'peek') updateHeight('half')
        else if (height === 'half') updateHeight('full')
      } else {
        // Swipe down
        if (height === 'full') updateHeight('half')
        else if (height === 'half') updateHeight('peek')
        else if (height === 'peek') onClose()
      }
    }
  }

  // Touch event handlers
  const handleHandleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY)
  }

  const handleHandleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault() // Prevent page scroll during drag
    handleDragMove(e.touches[0].clientY)
  }

  const handleHandleTouchEnd = () => {
    handleDragEnd()
  }

  // Mouse event handlers for desktop
  const handleHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientY)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleDragMove(moveEvent.clientY)
    }

    const handleMouseUp = () => {
      handleDragEnd()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  useEffect(() => {
    if (externalHeight === undefined) {
      if (isOpen) {
        setInternalHeight(initialHeight)
      } else {
        setInternalHeight('closed')
      }
    }
  }, [isOpen, initialHeight, externalHeight])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen && height === 'closed') return null

  return (
    <>
      {showBackdrop && isOpen && height !== 'closed' && (
        <div
          className="sheet-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        ref={sheetRef}
        className={`sheet sheet-${height} ${isMobile ? 'sheet-mobile' : ''} ${keyboardVisible ? 'keyboard-visible' : ''}`}
        style={{
          ['--peek-height' as string]: `${peekHeight}vh`,
          ['--half-height' as string]: `${halfHeight}vh`,
          ['--viewport-height' as string]: viewportHeight ? `${viewportHeight}px` : '100vh'
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="sheet-handle"
          aria-label="Dra for å justere størrelse"
          onTouchStart={handleHandleTouchStart}
          onTouchMove={handleHandleTouchMove}
          onTouchEnd={handleHandleTouchEnd}
          onMouseDown={handleHandleMouseDown}
        />
        <div className="sheet-content">
          {children}
        </div>
      </div>
    </>
  )
}

export default Sheet
