import { useEffect, useRef, useState } from 'react'
import '../styles/BottomSheet.css'

export type SheetHeight = 'peek' | 'half' | 'full' | 'closed'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  peekHeight?: number
  halfHeight?: number
  initialHeight?: SheetHeight
  height?: SheetHeight // External height control
  onHeightChange?: (height: SheetHeight) => void
}

const BottomSheet = ({
  isOpen,
  onClose,
  children,
  peekHeight = 30,
  halfHeight = 50,
  initialHeight = 'peek',
  height: externalHeight,
  onHeightChange
}: BottomSheetProps) => {
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

      // Update sheet position if exists
      if (sheetRef.current && keyboardIsVisible) {
        // Position sheet at the top of visual viewport
        sheetRef.current.style.top = `${offsetTop}px`
      } else if (sheetRef.current) {
        sheetRef.current.style.top = '0px'
      }
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

  const handleHandleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    currentY.current = e.touches[0].clientY
  }

  const handleHandleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY
  }

  const handleHandleTouchEnd = () => {
    const diff = startY.current - currentY.current
    const threshold = 50

    if (Math.abs(diff) < threshold) return

    if (isMobile) {
      // Mobile: sheets at top, swipe down to expand, up to close
      if (diff < 0) {
        // Swipe down (expand)
        if (height === 'peek') updateHeight('half')
        else if (height === 'half') updateHeight('full')
      } else {
        // Swipe up (collapse)
        if (height === 'full') updateHeight('half')
        else if (height === 'half') updateHeight('peek')
        else if (height === 'peek') onClose()
      }
    } else {
      // Desktop: sheets at bottom, swipe up to expand, down to close
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
      {isOpen && height !== 'closed' && (
        <div
          className="bottom-sheet-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        ref={sheetRef}
        className={`bottom-sheet bottom-sheet-${height} ${isMobile ? 'bottom-sheet-mobile' : ''} ${keyboardVisible ? 'keyboard-visible' : ''}`}
        style={{
          ['--peek-height' as string]: `${peekHeight}vh`,
          ['--half-height' as string]: `${halfHeight}vh`,
          ['--viewport-height' as string]: viewportHeight ? `${viewportHeight}px` : '100vh'
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bottom-sheet-handle"
          aria-label="Dra for å justere størrelse"
          onTouchStart={handleHandleTouchStart}
          onTouchMove={handleHandleTouchMove}
          onTouchEnd={handleHandleTouchEnd}
        />
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </>
  )
}

export default BottomSheet
