# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tråkke** is a privacy-first Progressive Web Application for Norwegian outdoor navigation. It's built with React 19.2, TypeScript 5.9.3, and Vite 5.4.21, using MapLibre GL JS for mapping with Kartverket (Norwegian government) tiles.

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
- Makes external API calls → Must be EU/EØS only (currently: cache.kartverket.no, ws.geonorge.no)
- Stores user data → Must use IndexedDB only, never external servers
- Adds npm packages → Check for telemetry/tracking (read DEVELOPER_GUIDELINES.md)
- Accesses location → Must require explicit user action (button click)

**Content Security Policy** is enforced in production builds (vite.config.ts). External domains require CSP updates.

See [DEVELOPER_GUIDELINES.md](DEVELOPER_GUIDELINES.md) for complete privacy checklist.

## Architecture

### UI Modes

The app has two UI modes controlled by `App.tsx`:
- **Zen Mode** (default): Auto-hiding controls, FAB menu, bottom sheets
- **Classic Mode**: Always-visible controls, panels

Current state: Zen Mode is the primary interface.

### Component Architecture

**Map.tsx** is the central orchestrator:
- Manages MapLibre GL JS instance
- Handles all UI mode state (search, download, routes, info sheets)
- Coordinates between sheets and map interactions
- Controls drawing modes (routes, waypoints, area selection)

**Bottom Sheet Pattern** (mobile-first):
```
BottomSheet (reusable container)
├── SearchSheet (place/address search)
├── DownloadSheet (offline area download)
├── RouteSheet (routes & waypoints management)
└── InfoSheet (data sources & attribution)
```

**FABMenu** (Floating Action Button):
- Primary action: Center on user location (single tap)
- Long-press: Opens radial menu
- Menu items: Search, Routes, Download, Reset North, Info

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

**Base layer**: Kartverket WMTS raster tiles

**Dynamic GeoJSON layers** (added/removed programmatically):
- `drawing-route` - Line being drawn (green #3e4533, 4px wide)
- `drawing-route-line` - LineString layer
- `drawing-route-points` - Circle layer for points
- `selection-area` - Download area rectangle
- `selection-fill` / `selection-outline` - Area styling

**Markers** (maplibregl.Marker):
- User location: Blue circle with white border
- Search result: Green location pin
- Waypoint: Red pulsing location pin (CSS animation)

### Styling System

**CSS Architecture**:
- One CSS file per component (e.g., Map.css, FABMenu.css)
- Mobile-first approach
- No CSS framework (custom styles)
- Uses CSS Grid and Flexbox
- Material Symbols icons (self-hosted, variable fonts)

**Colors**:
- Primary: `#3e4533` (Tråkke green)
- Background: `#ffffff` (white)
- Text: `#111827` (dark gray)
- Error/Delete: `#ef4444` (red)

**Typography**: System font stack (no external fonts)
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

## Common Development Patterns

### Adding a New Sheet

1. Create component extending BottomSheet:
```typescript
import BottomSheet from './BottomSheet'

const MySheet = ({ isOpen, onClose }: MySheetProps) => (
  <BottomSheet isOpen={isOpen} onClose={onClose} peekHeight={40} halfHeight={70}>
    {/* content */}
  </BottomSheet>
)
```

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

1. Check DEVELOPER_GUIDELINES.md privacy checklist
2. Verify API is EU/EØS
3. Update CSP in vite.config.ts:
```typescript
connect-src 'self' https://cache.kartverket.no https://ws.geonorge.no https://new-api.eu
```

## Build & PWA

**Service Worker** (Workbox):
- Generated automatically by vite-plugin-pwa
- Cache-first for map tiles (30 days, 500 tiles max)
- Network-first for API calls
- Updates automatically on new deploys

**CSP Injection**:
- Custom Vite plugin injects CSP meta tag in production only
- Development has no CSP for HMR/debugging
- Update CSP in vite.config.ts when adding external resources

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

**UI Components**:
- `src/components/BottomSheet.tsx` - Reusable sheet container
- `src/components/FABMenu.tsx` - Floating action button menu
- `src/components/*Sheet.tsx` - Feature-specific sheets

**Hooks**:
- `src/hooks/useAutoHide.ts` - Auto-hiding UI pattern
- `src/hooks/useHaptics.ts` - Vibration feedback
- `src/hooks/useGestures.ts` - Touch gesture handling

## Known Gotchas

1. **Route Drawing Save**: Routes can be drawn but lack save UI (in progress). handleStartDrawing clears previous, need prompt for route name + save to routeService.

2. **Database Version Changes**: Increment DB_VERSION in both dbService.ts AND routeService.ts if adding stores. They open the same database.

3. **Map Click Handlers**: handleMapClick checks modes in order. Early return prevents fall-through. Order matters: drawing > waypoint > area selection.

4. **Sheet State**: Keep FAB visible when sheets open (useEffect in Map.tsx monitors all *SheetOpen states).

5. **CSP in Dev**: CSP only injected in production builds. External resources work in dev but may fail in production if CSP not updated.

6. **MapLibre Source Cleanup**: Always check if source/layer exists before adding. Use map.getSource()/getLayer() to avoid "source already exists" errors.

## Roadmap Context

Current status: **Phase 2 in progress**

**Phase 1** (Complete):
- ✅ Map with Kartverket tiles
- ✅ GPS location tracking
- ✅ PWA offline capability
- ✅ Search (places & addresses)
- ✅ Offline map downloads

**Phase 2** (Partial):
- ✅ Route drawing & waypoints (UI complete, save pending)
- [ ] Projects/tracks management
- [ ] Route editing & statistics
- [ ] GPX export

**Phase 3** (Planned):
- [ ] POI categories
- [ ] Trail overlays
- [ ] Elevation profiles

See [README.md](README.md) roadmap section for details.

## Privacy Compliance Reminders

When reviewing or modifying code:
- No Google Analytics, Sentry, Mixpanel, or similar
- No external CDNs (everything self-hosted)
- No cookies ever
- Location requires user button click (not automatic)
- All assets served from same origin or cache.kartverket.no
- Check Network tab - should only see localhost + Kartverket

Questions? Read [DEVELOPER_GUIDELINES.md](DEVELOPER_GUIDELINES.md) first.
