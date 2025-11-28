// Admin Panel Sheet
// Provides login UI and admin actions (Add POI, Add Category)
// Uses magic link authentication via Supabase

import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import { adminAuthService, AdminSession } from '../services/adminAuthService'
import '../styles/AdminSheet.css'

interface AdminSheetProps {
  isOpen: boolean
  onClose: () => void
  onAddPOI: () => void
  onAddCategory: () => void
}

const AdminSheet = ({ isOpen, onClose, onAddPOI, onAddCategory }: AdminSheetProps) => {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = adminAuthService.onAuthStateChange((newSession) => {
      setSession(newSession)
      // Clear magic link sent state when session changes
      if (newSession) {
        setMagicLinkSent(false)
        setMessage(null)
      }
    })

    return () => unsubscribe()
  }, [])

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Skriv inn e-postadresse' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    const result = await adminAuthService.sendMagicLink(email.trim())

    setIsLoading(false)

    if (result.success) {
      setMagicLinkSent(true)
      setMessage({ type: 'success', text: 'Innloggingslenke sendt! Sjekk e-posten din.' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Kunne ikke sende innloggingslenke' })
    }
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    await adminAuthService.signOut()
    setIsLoading(false)
    setEmail('')
    setMagicLinkSent(false)
  }

  const handleAddPOI = () => {
    onClose()
    onAddPOI()
  }

  const handleAddCategory = () => {
    onClose()
    onAddCategory()
  }

  // Check if Supabase is configured
  const isConfigured = adminAuthService.isConfigured()

  return (
    <Sheet isOpen={isOpen} onClose={onClose} peekHeight={40} halfHeight={60}>
      <button className="sheet-close-button" onClick={onClose} aria-label="Lukk">
        <span className="material-symbols-outlined">close</span>
      </button>

      <div className="admin-sheet">
        <h2>
          <span className="material-symbols-outlined">admin_panel_settings</span>
          Admin
        </h2>

        {!isConfigured ? (
          <div className="admin-not-configured">
            <span className="material-symbols-outlined">warning</span>
            <p>Supabase er ikke konfigurert. Legg til VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY i miljøvariabler.</p>
          </div>
        ) : session ? (
          // Logged in - show admin actions
          <div className="admin-actions">
            <div className="admin-user-info">
              <span className="material-symbols-outlined">person</span>
              <span>{session.user.email}</span>
            </div>

            <div className="admin-action-buttons">
              <button className="trk-btn trk-btn--md trk-btn--primary" onClick={handleAddPOI}>
                Legg til sted
              </button>

              <button className="trk-btn trk-btn--md trk-btn--secondary" onClick={handleAddCategory}>
                Ny kategori
              </button>
            </div>

            <button
              className="trk-btn trk-btn--md trk-btn--ghost trk-btn--full-width admin-signout-btn"
              onClick={handleSignOut}
              disabled={isLoading}
            >
              {isLoading ? 'Logger ut...' : 'Logg ut'}
            </button>
          </div>
        ) : (
          // Not logged in - show login form
          <div className="admin-login">
            {magicLinkSent ? (
              <div className="magic-link-sent">
                <span className="material-symbols-outlined">mark_email_read</span>
                <p>Sjekk e-posten din for innloggingslenke.</p>
                <p className="magic-link-hint">Klikk på lenken i e-posten for å logge inn.</p>
                <button
                  className="trk-btn trk-btn--sm trk-btn--secondary"
                  onClick={() => {
                    setMagicLinkSent(false)
                    setMessage(null)
                  }}
                >
                  Prøv igjen
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendMagicLink} className="admin-login-form">
                <p className="admin-login-description">
                  Logg inn med e-post for å administrere steder og kategorier.
                </p>

                <div className="form-group">
                  <label htmlFor="admin-email">E-postadresse</label>
                  <input
                    type="email"
                    id="admin-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@epost.no"
                    autoComplete="email"
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  className="trk-btn trk-btn--md trk-btn--primary trk-btn--full-width"
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? 'Sender...' : 'Send innloggingslenke'}
                </button>
              </form>
            )}
          </div>
        )}

        {message && (
          <div className={`admin-message admin-message-${message.type}`}>
            <span className="material-symbols-outlined">
              {message.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{message.text}</span>
          </div>
        )}
      </div>
    </Sheet>
  )
}

export default AdminSheet
