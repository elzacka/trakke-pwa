// Haptics hook with progressive enhancement
// Vibration API support: Chrome, Firefox (NOT iOS Safari)

export const useHaptics = () => {
  const isSupported = (): boolean => {
    return 'vibrate' in navigator
  }

  const vibrate = (pattern: number | number[]): boolean => {
    if (isSupported()) {
      return navigator.vibrate(pattern)
    }
    return false
  }

  // Predefined haptic patterns
  const light = (): boolean => vibrate(10)

  const medium = (): boolean => vibrate(20)

  const heavy = (): boolean => vibrate(40)

  const success = (): boolean => vibrate([10, 50, 20])

  const error = (): boolean => vibrate([20, 100, 20, 100, 20])

  const notification = (): boolean => vibrate([10, 50, 10])

  const selection = (): boolean => vibrate(5)

  return {
    vibrate,
    light,
    medium,
    heavy,
    success,
    error,
    notification,
    selection,
    isSupported: isSupported()
  }
}
