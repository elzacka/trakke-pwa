# Tråkke - Norwegian Outdoor Mapping PWA

A privacy-first Progressive Web App for Norwegian outdoor navigation with offline capabilities.

## Features

- **Topographic maps** - Kartverket tiles (topographic, grayscale, satellite)
- **GPS tracking** - Real-time location with accuracy visualization
- **Search** - Place names and addresses (Kartverket APIs)
- **Offline maps** - Download areas for offline use
- **Routes & waypoints** - Draw, save, and manage with GPX export
- **POI categories** - Shelters, caves, towers, war memorials etc.
- **Elevation profiles** - Automatic charts from Kartverket DTM data
- **Privacy by design** - Zero tracking, GDPR compliant, EU/EEA services only

## Quick Start

```bash
npm install
npm run dev      # Development server at http://localhost:5173
npm run build    # Production build
npm run preview  # Preview production build
```

**Requirements:** Node.js 18+

## Tech Stack

- React 19.2, TypeScript 5.9, Vite 5.4
- MapLibre GL JS 5.11
- Workbox (PWA/Service Worker)

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Developer context, architecture, code patterns |
| [PRIVACY_BY_DESIGN.md](PRIVACY_BY_DESIGN.md) | Privacy compliance, external API registry, CSP |

## Privacy

All data stays on device. No tracking, no cookies, no analytics. External services are EU/EEA only (Kartverket, DSB, MET Norway, OpenStreetMap via German servers).

See [PRIVACY_BY_DESIGN.md](PRIVACY_BY_DESIGN.md) for complete documentation.

## License

MIT License

## Attribution

Data sources and licenses are displayed in-app via Info panel.
