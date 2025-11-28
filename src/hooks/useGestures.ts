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

  // Use refs to store latest callback values to avoid stale closures
  const thresholdRef = useRef(threshold)
  const longPressDelayRef = useRef(longPressDelay)
  const onSwipeUpRef = useRef(onSwipeUp)
  const onSwipeDownRef = useRef(onSwipeDown)
  const onSwipeLeftRef = useRef(onSwipeLeft)
  const onSwipeRightRef = useRef(onSwipeRight)
  const onLongPressRef = useRef(onLongPress)
  const isLongPressRef = useRef(isLongPress)

  // Keep refs in sync with latest values
  useEffect(() => {
    thresholdRef.current = threshold
    longPressDelayRef.current = longPressDelay
    onSwipeUpRef.current = onSwipeUp
    onSwipeDownRef.current = onSwipeDown
    onSwipeLeftRef.current = onSwipeLeft
    onSwipeRightRef.current = onSwipeRight
    onLongPressRef.current = onLongPress
  })

  // Keep isLongPress ref in sync
  useEffect(() => {
    isLongPressRef.current = isLongPress
  }, [isLongPress])

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStart.current = { x: touch.clientX, y: touch.clientY }
      setIsLongPress(false)
      isLongPressRef.current = false

      if (onLongPressRef.current) {
        longPressTimer.current = window.setTimeout(() => {
          setIsLongPress(true)
          isLongPressRef.current = true
          onLongPressRef.current?.()
        }, longPressDelayRef.current)
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

      if (isLongPressRef.current || !touchStart.current) {
        setIsLongPress(false)
        isLongPressRef.current = false
        return
      }

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStart.current.x
      const deltaY = touch.clientY - touchStart.current.y

      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      const currentThreshold = thresholdRef.current

      // Determine swipe direction
      if (absX > currentThreshold || absY > currentThreshold) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) {
            onSwipeRightRef.current?.()
          } else {
            onSwipeLeftRef.current?.()
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            onSwipeDownRef.current?.()
          } else {
            onSwipeUpRef.current?.()
          }
        }
      }

      touchStart.current = null
    }

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
  }, []) // Empty dependency array - handlers use refs

  return { isLongPress }
}
