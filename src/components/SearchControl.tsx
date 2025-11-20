import { useState, useRef, useEffect } from 'react'
import { searchService, SearchResult } from '../services/searchService'
import { devLog, devError } from '../constants'
import '../styles/SearchControl.css'

interface SearchControlProps {
  onResultSelect: (result: SearchResult) => void
}

const SearchControl = ({ onResultSelect }: SearchControlProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [includeAddresses, setIncludeAddresses] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<number | undefined>(undefined)

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length === 0) {
      setResults([])
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const searchResults = includeAddresses
          ? await searchService.search(query, 8)
          : await searchService.searchPlaces(query, 8)
        setResults(searchResults)
      } catch (error) {
        devError('Search error:', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, includeAddresses])

  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    setQuery('')
    setResults([])
    setIncludeAddresses(false)
  }

  return (
    <div className="search-control">
      {!isOpen ? (
        <button
          className="search-toggle"
          onClick={() => setIsOpen(true)}
          title="Søk"
          aria-label="Søk etter adresse eller sted"
        >
          <span className="material-symbols-outlined">search</span>
        </button>
      ) : (
        <div className="search-panel">
          <div className="search-input-wrapper">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder={includeAddresses ? "Søk steder, adresser" : "Søk steder"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Søkefelt"
            />
            <button
              className={`search-filter ${includeAddresses ? 'active' : ''}`}
              onClick={() => setIncludeAddresses(!includeAddresses)}
              title={includeAddresses ? "Kun steder" : "Inkluder adresser"}
              aria-label={includeAddresses ? "Kun steder" : "Inkluder adresser"}
            >
              <span className="material-symbols-outlined">home</span>
            </button>
            <button
              className="search-close"
              onClick={handleClose}
              aria-label="Lukk søk"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {results.length > 0 && (
            <div className="search-results">
              {results.map((result) => (
                <button
                  key={result.id}
                  className="search-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="result-content">
                    <div className="result-name">{result.displayName}</div>
                    {result.subtext && (
                      <div className="result-subtext">{result.subtext}</div>
                    )}
                  </div>
                  <span className="material-symbols-outlined result-icon">
                    {result.type === 'address' ? 'home' : result.type === 'coordinates' ? 'location_on' : 'place'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {isSearching && query.length > 0 && (
            <div className="search-loading">
              <span className="loading-text">Søker...</span>
            </div>
          )}

          {!isSearching && query.length > 0 && results.length === 0 && (
            <div className="search-empty">
              <span className="empty-text">Ingen resultater</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchControl
