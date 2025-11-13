import { useState, useRef, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { searchService, SearchResult } from '../services/searchService'
import '../styles/SearchSheet.css'

interface SearchSheetProps {
  isOpen: boolean
  onClose: () => void
  onResultSelect: (result: SearchResult) => void
}

const SearchSheet = ({ isOpen, onClose, onResultSelect }: SearchSheetProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [includeAddresses, setIncludeAddresses] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<number | undefined>(undefined)

  // Focus input when opened or when address search is toggled
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, includeAddresses])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length === 0) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const searchResults = includeAddresses
          ? await searchService.search(query, 10)
          : await searchService.searchPlaces(query, 10)
        setResults(searchResults)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        setIsSearching(false) // Reset searching state on cleanup
      }
    }
  }, [query, includeAddresses])

  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result)
    setQuery('')
    setResults([])
    onClose()
  }

  const handleClose = () => {
    setQuery('')
    setResults([])
    setIncludeAddresses(false)
    onClose()
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      peekHeight={30}
      halfHeight={60}
      initialHeight="peek"
    >
      <div className="search-sheet">
        <div className="search-sheet-header">
          <h2>Søk</h2>
          <button
            className="search-sheet-close"
            onClick={handleClose}
            aria-label="Lukk"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="search-sheet-input-container">
          <div className="search-sheet-input-wrapper">
            <span className="material-symbols-outlined search-sheet-icon">search</span>
            <input
              ref={inputRef}
              type="text"
              className="search-sheet-input"
              placeholder={includeAddresses ? 'Søk steder, adresser' : 'Søk steder'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Søkefelt"
            />
            <button
              className={`search-sheet-filter ${includeAddresses ? 'active' : ''}`}
              onClick={() => setIncludeAddresses(!includeAddresses)}
              title={includeAddresses ? 'Kun steder' : 'Inkluder adresser'}
              aria-label={includeAddresses ? 'Kun steder' : 'Inkluder adresser'}
            >
              <span className="material-symbols-outlined">home</span>
            </button>
          </div>
          <div className="search-sheet-hint">
            <span className="hint-text">
              Trykk <span className="material-symbols-outlined hint-home-icon">home</span> for å inkludere adresser
            </span>
          </div>
        </div>

        <div className="search-sheet-results">
          {isSearching && query.length > 0 && (
            <div className="search-sheet-loading">
              <span className="loading-text">Søker...</span>
            </div>
          )}

          {!isSearching && query.length > 0 && results.length === 0 && (
            <div className="search-sheet-empty">
              <span className="empty-text">Ingen resultater</span>
            </div>
          )}

          {results.length > 0 && (
            <div className="search-sheet-results-list">
              {results.map((result) => (
                <button
                  key={result.id}
                  className="search-sheet-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="result-content">
                    <div className="result-name">{result.displayName}</div>
                    {result.subtext && (
                      <div className="result-subtext">{result.subtext}</div>
                    )}
                  </div>
                  <span className="material-symbols-outlined result-icon">
                    {result.type === 'address'
                      ? 'home'
                      : result.type === 'coordinates'
                      ? 'location_on'
                      : 'place'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

export default SearchSheet
