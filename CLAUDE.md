# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Index - Single Sources of Truth

Tråkke documentation follows a strict "single source of truth" principle. Each document has a specific purpose:

| Document                                                       | Purpose                   | Authoritative For                                                                                                                                                                                                                   |
| -------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[README.md](README.md)**                                     | User/contributor overview | Features, installation, quick start                                                                                                                                                                                                 |
| **[CLAUDE.md](CLAUDE.md)** (this file)                         | AI assistant context      | Architecture patterns, IndexedDB schema, code examples, component structure                                                                                                                                                         |
| **[PRIVACY_BY_DESIGN.md](PRIVACY_BY_DESIGN.md)**               | Privacy/GDPR compliance   | [External API Registry](PRIVACY_BY_DESIGN.md#external-api-registry), [CSP configuration](PRIVACY_BY_DESIGN.md#2-content-security-policy-csp), [Service Worker privacy](PRIVACY_BY_DESIGN.md#3-service-worker-privacy-configuration) |
| **[DEVELOPER_GUIDELINES.md](devdocs/DEVELOPER_GUIDELINES.md)** | Developer workflow        | [Pre-implementation checklist](devdocs/DEVELOPER_GUIDELINES.md#pre-implementation-checklist), privacy-first development patterns                                                                                                    |

**When you need information:**
- External APIs? → [PRIVACY_BY_DESIGN.md - External API Registry](PRIVACY_BY_DESIGN.md#external-api-registry)
- CSP headers? → [PRIVACY_BY_DESIGN.md - CSP](PRIVACY_BY_DESIGN.md#2-content-security-policy-csp)
- Privacy checklist? → [DEVELOPER_GUIDELINES.md](devdocs/DEVELOPER_GUIDELINES.md#pre-implementation-checklist)
- Database schema? → [CLAUDE.md - IndexedDB Schema](#indexeddb-schema-v3)
- Features? → [README.md](README.md)
- Design tokens? → [src/styles/tokens/tokens.css](src/styles/tokens/tokens.css)

## CRITICAL DEPLOYMENT WORKFLOW

**NEVER push to GitHub without user's explicit approval after local testing.**

### Mandatory Workflow:
1. Make code changes
2. Build locally: `npm run build`
3. **STOP** - Inform user: "Changes built. Please test locally before pushing to GitHub."
4. **WAIT** for user to explicitly say "push" or "deploy" or similar confirmation
5. Only then: `git add && git commit && git push`

**Exception**: Only push immediately if user explicitly says "and push to GitHub" in the same request.

## No Emojis Policy

**NEVER use emojis in code or documentation.** This includes:
- Source code files (`.ts`, `.tsx`, `.css`, `.js`, etc.)
- Documentation files (`.md`)
- Comments in code
- Commit messages
- Any other project files

Use text alternatives instead:
- Instead of checkmark emoji: `[OK]`, `PASSED`, `Compliant`, or simply describe the status
- Instead of warning emoji: `[WARNING]`, `Note:`, or `CAUTION:`
- Instead of X/cross emoji: `[FAIL]`, `NOT ALLOWED`, or `PROHIBITED`
- Instead of flag emojis: Write the country name (e.g., "Norway" not flag emoji)

## Project Overview

**Tråkke** is a privacy-first Progressive Web Application for Norwegian outdoor navigation. It's built with React 19.2, TypeScript 5.9.3, and Vite 5.4.21, using MapLibre GL JS for mapping with Kartverket (Norwegian) tiles.

**Core Philosophy**: Privacy by Design - No external tracking, no analytics, no cookies. All user data stays local. GDPR compliant by architecture.

## Development Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:5173
npm run build        # TypeScript check + production build
npm run preview      # Preview production build on http://localhost:4173
npm run lint         # ESLint check (TypeScript, React)

# The dev server runs with PWA enabled - Service Worker updates live
```

## Critical Privacy Rules

**BEFORE writing any code that:**
- Makes external API calls → Must be EU/EØS only (see [External API Registry](PRIVACY_BY_DESIGN.md#external-api-registry) in PRIVACY_BY_DESIGN.md)
- Stores user data → Must use IndexedDB only, never external servers
- Adds npm packages → Check for telemetry/tracking (read DEVELOPER_GUIDELINES.md)
- Accesses location → Must require explicit user action (button click)

**Content Security Policy**: See authoritative [CSP configuration](PRIVACY_BY_DESIGN.md#2-content-security-policy-csp) in PRIVACY_BY_DESIGN.md. Update CSP when adding external APIs.

**Complete privacy checklist**: [DEVELOPER_GUIDELINES.md](devdocs/DEVELOPER_GUIDELINES.md#pre-implementation-checklist)

## Architecture

### UI Modes

The app has two UI modes controlled by `App.tsx`:
- **Zen Mode** (default): Auto-hiding controls, collapsible welcome header, FAB menu, sheets
- **Classic Mode**: Always-visible controls, panels

Current state: Zen Mode is the primary interface.

**Welcome Header** (Zen Mode):
- Shows on app load with logo, title, and tagline
- Collapsible via chevron button at bottom center of header
- When collapsed: only small chevron tab remains visible
- CSS transitions for smooth collapse/expand animations
- Clicking header dismisses it completely (showWelcome state)

### Component Architecture

**Map.tsx** is the central orchestrator:
- Manages MapLibre GL JS instance
- Handles all UI mode state (search, download, routes, info sheets)
- Coordinates between sheets and map interactions
- Controls drawing modes (routes, waypoints, area selection)

**Sheet Pattern** (standard bottom sheet on mobile):
```
Sheet (reusable container - slides up from bottom on mobile, centered modal on desktop)
├── SearchSheet (place/address search)
│   ├── Address filter toggle (home icon button)
│   ├── Contextual hint text for address filter
│   └── Auto-focus on open and toggle
├── DownloadSheet (offline area download)
├── RouteSheet (routes & waypoints management)
│   └── ElevationProfileChart (elevation profile visualization)
├── CategorySheet (POI categories)
│   ├── Category groups (Service, Natur, Infrastruktur, Historie)
│   ├── Toggle categories on/off
│   ├── Emergency shelters (Tilfluktsrom from DSB WFS)
│   ├── Wilderness shelters (Gapahuk/vindskjul from Overpass API)
│   ├── Caves (Huler from Overpass API)
│   ├── Observation towers (Observasjonstårn from Overpass API)
│   └── War memorials (Krigsminner: forts, bunkers, battlefields from Overpass API)
├── POIDetailsSheet (POI information)
│   ├── Shelter details (capacity, address)
│   └── Coordinate display in multiple formats
├── SettingsSheet (app settings)
│   └── Coordinate format selection (DD, DMS, DDM, UTM, MGRS)
├── InstallSheet (PWA installation prompt)
└── InfoSheet (data sources & attribution)
```

**ElevationProfileChart** (Chart.js integration):
- Self-hosted Chart.js (no CDN, privacy-first)
- Uses class-based lifecycle managers (ChartLifecycleManager, ChartConfigurationFactory)
- Proper canvas reuse to prevent Chart.js "Canvas already in use" errors
- Efficient update path: updates data without destroying/recreating chart
- Cleanup on unmount prevents memory leaks

**FABMenu** (Floating Action Button):
- Primary action: Opens menu (tap hamburger icon)
- Menu organized in 4 logical groups (with subtle spacing):
  - **Group 1 (Core Navigation)**: Søk, Min posisjon, Ruter og punkter
  - **Group 2 (Active Tools)**: Kategorier, Måleverktøy
  - **Group 3 (Configuration)**: Offline kart, Innstillinger
  - **Group 4 (Meta/Help)**: Info, [Installer - conditional]
- Responsive spacing: 16px separators (desktop), 8px (mobile)
- Accessibility: Full ARIA support, keyboard navigation, haptic feedback

### Services Layer

All services are singletons exported as instances:

**dbService.ts** - IndexedDB wrapper (v3)
- Stores: userData, offlineTiles, downloadedAreas, routes, waypoints, projects
- Used by all other services for persistence

**routeService.ts** - Routes & waypoints CRUD
- Creates routes from drawn coordinates
- Manages waypoints with custom icons
- Projects (collections of routes)
- calculateDistance() uses Haversine formula

**searchService.ts** - Norwegian place/address search
- Kartverket APIs: Stedsnavn (place names), Adresser (addresses)
- Smart fuzzy matching with Levenshtein distance
- Prioritizes outdoor features (fjell, vann, dal, etc.)
- No API keys required

**offlineMapService.ts** - Download map tiles for offline use
- Calculates tile counts for zoom ranges
- Downloads to IndexedDB via Service Worker cache
- Respects Norwegian bounds

**poiService.ts** - Points of Interest (POI) management
- Fetches POI data from external services (WFS and Overpass API)
- Viewport-aware caching (5-minute TTL)
- **WFS data sources**: Emergency shelters (DSB Tilfluktsrom)
- **Overpass API sources**: Wilderness shelters, caves, observation towers, war memorials
- Returns GeoJSON-compatible POI objects
- **Critical bug fix**: Processes both OSM nodes and ways (polygons), calculates centroids for way geometries, filters out bare geometry nodes

**coordinateService.ts** - Coordinate format conversion
- Supports 5 formats: DD, DMS, DDM, UTM, MGRS
- Uses proj4 for UTM conversions
- MGRS library for military grid reference
- Norwegian-language format names and descriptions

**settingsService.ts** - User settings management
- Stores settings in localStorage (non-sensitive data only)
- Currently manages: coordinate format preference
- Default format: DD (decimal degrees)

**elevationService.ts** - Elevation profile data
- Fetches elevation data from Kartverket Høydedata API
- Uses DTM 10m (Digital Terrain Model) grid
- Calculates elevation gain/loss for routes
- Returns array of elevation values with distances

### State Management Pattern

Uses React hooks for local state. No Redux/global state library.

**Auto-hide controls** (useAutoHide.ts):
- Shows controls on user interaction
- Auto-hides after 5 seconds of inactivity
- Stays visible when sheets are open

**Drawing modes** in Map.tsx:
```typescript
// Mutually exclusive states
isDrawingRoute: boolean      // Click to add points to route
isPlacingWaypoint: boolean   // Click to place waypoint marker
isSelectingArea: boolean     // Two clicks to select download area
```

**POI Management** (useViewportPOIs hook):
- Viewport-aware POI loading for performance
- Fetches POIs only for visible map area
- Debounced loading on map move/zoom
- GPU-accelerated clustering using MapLibre native GeoJSON clustering
- Active categories tracked in state (Set<POICategory>)

### IndexedDB Schema (v3)

```typescript
// userData store - general key-value
{ id: number, type: string, data: any, timestamp: number }

// routes store
{
  id: string,                    // "route-{timestamp}-{random}"
  name: string,
  coordinates: [lon, lat][],     // Array of points
  waypoints: string[],           // Waypoint IDs
  distance?: number,             // Meters (calculated)
  elevation?: { gain, loss },
  difficulty?: 'easy'|'moderate'|'hard',
  createdAt: number,
  updatedAt: number
}

// waypoints store
{
  id: string,                    // "wp-{timestamp}-{random}"
  name: string,
  coordinates: [lon, lat],
  icon?: string,                 // Material Symbol name
  color?: string,
  createdAt: number,
  updatedAt: number
}

// projects store (collections)
{
  id: string,
  name: string,
  routes: string[],
  waypoints: string[],
  createdAt: number
}
```

### Map Layers & Sources

**Base layers**: Kartverket WMTS raster tiles (user-selectable)
- **Topographic** (`topo`): Full color topographic map (default) from cache.kartverket.no
- **Grayscale** (`grayscale`): Monochrome topographic map (`topograatone`) from cache.kartverket.no
- **Satellite** (`satellite`): Norge i bilder orthophoto imagery (25cm resolution, zoom 0-19) from opencache.statkart.no. Service is deprecated but publicly accessible with no replacement announced. CC BY 4.0 license. Fully offline-capable via Service Worker caching.
- Switching managed via MapPreferencesSheet (Settings)
- Preference stored in localStorage
- Map initializes all three sources, toggles visibility for instant switching

**Dynamic GeoJSON layers** (added/removed programmatically):
- `drawing-route` - Line being drawn (brand green, 4px wide)
- `drawing-route-line` - LineString layer
- `drawing-route-points` - Circle layer for points
- `selection-area` - Download area rectangle
- `selection-fill` / `selection-outline` - Area styling

**Markers & POI Rendering**:
- User location: Blue circle with white border (maplibregl.Marker)
- Search result: Green location pin (maplibregl.Marker, auto-removes when panned out of viewport)
- Waypoint: Red pulsing location pin (maplibregl.Marker, CSS animation)
- POI markers: Rendered as GeoJSON layer with GPU clustering
  - Emergency shelters (Tilfluktsrom): Custom yellow T-marker (#fbbf24)
  - Wilderness shelters (Gapahuk/vindskjul): cottage icon (brown/orange #b45309)
  - Caves: terrain icon (saddle brown #8b4513) - OSM-Carto style
  - Observation towers: castle icon (gray #4a5568) - Osmic style
  - War memorials: monument icon (dark gray #6b7280) - Osmic fort.svg
  - Cluster circles: Show count of POIs in viewport
  - Click to view POI details in POIDetailsSheet

**Search Marker Behavior** (Map.tsx):
- Created when user selects a search result
- Location stored in `searchMarkerLocation` ref
- `moveend` event listener checks if marker is still in viewport
- Auto-removes marker when map is panned outside viewport bounds
- Also removed when search sheet closes

### Styling System

**CSS Architecture**:
- One CSS file per component (e.g., Map.css, FABMenu.css)
- Mobile-first approach
- No CSS framework (custom styles)
- Uses CSS Grid and Flexbox
- Material Symbols icons (self-hosted, variable fonts)

**Design System**: All colors, typography, spacing, and visual design tokens are in [src/styles/tokens/tokens.css](src/styles/tokens/tokens.css). The app uses the **Nordisk ro** color palette with CSS custom properties (`--trk-*` prefix).

## Common Development Patterns

### Adding a New Sheet

1. Create component extending Sheet with standardized close button:
```typescript
import Sheet from './Sheet'

const MySheet = ({ isOpen, onClose }: MySheetProps) => (
  <Sheet isOpen={isOpen} onClose={onClose} peekHeight={40} halfHeight={70}>
    <button className="sheet-close-button" onClick={onClose} aria-label="Lukk">
      <span className="material-symbols-outlined">close</span>
    </button>
    <div className="my-sheet-content">
      {/* Your content here */}
    </div>
  </Sheet>
)
```

**IMPORTANT - Close Button Pattern**:
- The close button MUST be a direct child of the `<Sheet>` component (first element after opening Sheet tag)
- Use the standardized `sheet-close-button` class (defined in Sheet.css)
- This positions the button in the handle bar area at the top-right (top: 12px, right: 16px)
- The button uses transparent background, simple "X" icon (24px), opacity hover effects
- Never nest the close button inside your content divs - it must be a sibling to your content

2. Add state to Map.tsx:
```typescript
const [mySheetOpen, setMySheetOpen] = useState(false)
```

3. Add to FABMenu if needed, render in Map.tsx return

### Adding Map Interaction Mode

In Map.tsx `handleMapClick`:
```typescript
const handleMapClick = async (e: maplibregl.MapMouseEvent) => {
  if (isMyMode) {
    // Handle click
    const coords = [e.lngLat.lng, e.lngLat.lat]
    // ... do something
    return // Early return to prevent other handlers
  }

  // Other modes...
}
```

### Adding to IndexedDB

Update DB_VERSION in dbService.ts and add upgrade logic:
```typescript
if (oldVersion < 4 && !db.objectStoreNames.contains('myStore')) {
  const store = db.createObjectStore('myStore', { keyPath: 'id' })
  store.createIndex('timestamp', 'timestamp', { unique: false })
}
```

### Adding External API (RARE - Privacy Review Required)

**IMPORTANT**: Follow this process for any new external API:

1. Review [Pre-Implementation Checklist](DEVELOPER_GUIDELINES.md#pre-implementation-checklist) in DEVELOPER_GUIDELINES.md
2. Verify API provider is EU/EØS based
3. Add to [External API Registry](PRIVACY_BY_DESIGN.md#external-api-registry) in PRIVACY_BY_DESIGN.md
4. Update [CSP configuration](PRIVACY_BY_DESIGN.md#2-content-security-policy-csp) in PRIVACY_BY_DESIGN.md
5. Update CSP in vite.config.ts to match
6. Test in production build

**Approved examples**:
- DSB Tilfluktsrom WFS (`ogc.dsb.no`) - Norwegian government agency, no tracking, public data, no API keys
- Overpass API (`overpass-api.de`) - German non-profit (FOSSGIS e.V.), EU-based, public OSM data, no tracking

### Processing OSM Way Geometries (Polygons)

When fetching POI data from Overpass API, many features (forts, bunkers, buildings) are represented as **ways** (polygons) rather than nodes. To display them as point markers, calculate the centroid:

```typescript
// poiService.ts - parseOverpassJSON() pattern
for (const element of data.elements) {
  // Skip bare geometry nodes (nodes without tags)
  const tags = element.tags || {}
  if (Object.keys(tags).length === 0) continue

  let coordinates: [number, number]

  if (element.type === 'node') {
    // Use lat/lon directly for nodes
    coordinates = [element.lon, element.lat]
  } else if (element.type === 'way') {
    // Calculate centroid for ways (polygons)
    if (!element.nodes || element.nodes.length === 0) continue

    // Find node coordinates from elements array
    const wayNodes = data.elements.filter((e: any) =>
      element.nodes.includes(e.id) && e.type === 'node'
    )

    if (wayNodes.length === 0) continue

    // Calculate centroid
    const sumLon = wayNodes.reduce((sum: number, n: any) => sum + n.lon, 0)
    const sumLat = wayNodes.reduce((sum: number, n: any) => sum + n.lat, 0)
    coordinates = [sumLon / wayNodes.length, sumLat / wayNodes.length]
  }

  // Create POI with calculated coordinates
  pois.push({ id, type, name, coordinates })
}
```

**Critical**: Always filter out bare geometry nodes (nodes without tags) to prevent duplicate markers. Only process elements with tags (features).

### Integrating Chart.js (or Similar Canvas Libraries)

Chart.js requires careful lifecycle management to prevent "Canvas already in use" errors in React:

```typescript
// Pattern: Separate concerns with class-based managers
class ChartLifecycleManager {
  private chart: Chart | null = null

  initialize(canvas: HTMLCanvasElement, config: ChartConfiguration): void {
    // Defensive: destroy existing chart before creating new one
    this.destroy()

    // Double-check Chart.js internal registry
    const existingChart = Chart.getChart(canvas)
    if (existingChart) existingChart.destroy()

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2D context')

    this.chart = new Chart(ctx, config)
  }

  updateData(newData: any): void {
    if (!this.chart) return
    this.chart.data = newData
    this.chart.update('none') // 'none' disables animation for immediate update
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
  }
}

// Component pattern: use refs for managers, cleanup on unmount
const MyChartComponent = ({ data }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartManagerRef = useRef(new ChartLifecycleManager())
  const mountedRef = useRef(true)

  // Cleanup on unmount (runs once)
  useEffect(() => {
    return () => {
      mountedRef.current = false
      chartManagerRef.current.destroy()
    }
  }, [])

  // Chart updates (runs when data changes)
  useEffect(() => {
    if (!canvasRef.current || !mountedRef.current) return

    const manager = chartManagerRef.current

    if (manager.hasChart()) {
      // Efficient: update existing chart
      manager.updateData(data)
    } else {
      // Initialize new chart
      manager.initialize(canvasRef.current, config)
    }
  }, [data])

  return <canvas ref={canvasRef} />
}
```

**Key principles**:
- Separate lifecycle management (ChartLifecycleManager) from configuration (ChartConfigurationFactory)
- Use refs for chart instances (never state)
- Destroy chart only on unmount, not on every data change
- Update data in-place when possible instead of destroying/recreating
- Defensive programming: check for existing charts before initialization

## Code Quality & Best Practices

**Recent Code Review Findings**: A comprehensive review identified and fixed critical issues. When working with this codebase, be aware of these patterns:

### Memory Leak Prevention

**Event Listeners**: Always create stable event handler references within useEffect to prevent memory leaks:

```typescript
// BAD - Recreates handlers on every dependency change
useEffect(() => {
  window.addEventListener('mousemove', handleMouseMove)
  return () => window.removeEventListener('mousemove', handleMouseMove)
}, [isDragging, overlayRect]) // overlayRect causes re-registration

// GOOD - Stable handlers, minimal dependencies
useEffect(() => {
  if (!isDragging) return

  const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e)
  window.addEventListener('mousemove', mouseMoveHandler)

  return () => {
    window.removeEventListener('mousemove', mouseMoveHandler)
  }
}, [isDragging]) // Only re-register when isDragging changes
```

**MapLibre Event Handlers**: Be careful with map event registrations:

```typescript
// Remove unnecessary dependencies from map.on() effects
useEffect(() => {
  if (!map.current) return

  const clickHandler = (e: maplibregl.MapMouseEvent) => handleMapClick(e)
  map.current.on('click', clickHandler)

  return () => {
    if (map.current) map.current.off('click', clickHandler)
  }
}, [isDrawingRoute, isPlacingWaypoint]) // Don't include routePoints array
```

### Component Lifecycle Management

**Mounted Refs**: Always use mounted refs for async operations that update state:

```typescript
const mountedRef = useRef(true)
const timeoutRef = useRef<number>()

useEffect(() => {
  return () => {
    mountedRef.current = false
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }
}, [])

// In async operations:
timeoutRef.current = window.setTimeout(() => {
  if (mountedRef.current) {
    setState(newValue) // Only update if component still mounted
  }
}, 2000)
```

**Debounce Cleanup**: Clear timeouts and reset loading states in cleanup:

```typescript
useEffect(() => {
  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

  setIsSearching(true)
  searchTimeoutRef.current = window.setTimeout(async () => {
    // ... search logic
  }, 300)

  return () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      setIsSearching(false) // Reset state on cleanup
    }
  }
}, [query])
```

### Input Validation & Security

**Always validate and sanitize user input** before storing or displaying:

```typescript
// Use the validateName utility function in Map.tsx
const inputName = prompt('Navn på ruten:')
const name = validateName(inputName) // Validates length, sanitizes HTML
if (name) {
  await routeService.createRoute({ name, ... })
}
```

The `validateName()` function:
- Checks for empty/null input
- Enforces max length (default 100 chars)
- Strips HTML/script tags to prevent XSS
- Provides user-friendly Norwegian error messages

### Effect Dependencies

**Minimize unnecessary re-runs** by carefully managing dependency arrays:

```typescript
// BAD - Function dependency causes unnecessary re-runs
useEffect(() => {
  if (anySheetOpen) showControls()
}, [searchSheetOpen, infoSheetOpen, showControls]) // showControls changes when delay changes

// GOOD - Rely on useCallback stability
useEffect(() => {
  if (anySheetOpen) showControls()
}, [searchSheetOpen, infoSheetOpen]) // showControls is stable from useCallback
```

### State Updates

**Use functional updates** when new state depends on previous state to avoid stale closures:

```typescript
// GOOD - Functional update prevents stale state
setPoiMarkers(prevMarkers => {
  prevMarkers.forEach(marker => {
    if (shouldRemove(marker)) marker.remove()
  })
  return prevMarkers.filter(marker => !shouldRemove(marker))
})
```

### Error Handling

**Always provide user feedback** for failed operations:

```typescript
try {
  await someDatabaseOperation()
} catch (error) {
  console.error('Operation failed:', error) // For debugging
  alert('Kunne ikke fullføre operasjonen') // For user
}
```

### Known Gotchas Addendum

7. **Effect Dependencies**: Carefully consider what goes in dependency arrays. Including objects/arrays causes unnecessary re-runs. Use stable references (useCallback, useMemo) or omit if the function is inherently stable.

8. **Timeouts and Component Unmounting**: Always store timeout IDs in refs and clear them on unmount to prevent "Can't perform a React state update on an unmounted component" warnings.

9. **MapLibre Marker Custom Data**: When storing data on markers (e.g., `_poiData`), remember to clean up event listeners on marker removal to prevent memory leaks.

## Build & PWA

**Service Worker** (Workbox):
- Generated automatically by vite-plugin-pwa
- Cache-first for map tiles (30 days, 500 tiles max)
- Network-first for API calls
- Updates automatically on new deploys

**CSP Injection**:
- Custom Vite plugin injects CSP meta tag in production only
- Development has no CSP for HMR/debugging
- **Authoritative CSP**: See [PRIVACY_BY_DESIGN.md](PRIVACY_BY_DESIGN.md#2-content-security-policy-csp)
- Update both PRIVACY_BY_DESIGN.md and vite.config.ts when adding external resources

**Manifest**:
- Generated in vite.config.ts
- Icons: 192px and 512px (maskable safe zone)
- Norwegian language (lang: 'no')
- Standalone display mode

## Testing Offline

1. Build: `npm run build`
2. Preview: `npm run preview`
3. DevTools → Network → Offline
4. Navigate - cached tiles load, uncached show blank
5. IndexedDB → trakke-db → inspect stores

## File Reference

Key files to understand the architecture:

**Core**:
- `src/components/Map.tsx` - Main orchestrator (18KB, 455 lines)
- `src/App.tsx` - Root component, Zen/Classic mode toggle
- `vite.config.ts` - Build config, PWA, CSP

**Services** (all use singleton pattern):
- `src/services/dbService.ts` - IndexedDB wrapper
- `src/services/routeService.ts` - Routes/waypoints CRUD
- `src/services/searchService.ts` - Kartverket search APIs
- `src/services/offlineMapService.ts` - Tile downloading
- `src/services/poiService.ts` - POI fetching and caching (DSB WFS + Overpass API for OSM data)
- `src/services/coordinateService.ts` - Coordinate format conversion
- `src/services/settingsService.ts` - User settings (localStorage)
- `src/services/elevationService.ts` - Elevation data from Kartverket Høydedata API

**UI Components**:
- `src/components/Sheet.tsx` - Reusable sheet container
- `src/components/FABMenu.tsx` - Floating action button menu
- `src/components/SearchSheet.tsx` - Place/address search
- `src/components/DownloadSheet.tsx` - Offline map downloads
- `src/components/RouteSheet.tsx` - Routes & waypoints management
- `src/components/ElevationProfileChart.tsx` - Chart.js elevation profile (class-based lifecycle managers)
- `src/components/CategorySheet.tsx` - POI category selection
- `src/components/POIDetailsSheet.tsx` - POI information display
- `src/components/SettingsSheet.tsx` - App settings
- `src/components/InstallSheet.tsx` - PWA installation prompt
- `src/components/InfoSheet.tsx` - Data sources & attribution

**Hooks**:
- `src/hooks/useAutoHide.ts` - Auto-hiding UI pattern
- `src/hooks/useHaptics.ts` - Vibration feedback
- `src/hooks/useGestures.ts` - Touch gesture handling
- `src/hooks/useViewportPOIs.ts` - Viewport-aware POI loading with debouncing

## Known Gotchas

1. **Route Drawing Save**: Routes can be drawn but lack save UI (in progress). handleStartDrawing clears previous, need prompt for route name + save to routeService.

2. **Database Version Changes**: Increment DB_VERSION in both dbService.ts AND routeService.ts if adding stores. They open the same database.

3. **Map Click Handlers**: handleMapClick checks modes in order. Early return prevents fall-through. Order matters: drawing > waypoint > area selection.

4. **Sheet State**: Keep FAB visible when sheets open (useEffect in Map.tsx monitors all *SheetOpen states).

5. **CSP in Dev**: CSP only injected in production builds. External resources work in dev but may fail in production if CSP not updated.

6. **MapLibre Source Cleanup**: Always check if source/layer exists before adding. Use map.getSource()/getLayer() to avoid "source already exists" errors.

7. **Chart.js Canvas Reuse**: Never destroy and recreate Chart.js instances on every data change. This causes "Canvas already in use" errors. Instead: create once on mount, update data in-place, destroy only on unmount. See ElevationProfileChart.tsx for reference implementation.

8. **Third-Party Library Integration**: When integrating libraries with DOM manipulation (Chart.js, D3, etc.), use class-based managers in refs to separate lifecycle from React's render cycle. Never store library instances in React state.

## Privacy Compliance Reminders

When reviewing or modifying code:
- No Google Analytics, Sentry, Mixpanel, or similar
- No external CDNs (everything self-hosted)
- No cookies ever
- Location requires user button click (not automatic)
- All assets served from same origin or approved EU/EØS services
- **Check Network tab** - should only see approved domains from [External API Registry](PRIVACY_BY_DESIGN.md#external-api-registry):
  - localhost (or your domain)
  - cache.kartverket.no (map tiles)
  - ws.geonorge.no (search APIs)
  - ogc.dsb.no (emergency shelter POI data)
  - overpass-api.de (OSM POI data: caves, towers, war memorials, wilderness shelters)

**Documentation reference**:
- Privacy checklist: [DEVELOPER_GUIDELINES.md](devdocs/DEVELOPER_GUIDELINES.md#pre-implementation-checklist)
- External APIs: [PRIVACY_BY_DESIGN.md - External API Registry](PRIVACY_BY_DESIGN.md#external-api-registry)
- CSP configuration: [PRIVACY_BY_DESIGN.md - CSP](PRIVACY_BY_DESIGN.md#2-content-security-policy-csp)
