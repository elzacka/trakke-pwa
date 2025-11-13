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
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<number | undefined>(undefined)
  const resultsListRef = useRef<HTMLDivElement>(null)

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
      setSelectedIndex(-1)
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const searchResults = includeAddresses
          ? await searchService.search(query, 10)
          : await searchService.searchPlaces(query, 10)
        setResults(searchResults)
        setSelectedIndex(-1) // Reset selection when new results arrive
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
        setSelectedIndex(-1)
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

  // Keyboard navigation for search results
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we're in the search sheet
      if (!isOpen || results.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleResultClick(results[selectedIndex])
          } else if (results.length > 0) {
            // If no selection, select first result
            handleResultClick(results[0])
          }
          break
        case 'Tab':
          e.preventDefault()
          if (results.length > 0 && selectedIndex < 0) {
            setSelectedIndex(0)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsListRef.current) {
      const selectedElement = resultsListRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

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
            <div className="search-sheet-results-list" ref={resultsListRef}>
              {results.map((result, index) => (
                <button
                  key={result.id}
                  className={`search-sheet-result-item ${index === selectedIndex ? 'selected' : ''}`}
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
