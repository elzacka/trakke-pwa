// Admin Authentication Service
// Uses Supabase Auth with Magic Link for passwordless admin login
// Privacy: EU-hosted Supabase, session stored in localStorage

import { devLog, devError } from '../constants'

// =====================================================
// Type Definitions
// =====================================================

export interface AdminSession {
  user: {
    id: string
    email: string
    role: string
  }
  accessToken: string
  expiresAt: number
}

type AuthStateCallback = (session: AdminSession | null) => void

// =====================================================
// Constants
// =====================================================

const STORAGE_KEY = 'trakke-admin-session'

// Get Supabase config from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// =====================================================
// Admin Auth Service Class
// =====================================================

class AdminAuthService {
  private session: AdminSession | null = null
  private listeners: Set<AuthStateCallback> = new Set()
  private initialized = false

  constructor() {
    // Initialize session from localStorage on load
    this.initSession()
  }

  // =====================================================
  // Initialization
  // =====================================================

  private initSession(): void {
    if (this.initialized) return
    this.initialized = true

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const session = JSON.parse(stored) as AdminSession

        // Check if session is expired
        if (session.expiresAt > Date.now()) {
          this.session = session
          devLog('[AdminAuth] Session restored from storage')
        } else {
          // Clear expired session
          localStorage.removeItem(STORAGE_KEY)
          devLog('[AdminAuth] Expired session cleared')
        }
      }
    } catch (error) {
      devError('[AdminAuth] Failed to restore session:', error)
      localStorage.removeItem(STORAGE_KEY)
    }

    // Check for magic link callback in URL
    this.handleMagicLinkCallback()
  }

  /**
   * Handle magic link callback when user clicks email link
   * Supabase appends tokens to URL fragment: #access_token=...&refresh_token=...
   */
  private async handleMagicLinkCallback(): Promise<void> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      devLog('[AdminAuth] Supabase not configured, skipping callback')
      return
    }

    // Check URL for auth callback
    const hash = window.location.hash
    devLog('[AdminAuth] URL hash check:', hash ? `found (${hash.length} chars)` : 'empty')

    if (!hash || !hash.includes('access_token')) {
      return
    }

    devLog('[AdminAuth] Handling magic link callback')

    try {
      // Parse tokens from URL fragment
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const expiresIn = params.get('expires_in')

      devLog('[AdminAuth] Token parsed:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken })

      if (!accessToken) {
        throw new Error('No access token in callback URL')
      }

      // Fetch user info to verify token and get role
      devLog('[AdminAuth] Fetching user info...')
      const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY
        }
      })

      if (!userResponse.ok) {
        const errorText = await userResponse.text()
        devError('[AdminAuth] User fetch failed:', userResponse.status, errorText)
        throw new Error('Failed to verify access token')
      }

      const userData = await userResponse.json()
      devLog('[AdminAuth] User data:', {
        email: userData.email,
        user_metadata: userData.user_metadata,
        app_metadata: userData.app_metadata
      })

      // Check for admin role in user metadata
      const role = userData.user_metadata?.role || userData.app_metadata?.role || 'user'
      devLog('[AdminAuth] Determined role:', role)

      if (role !== 'admin') {
        devLog('[AdminAuth] User is not admin:', userData.email, '- role:', role)
        // Clean URL but don't create session
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        // Show user feedback about why login didn't work
        setTimeout(() => {
          alert(`Innlogging vellykket for ${userData.email}, men brukeren har ikke admin-tilgang.\n\nFor å gi admin-tilgang: Gå til Supabase Dashboard → Authentication → Users → Velg bruker → Edit User → Sett user_metadata til: {"role": "admin"}`)
        }, 100)
        return
      }

      // Create session
      const expiresAt = Date.now() + (parseInt(expiresIn || '3600') * 1000)

      this.session = {
        user: {
          id: userData.id,
          email: userData.email,
          role: role
        },
        accessToken,
        expiresAt
      }

      // Store session
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session))

      // Store refresh token separately if available
      if (refreshToken) {
        localStorage.setItem(`${STORAGE_KEY}-refresh`, refreshToken)
      }

      // Clean URL
      window.history.replaceState(null, '', window.location.pathname + window.location.search)

      devLog('[AdminAuth] Admin session created:', userData.email)

      // Notify listeners
      this.notifyListeners()

    } catch (error) {
      devError('[AdminAuth] Magic link callback failed:', error)
      // Clean URL even on error
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  // =====================================================
  // Public API
  // =====================================================

  /**
   * Check if Supabase auth is configured
   */
  isConfigured(): boolean {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY)
  }

  /**
   * Send magic link to email address
   * User will receive email with login link
   */
  async sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { success: false, error: 'Supabase ikke konfigurert' }
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: 'Ugyldig e-postadresse' }
    }

    try {
      // Get the current URL for redirect (without hash)
      const redirectTo = window.location.origin + window.location.pathname

      const response = await fetch(`${SUPABASE_URL}/auth/v1/magiclink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email,
          options: {
            redirectTo
          }
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))

        if (response.status === 429) {
          return { success: false, error: 'For mange forsøk. Vent litt før du prøver igjen.' }
        }

        return {
          success: false,
          error: error.message || `Feil ved sending av innloggingslenke (${response.status})`
        }
      }

      devLog('[AdminAuth] Magic link sent to:', email)
      return { success: true }

    } catch (error) {
      devError('[AdminAuth] Failed to send magic link:', error)
      return {
        success: false,
        error: 'Nettverksfeil - sjekk internettforbindelsen'
      }
    }
  }

  /**
   * Sign out and clear session
   */
  async signOut(): Promise<void> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return

    // Try to revoke token on server (best effort)
    if (this.session?.accessToken) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.session.accessToken}`,
            'apikey': SUPABASE_ANON_KEY
          }
        })
      } catch (error) {
        devError('[AdminAuth] Server logout failed (continuing with local logout):', error)
      }
    }

    // Clear local session
    this.session = null
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(`${STORAGE_KEY}-refresh`)

    devLog('[AdminAuth] Signed out')
    this.notifyListeners()
  }

  /**
   * Check if current user is authenticated admin
   */
  isAdmin(): boolean {
    if (!this.session) return false
    if (this.session.expiresAt <= Date.now()) {
      // Session expired, clear it
      this.session = null
      localStorage.removeItem(STORAGE_KEY)
      return false
    }
    return this.session.user.role === 'admin'
  }

  /**
   * Get current session (if valid)
   */
  getSession(): AdminSession | null {
    if (!this.session) return null
    if (this.session.expiresAt <= Date.now()) {
      this.session = null
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return this.session
  }

  /**
   * Get access token for authenticated API requests
   */
  getAccessToken(): string | null {
    const session = this.getSession()
    return session?.accessToken || null
  }

  /**
   * Subscribe to auth state changes
   * Returns unsubscribe function
   */
  onAuthStateChange(callback: AuthStateCallback): () => void {
    this.listeners.add(callback)

    // Immediately call with current state
    callback(this.session)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Notify all listeners of auth state change
   */
  private notifyListeners(): void {
    const session = this.getSession()
    this.listeners.forEach(callback => {
      try {
        callback(session)
      } catch (error) {
        devError('[AdminAuth] Listener callback failed:', error)
      }
    })
  }

  /**
   * Refresh session if close to expiry
   * Call this periodically to keep session alive
   */
  async refreshSession(): Promise<boolean> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false
    if (!this.session) return false

    // Only refresh if within 5 minutes of expiry
    const fiveMinutes = 5 * 60 * 1000
    if (this.session.expiresAt - Date.now() > fiveMinutes) {
      return true // Still valid, no refresh needed
    }

    const refreshToken = localStorage.getItem(`${STORAGE_KEY}-refresh`)
    if (!refreshToken) {
      devLog('[AdminAuth] No refresh token available')
      return false
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      })

      if (!response.ok) {
        throw new Error('Refresh failed')
      }

      const data = await response.json()

      // Update session
      this.session = {
        ...this.session,
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
      }

      // Store updated session
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session))

      if (data.refresh_token) {
        localStorage.setItem(`${STORAGE_KEY}-refresh`, data.refresh_token)
      }

      devLog('[AdminAuth] Session refreshed')
      return true

    } catch (error) {
      devError('[AdminAuth] Failed to refresh session:', error)
      // Don't clear session yet - it might still be valid
      return false
    }
  }
}

// Export singleton instance
export const adminAuthService = new AdminAuthService()
