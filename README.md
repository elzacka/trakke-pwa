# Tråkke - Norwegian Outdoor Mapping PWA

A Progressive Web Application for Norwegian outdoor navigation with offline capabilities.

## Current Features

**Interactive Topographic Map**
- Kartverket WMTS topographic tiles (Norway)
- Responsive zoom and pan controls
- Pitch control (0° default, tiltable for 3D view)
- Scale indicator and compass
- MapLibre GL JS rendering engine

**GPS Location Tracking**
- Real-time user location with blue marker
- FAB menu with quick location centering
- Continuous position tracking
- Accuracy circle visualization

**Search & Navigation**
- Norwegian place name search (Kartverket SSR API)
- Address search with smart fuzzy matching (toggleable filter)
- Outdoor feature prioritization (mountains, lakes, etc.)
- Search result markers with auto-removal on viewport change
- Contextual hint text for address filter

**Offline Map Downloads**
- Select custom areas for offline use
- Configurable zoom level range
- Download progress tracking
- Manage downloaded areas
- Navigate to saved areas

**Routes & Waypoints**
- Draw routes by clicking on map
- Calculate distances using Haversine formula
- Place custom waypoints with names
- Save routes to IndexedDB
- Toggle route/waypoint visibility
- Route management and deletion

**Points of Interest (POI)**
- **Emergency shelters** (Tilfluktsrom) from DSB via WFS - yellow T-marker
- **Wilderness shelters** (Gapahuk/vindskjul) from OpenStreetMap - cottage icon
- **Caves** (Huler) from OpenStreetMap - terrain icon (OSM-Carto style)
- **Observation towers** (Observasjonstårn) from OpenStreetMap - castle icon
- **War memorials** (Krigsminner: forts, bunkers, battlefields) from OpenStreetMap - monument icon (Osmic fort.svg)
- Category-based filtering with toggle on/off
- GPU-accelerated clustering for performance
- Viewport-aware loading (fetches only visible POIs)
- POI details sheets with comprehensive information

**Progressive Web App**
- Installable on mobile and desktop
- Works offline with cached map tiles
- App-like experience
- iOS and Android home screen support
- Service Worker with intelligent caching

**Zen Mode Interface**
- Auto-hiding controls
- Collapsible welcome header with toggle chevron
- Floating Action Button (FAB) menu
- Bottom sheets for feature access (Search, Download, Routes, Categories, Settings, Info)
- Mobile-first design with desktop support
- Gesture-based navigation
- Keyboard shortcuts for power users

