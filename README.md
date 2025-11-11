# 🥾 Tråkke - Norwegian Outdoor Mapping PWA

A Progressive Web Application for Norwegian outdoor navigation with offline capabilities.

## 🌟 Features (MVP)

✅ **Interactive Topographic Map**
- Kartverket WMTS topographic tiles
- Responsive zoom and pan controls
- Scale indicator

✅ **GPS Location Tracking**
- Real-time user location on map
- Location button to center map
- Continuous position tracking

✅ **Progressive Web App**
- Installable on mobile and desktop
- Works offline with cached map tiles
- Fast, app-like experience

✅ **Norwegian Design**
- White (#ffffff) primary background
- Tråkke green (#3e4533) brand color
- Material Symbols "forest" icon logo
- Fully Norwegian language UI

✅ **Offline Storage**
- IndexedDB for user data
- Service Worker with Workbox
- Cache-first strategy for map tiles
- Automatic tile caching (30-day expiration)

✅ **Privacy by Design (GDPR Compliant)**
- No external tracking or analytics
- All fonts and assets self-hosted
- No data transfers outside EU/EØS
- Content Security Policy (CSP) enforced
- No cookies or user profiling

## 🚀 Quick Start

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

## 📁 Project Structure

```
trakke_pwa/
├── src/
│   ├── components/          # React components
│   │   ├── Map.tsx         # MapLibre GL map component
│   │   └── LocationButton.tsx  # GPS tracking button
│   ├── services/           # Services and utilities
│   │   └── dbService.ts    # IndexedDB service
│   ├── styles/             # CSS files
│   │   ├── index.css       # Global styles
│   │   ├── App.css         # App component styles
│   │   ├── Map.css         # Map styles
│   │   └── LocationButton.css  # Location button styles
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Application entry point
├── public/                 # Static assets
│   ├── icon-192.png        # PWA icon 192x192 (maskable)
│   ├── icon-512.png        # PWA icon 512x512 (maskable)
│   ├── apple-icon-180.png  # iOS app icon
│   ├── favicon-196.png     # Standard favicon
│   └── ICONS_README.md     # Icon documentation
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration with PWA
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## 🎨 Design System

### Brand Colors
- **Primary**: `#3e4533` (Tråkke green) - Logo, primary actions
- **Background**: `#ffffff` (White) - Main background
- **Text**: `#111827` - Primary text

### Typography
- **Font**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI)
- **Icons**: Material Symbols Outlined (self-hosted)

## 🗺️ Map Integration

**Kartverket WMTS Service:**
- Endpoint: `https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png`
- Tile size: 256px
- Zoom levels: 3-18
- Coordinate system: Web Mercator (EPSG:3857)

## 💾 Data Storage

### IndexedDB
- Database name: `trakke-db`
- Store: `userData`
- Indexes: `type`, `timestamp`
- Usage: User preferences, saved locations (future)

### Service Worker Caching
- **Kartverket tiles**: Cache-first, 30 days, 500 entries max
- **Google Fonts**: Cache-first, 1 year, 10 entries max
- **Static assets**: Precached on install

## 📱 PWA Features

### Manifest
- Name: Tråkke
- Theme color: #3e4533
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

## 🧪 Testing

### Browser Compatibility
Tested and supported on current browsers as of November 2025:
- Chrome 142+ (current: 142.0.7444.134)
- Edge 142+ (current: 142.0.3595.65)
- Firefox 144+ (current: 144.0.2)
- Safari 26+ / iOS 26+ (current: Safari 26.1)

See [BROWSER_COMPATIBILITY.md](BROWSER_COMPATIBILITY.md) for detailed compatibility information, testing requirements, and browser-specific notes.

### Testing Offline Mode
1. Open app in browser
2. Open DevTools → Application → Service Workers
3. Check "Offline" checkbox
4. Navigate map (cached tiles will load)

## 🔧 Configuration

### Environment Variables
Create `.env.local` for environment-specific config:

```env
VITE_APP_TITLE=Tråkke
VITE_BASE_URL=/
```

### PWA Configuration
Edit `vite.config.ts` to customize:
- Manifest properties
- Cache strategies
- Workbox options

## 📦 Dependencies

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

## 🛣️ Roadmap

### Phase 2 (Future)
- [ ] Offline map downloads (select area)
- [ ] Search functionality (place names, coordinates)
- [ ] Routes and waypoints
- [ ] Projects/tracks management
- [ ] Push notifications
- [ ] Background sync

### Phase 3 (Future)
- [ ] POI categories (cabins, trails, etc.)
- [ ] Trail overlays
- [ ] Elevation profiles
- [ ] Export/import GPX

## 🔒 Privacy & Security

Tråkke implements Privacy by Design according to GDPR and Norwegian privacy regulations:

- **No tracking**: Zero analytics, telemetry, or user profiling
- **Local-first**: All data stored on device (IndexedDB)
- **GDPR compliant**: No data transfers outside EU/EØS
- **Self-hosted**: Fonts, icons, and assets served locally
- **Secure**: Content Security Policy (CSP) and HTTPS enforced

### Documentation
- [Privacy by Design Implementation](PRIVACY_BY_DESIGN.md)
- [Developer Guidelines](DEVELOPER_GUIDELINES.md)
- [GDPR Compliance Details](PRIVACY_COMPLIANCE.md)
- [Browser Compatibility](BROWSER_COMPATIBILITY.md)

## 📄 License

MIT License - See LICENSE file

## 🙏 Attribution

All attribution and data source information is available in the app via the "Datakilder" info panel (info button in bottom-right corner).

- **Maps**: © Kartverket - Topographic tiles
- **Place Names**: © Kartverket - Sentralt Stedsnavnregister (SSR)
- **Addresses**: © Kartverket - Adresseregister
- **Icons**: Material Symbols (self-hosted)
- **Framework**: React by Meta

All Kartverket data is used under CC BY 4.0 license according to [Kartverket's terms of use](https://www.kartverket.no/api-og-data/vilkar-for-bruk).

---

**Built with ❤️ for Norwegian outdoor enthusiasts**
**Privacy-first • No tracking • GDPR compliant**
