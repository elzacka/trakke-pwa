import { useEffect, useState, useRef, useCallback } from 'react'

interface UseAutoHideOptions {
  delay?: number
  initialVisible?: boolean
}

export const useAutoHide = (options: UseAutoHideOptions = {}) => {
  const { delay = 5000, initialVisible = true } = options
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
  }, [initialVisible]) // Removed show from dependencies - it's stable enough

  return { visible, show, hide, toggle }
}
