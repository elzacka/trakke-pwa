import { useEffect, useRef, useState } from 'react'

export interface SwipeDirection {
  direction: 'up' | 'down' | 'left' | 'right' | null
  distance: number
}

export interface UseGesturesOptions {
  threshold?: number
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onLongPress?: () => void
  longPressDelay?: number
}

export const useGestures = (options: UseGesturesOptions = {}) => {
  const {
    threshold = 50,
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    onLongPress,
    longPressDelay = 500
  } = options

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const longPressTimer = useRef<number | undefined>(undefined)
  const [isLongPress, setIsLongPress] = useState(false)

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    setIsLongPress(false)

    if (onLongPress) {
      longPressTimer.current = window.setTimeout(() => {
        setIsLongPress(true)
        onLongPress()
      }, longPressDelay)
    }
  }

  const handleTouchMove = () => {
    // Cancel long press if user moves finger
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }

    if (isLongPress || !touchStart.current) {
      setIsLongPress(false)
      return
    }

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.current.x
    const deltaY = touch.clientY - touchStart.current.y

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Determine swipe direction
    if (absX > threshold || absY > threshold) {
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipeDown?.()
        } else {
          onSwipeUp?.()
        }
      }
    }

    touchStart.current = null
  }

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight, onLongPress])

  return { isLongPress }
}
