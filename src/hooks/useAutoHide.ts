import { useEffect, useState, useRef, useCallback } from 'react'
import { UI_DELAYS } from '../config/timings'

interface UseAutoHideOptions {
  delay?: number
  initialVisible?: boolean
}

export const useAutoHide = (options: UseAutoHideOptions = {}) => {
  const { delay = UI_DELAYS.AUTO_HIDE_CONTROLS, initialVisible = true } = options
  const [visible, setVisible] = useState(initialVisible)
  const timerRef = useRef<number | undefined>(undefined)
  const delayRef = useRef(delay)

  // Sync delay ref
  useEffect(() => {
    delayRef.current = delay
  }, [delay])

  const show = useCallback(() => {
    setVisible(true)
    clearTimeout(timerRef.current)

    timerRef.current = window.setTimeout(() => {
      setVisible(false)
    }, delayRef.current)
  }, [])

  const hide = useCallback(() => {
    setVisible(false)
    clearTimeout(timerRef.current)
  }, [])

  const toggle = useCallback(() => {
    if (visible) {
      hide()
    } else {
      show()
    }
  }, [visible, show, hide])

  // Handle initial visibility without depending on show callback
  useEffect(() => {
    if (initialVisible) {
      setVisible(true)
      clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        setVisible(false)
      }, delayRef.current)
    }

    return () => {
      clearTimeout(timerRef.current)
    }
  }, [initialVisible])

  return { visible, show, hide, toggle }
}
