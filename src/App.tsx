import { useEffect, useState } from 'react'
import Map from './components/Map'
import { dbService } from './services/dbService'
import './styles/App.css'

function App() {
  const [zenMode] = useState(true) // Zen Mode enabled by default (not toggleable yet)
  const [showWelcome, setShowWelcome] = useState(true)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  useEffect(() => {
    // Initialize IndexedDB on app load
    dbService.init().catch((error) => {
      console.error('Failed to initialize database:', error)
    })
  }, [])

  const handleHeaderClick = () => {
    setShowWelcome(false)
  }

  const toggleHeader = (e: React.MouseEvent) => {
    e.stopPropagation()
    setHeaderCollapsed(!headerCollapsed)
  }

  return (
    <div className={`app ${zenMode ? 'zen-mode' : ''}`}>
      {showWelcome && zenMode && (
        <header
          className={`app-header welcome-header ${headerCollapsed ? 'collapsed' : ''}`}
          onClick={handleHeaderClick}
        >
          <div className="header-content">
            <div className="header-branding">
              <span className="material-symbols-outlined logo-icon">
                forest
              </span>
              <h1 className="app-title">Tråkke</h1>
            </div>
            <p className="app-tagline">Oppdag Norge med turskoa på</p>
          </div>
          <button
            className="header-toggle"
            onClick={toggleHeader}
            aria-label={headerCollapsed ? 'Utvid header' : 'Skjul header'}
          >
            <span className="material-symbols-outlined">
              {headerCollapsed ? 'expand_more' : 'expand_less'}
            </span>
          </button>
        </header>
      )}

      {!zenMode && (
        <header className="app-header">
          <div className="header-content">
            <span className="material-symbols-outlined logo-icon">
              forest
            </span>
            <h1 className="app-title">Tråkke</h1>
          </div>
        </header>
      )}

      <main className="app-main">
        <div className="map-container" id="map">
          <Map zenMode={zenMode} />
        </div>
      </main>
    </div>
  )
}

export default App
