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

  const show = useCallback(() => {
    setVisible(true)
    clearTimeout(timerRef.current)

    timerRef.current = window.setTimeout(() => {
      setVisible(false)
    }, delay)
  }, [delay])

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

  useEffect(() => {
    if (initialVisible) {
      show()
    }

    return () => {
      clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVisible]) // Only run on mount/initialVisible change, not when show changes

  return { visible, show, hide, toggle }
}
