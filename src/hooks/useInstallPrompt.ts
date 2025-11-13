import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [platform, setPlatform] = useState<string>('unknown')

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isAndroidDevice = /Android/.test(ua)
    const isChromeDesktop = /Chrome/.test(ua) && !isAndroidDevice && !isIOSDevice

    if (isIOSDevice) setPlatform('ios')
    else if (isAndroidDevice) setPlatform('android')
    else if (isChromeDesktop) setPlatform('desktop-chrome')
    else setPlatform('other')

    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOSInstalled = (window.navigator as any).standalone === true
      return isStandalone || isIOSInstalled
    }

    setIsInstalled(checkInstalled())

    // Capture beforeinstallprompt event (Chromium only)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      console.log('PWA: beforeinstallprompt event captured')
    }

    // Track successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      console.log('PWA: App installed successfully')

      // Privacy-compliant local tracking
      const stats = JSON.parse(localStorage.getItem('trakke-install-stats') || '{}')
      stats.installed = true
      stats.installedAt = new Date().toISOString()
      stats.platform = platform
      localStorage.setItem('trakke-install-stats', JSON.stringify(stats))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [platform])

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.log('PWA: No deferred prompt available')
      return false
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt()

      // Wait for user response
      const { outcome } = await deferredPrompt.userChoice

      console.log(`PWA: User ${outcome} the install prompt`)

      // Privacy-compliant local tracking
      const stats = JSON.parse(localStorage.getItem('trakke-install-stats') || '{}')
      stats[outcome] = (stats[outcome] || 0) + 1
      stats.lastPrompt = new Date().toISOString()
      localStorage.setItem('trakke-install-stats', JSON.stringify(stats))

      // Clear the prompt (can only use once)
      setDeferredPrompt(null)

      return outcome === 'accepted'
    } catch (error) {
      console.error('PWA: Error prompting install:', error)
      return false
    }
  }

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    platform,
    promptInstall
  }
}