**Privacy by Design (GDPR Compliant)**
- Zero external tracking or analytics
- All fonts and assets self-hosted
- No data transfers outside EU/EØS (only approved Norwegian government services)
- Content Security Policy (CSP) enforced
- No cookies or user profiling
- All data stored locally in IndexedDB
- **Approved external services**: See [External API Registry](PRIVACY_BY_DESIGN.md#external-api-registry) in PRIVACY_BY_DESIGN.md
- **Complete privacy documentation**: [PRIVACY_BY_DESIGN.md](PRIVACY_BY_DESIGN.md)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### Build for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
trakke_pwa/
├── src/
│   ├── components/          # React components
│   │   ├── Map.tsx         # MapLibre GL map orchestrator
│   │   ├── FABMenu.tsx     # Floating action button
│   │   ├── Sheet.tsx       # Reusable sheet container
│   │   ├── SearchSheet.tsx, DownloadSheet.tsx, RouteSheet.tsx
│   │   ├── CategorySheet.tsx, POIDetailsSheet.tsx
│   │   ├── SettingsSheet.tsx, InstallSheet.tsx, InfoSheet.tsx
│   │   └── (and more...)
│   ├── services/           # Services and utilities (singletons)
│   │   ├── dbService.ts    # IndexedDB wrapper
│   │   ├── routeService.ts # Routes & waypoints CRUD
│   │   ├── searchService.ts # Kartverket search
│   │   ├── offlineMapService.ts # Tile downloading
│   │   ├── poiService.ts   # POI fetching (DSB WFS + Overpass API)
│   │   ├── coordinateService.ts # Format conversion
│   │   └── settingsService.ts # User settings
│   ├── hooks/              # Custom React hooks
│   │   ├── useAutoHide.ts  # Auto-hiding controls
│   │   ├── useViewportPOIs.ts # POI viewport loading
│   │   └── (and more...)
│   ├── styles/             # CSS files (one per component)
│   │   ├── design-tokens.css # Nordisk ro design system
│   │   ├── index.css       # Global styles
│   │   └── (component CSS files)
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Application entry point
├── public/                 # Static assets
│   ├── icon-192.png, icon-512.png # PWA icons (maskable)
│   ├── apple-icon-180.png  # iOS app icon
│   ├── fonts/              # Self-hosted Exo 2 variable font
│   └── material-symbols/   # Self-hosted Material Symbols icons
├── DESIGN_SYSTEM.md        # Design documentation
├── DEVELOPER_GUIDELINES.md # Privacy & development guidelines
├── CLAUDE.md               # Developer context for AI assistance
├── vite.config.ts          # Vite + PWA + CSP config
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Design System

Tråkke uses the **Nordisk ro** design system.

See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for:
- Nordisk ro color palette (brand, neutrals, text hierarchy, functional colors)
- Logo specifications and usage guidelines
- Typography (Exo 2 variable font)
- Icon system (Material Symbols Outlined, self-hosted)
- Spacing scale, shadows, and transitions
- Component patterns and accessibility guidelines

## Map Integration

**Kartverket WMTS Service:**
- Endpoint: `https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png`
- Tile size: 256px
- Zoom levels: 3-18
- Coordinate system: Web Mercator (EPSG:3857)

## Data Storage

### IndexedDB (v3)
- Database name: `trakke-db`
- Stores: `userData`, `routes`, `waypoints`, `projects`, `offlineTiles`, `downloadedAreas`
- **Complete schema**: See [CLAUDE.md - IndexedDB Schema](CLAUDE.md#indexeddb-schema-v3) for full TypeScript types
- No external sync - all data stays on device

### Service Worker Caching
- **Kartverket tiles**: Cache-first, 30 days, 500 entries max
- **Static assets**: Precached on install (fonts, icons, app shell)
- **Privacy configuration**: See [PRIVACY_BY_DESIGN.md - Service Worker](PRIVACY_BY_DESIGN.md#3-service-worker-privacy-configuration)

## PWA Features

### Manifest
- Name: Tråkke
- Theme color: `#3e4533` (Tråkke brand green - see [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md))
- Display: standalone
- Language: Norwegian (no)

### Offline Support
- Map tiles cached automatically during use
- UI works completely offline
- IndexedDB for persistent storage

### Installation
- Automatically prompts on mobile devices
- "Add to Home Screen" on iOS
- "Install App" on Android/Desktop Chrome

## Testing

### Browser Compatibility
Tested and supported on modern browsers:
- Chrome 100+
- Edge 100+
- Firefox 100+
- Safari 15+ / iOS 15+

See [BROWSER_COMPATIBILITY.md](BROWSER_COMPATIBILITY.md) for compatibility information, testing requirements, and browser-specific notes.

### Testing Offline Mode
1. Open app in browser
2. Open DevTools → Application → Service Workers
3. Check "Offline" checkbox
4. Navigate map (cached tiles will load)

## Configuration

### Environment Variables
Create `.env.local` for environment-specific config:

```env
VITE_APP_TITLE=Tråkke
VITE_BASE_URL=/
```

### PWA & Build Configuration

**Privacy-compliant PWA setup** - see [PRIVACY_BY_DESIGN.md](PRIVACY_BY_DESIGN.md) for:
- [Content Security Policy (CSP)](PRIVACY_BY_DESIGN.md#2-content-security-policy-csp)
- [Service Worker privacy configuration](PRIVACY_BY_DESIGN.md#3-service-worker-privacy-configuration)
- [External API approval process](PRIVACY_BY_DESIGN.md#external-api-registry)

Edit `vite.config.ts` to customize manifest and caching.

## Dependencies

### Core
- **React 19.2.0**: UI framework
- **TypeScript 5.9.3**: Type safety
- **Vite 5.4.21**: Build tool and dev server

### Map
- **MapLibre GL JS 5.11.0**: Map rendering
- **Kartverket WMTS**: Norwegian topographic tiles

### PWA
- **vite-plugin-pwa 1.1.0**: PWA plugin for Vite
- **Workbox 7.3.0**: Service worker library

See [DEPENDENCIES.md](DEPENDENCIES.md) for complete dependency list with exact versions.

## Roadmap

### Phase 1 (Complete)
- Interactive topographic map with Kartverket tiles
- GPS location tracking and centering
- Progressive Web App with offline capabilities
- IndexedDB for local data storage
- Privacy-first architecture (no tracking)

### Phase 2 (Completed)
- **Search functionality** - Place names and addresses (Kartverket APIs)
- **Offline map downloads** - Select area and download for offline use
- **Routes and waypoints** - Draw routes, place waypoints, calculate distances
- **POI categories** - Emergency shelters (DSB WFS), wilderness shelters, caves, towers, war memorials (Overpass API)
- **Coordinate formats** - DD, DMS, DDM, UTM, MGRS support
- **Settings** - Coordinate format preferences
- **Projects management** - Organize routes and waypoints into projects
- **GPX export** - Export routes and projects as GPX 1.1 files for GPS devices

### Phase 3 (In Progress)
**Completed:**
- **Elevation profiles** - Automatic elevation charts using Kartverket DTM data (10m resolution)
  - Total gain/loss calculations
  - Min/max/average elevation statistics
  - Interactive Chart.js visualization
  - 7-day IndexedDB caching

**In Development:**
- Weather integration (MET Norway - privacy review complete, proxy deployment pending)
- Route planning with trail snapping
- Photo geotagging for waypoints

### Phase 4 (GPS Navigation & Advanced Features)
- Turn-by-turn navigation
- Live GPS tracking and route following
- Compass and bearing tools
- Off-route alerts and recalculation
- Track recording (breadcrumb trails)
- Battery-efficient tracking modes
- Additional POI categories (cabins, trails, parking)
- Trail overlays from external sources
- Push notifications for weather alerts

## Privacy & Security

Tråkke implements Privacy by Design according to GDPR and Norwegian privacy regulations.

**All privacy documentation is centralized in [PRIVACY_BY_DESIGN.md](PRIVACY_BY_DESIGN.md)** - the single source of truth for:
- [External API Registry](PRIVACY_BY_DESIGN.md#external-api-registry) - All approved external services
- [Content Security Policy (CSP)](PRIVACY_BY_DESIGN.md#2-content-security-policy-csp) - Security headers
- [Service Worker configuration](PRIVACY_BY_DESIGN.md#3-service-worker-privacy-configuration) - Caching strategy
- GDPR compliance implementation
- Privacy testing procedures

**Additional documentation**:
- [Developer Guidelines](DEVELOPER_GUIDELINES.md) - Privacy-first development workflow and pre-implementation checklist
- [Browser Compatibility](BROWSER_COMPATIBILITY.md) - Tested browsers and compatibility notes

## License

MIT License - See LICENSE file

## Attribution

All attribution and data source information is available in the app via the "Datakilder" info panel (info button in FAB menu).

- **Maps**: © Kartverket - Topographic tiles (WMTS)
- **Place Names**: © Kartverket - Sentralt Stedsnavnregister (SSR)
- **Addresses**: © Kartverket - Adresseregister
- **Emergency Shelters**: © DSB (Direktoratet for samfunnssikkerhet og beredskap) - Tilfluktsrom data
- **POI Data**: © OpenStreetMap contributors - Caves, observation towers, war memorials, wilderness shelters
- **Icons**: Material Symbols Outlined (self-hosted, variable fonts)
- **Font**: Exo 2 (self-hosted, variable font)
- **Framework**: React by Meta

**Data Licenses**:
- Kartverket data: CC BY 4.0 - [Terms of use](https://www.kartverket.no/api-og-data/vilkar-for-bruk)
- DSB data: Public data from Norwegian government agency
- OpenStreetMap data: ODbL - [OpenStreetMap Copyright](https://www.openstreetmap.org/copyright)

---
