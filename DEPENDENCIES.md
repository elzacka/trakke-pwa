# Dependencies - Tråkke PWA

**Last Updated**: November 8, 2025
**Package Manager**: npm

This document tracks all dependencies with their exact versions currently installed in the project.

---

## Production Dependencies

Dependencies that are bundled with the application and shipped to users.

| Package | Version | Purpose | License | Privacy Notes |
|---------|---------|---------|---------|---------------|
| **react** | 19.2.0 | UI framework | MIT | Client-side only, no telemetry |
| **react-dom** | 19.2.0 | React DOM renderer | MIT | Client-side only, no telemetry |
| **maplibre-gl** | 5.11.0 | Map rendering library | BSD-3-Clause | Client-side only, no tracking |
| **vite-plugin-pwa** | 1.1.0 | PWA plugin for Vite | MIT | Build-time only, generates Service Worker |
| **workbox-window** | 7.3.0 | Service Worker library | MIT | Client-side caching, no external requests |

**Total Production Dependencies**: 5

---

## Development Dependencies

Dependencies used only during development and build process, not shipped to users.

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| **@types/maplibre-gl** | 1.13.2 | TypeScript types for MapLibre | MIT |
| **@types/react** | 19.0.0 | TypeScript types for React | MIT |
| **@types/react-dom** | 19.0.0 | TypeScript types for React DOM | MIT |
| **@typescript-eslint/eslint-plugin** | 6.21.0 | ESLint TypeScript support | MIT |
| **@typescript-eslint/parser** | 6.21.0 | TypeScript parser for ESLint | BSD-2-Clause |
| **@vitejs/plugin-react** | 4.7.0 | Vite React plugin | MIT |
| **eslint** | 8.56.0 | JavaScript/TypeScript linter | MIT |
| **eslint-plugin-react-hooks** | 4.6.0 | ESLint rules for React hooks | MIT |
| **eslint-plugin-react-refresh** | 0.4.5 | ESLint rules for React Fast Refresh | MIT |
| **typescript** | 5.9.3 | TypeScript compiler | Apache-2.0 |
| **vite** | 5.4.21 | Build tool and dev server | MIT |

**Total Development Dependencies**: 11

---

## Dependency Tree (Key Packages)

### React Ecosystem
```
react@19.2.0
├── react-dom@19.2.0
└── @types/react@19.0.0 (dev)
    └── @types/react-dom@19.0.0 (dev)
```

### Build Tools
```
vite@5.4.21
├── @vitejs/plugin-react@4.7.0
└── vite-plugin-pwa@1.1.0
    └── workbox-build@7.3.0
        └── workbox-window@7.3.0
```

### TypeScript
```
typescript@5.9.3
├── @typescript-eslint/parser@6.21.0
└── @typescript-eslint/eslint-plugin@6.21.0
```

### Mapping
```
maplibre-gl@5.11.0
└── @types/maplibre-gl@1.13.2 (dev)
```

---

## Version Notes

### React 19.2.0
- **Release**: November 2025
- **Major Changes from 18.x**:
  - React Compiler (experimental)
  - Improved Server Components
  - Actions API for forms
  - `use()` hook for async data
  - Document metadata support
  - Enhanced Suspense

### Vite 5.4.21
- **Release**: October 2025
- **Features**:
  - Lightning-fast dev server (ESM-based)
  - Optimized production builds
  - First-class TypeScript support
  - Hot Module Replacement (HMR)

### MapLibre GL JS 5.11.0
- **Release**: 2025
- **Notes**:
  - Fork of Mapbox GL JS v1
  - 100% open source (BSD-3-Clause)
  - No telemetry or tracking
  - WebGL-based rendering
  - Vector and raster tile support

### TypeScript 5.9.3
- **Release**: 2025
- **Features**:
  - Improved type inference
  - Enhanced IDE support
  - Better error messages

### Workbox 7.3.0
- **Release**: 2023
- **Notes**:
  - Google's Service Worker library
  - Client-side caching strategies
  - No telemetry in workbox-window
  - Used via vite-plugin-pwa

---

## Privacy Audit

### External Requests Analysis

**During Development**:
- ✅ `npm install` - Downloads from npmjs.com (necessary)
- ✅ Vite dev server - Local only (localhost:3000)
- ✅ HMR - Local WebSocket connection only

**During Build**:
- ✅ All dependencies bundled locally
- ✅ No external requests made during build
- ✅ No telemetry or analytics

**In Production (Runtime)**:
- ✅ No external requests except:
  - `cache.kartverket.no` - Norwegian government map tiles (GDPR compliant)
- ✅ All fonts and icons served locally
- ✅ No CDN dependencies
- ✅ No analytics or tracking

### Dependency Risk Assessment

| Package | Privacy Risk | Notes |
|---------|--------------|-------|
| **react** | ✅ None | Client-side library, no external calls |
| **react-dom** | ✅ None | Client-side library, no external calls |
| **maplibre-gl** | ✅ None | Client-side rendering, no telemetry |
| **vite-plugin-pwa** | ✅ None | Build-time only, generates static files |
| **workbox-window** | ✅ None | Client-side caching, no external requests |

**All dependencies pass privacy audit.** ✅

---

## Update Policy

### Automatic Updates
Currently using caret (`^`) ranges in package.json for automatic minor/patch updates:
- `^19.0.0` → Allows 19.x.x (but not 20.0.0)
- `^5.4.21` → Allows 5.x.x (but not 6.0.0)

### Manual Review Required
Major version updates (breaking changes) require:
1. Review changelog
2. Test all features
3. Privacy audit (if new network requests)
4. Update this document

### Security Updates
```bash
# Check for vulnerabilities
npm audit

# Update all dependencies to latest compatible
npm update

# Update specific package
npm update react react-dom
```

---

## Installation

### Fresh Install
```bash
# Install all dependencies
npm install

# Verify versions
npm list --depth=0
```

### Clean Install
```bash
# Remove node_modules and lockfile
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

---

## Package.json Summary

```json
{
  "dependencies": {
    "maplibre-gl": "^5.11.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "vite-plugin-pwa": "^1.1.0",
    "workbox-window": "^7.3.0"
  },
  "devDependencies": {
    "@types/maplibre-gl": "^1.13.2",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.3.3",
    "vite": "^5.0.12"
  }
}
```

**Note**: package.json shows minimum versions (`^19.0.0`), but npm installs latest compatible (19.2.0).

---

## Compatibility Matrix

### Node.js
- **Required**: Node.js 18+
- **Recommended**: Node.js 20+ LTS
- **Tested on**: [TBD]

### npm
- **Required**: npm 8+
- **Recommended**: npm 10+
- **Tested on**: [TBD]

### Browsers (Production)
See [BROWSER_COMPATIBILITY.md](BROWSER_COMPATIBILITY.md) for detailed browser support.

---

## Known Issues

### None currently

If you discover compatibility issues with specific versions, document them here.

---

## Future Dependency Considerations

### Potential Additions (Phase 2+)

**If implementing search functionality**:
- Consider: Client-side search library (e.g., Fuse.js, Lunr.js)
- Avoid: Cloud-based search APIs outside EU/EØS

**If implementing GPX export**:
- Consider: `togpx`, `gpx-builder` (client-side conversion)
- Privacy: Ensure no external API calls

**If implementing route planning**:
- Consider: `turf.js` (geospatial analysis, client-side)
- Avoid: Google Directions API, Mapbox Directions

### Prohibited Dependencies

According to [DEVELOPER_GUIDELINES.md](DEVELOPER_GUIDELINES.md):

❌ **Never Add**:
- Google Analytics, Mixpanel, or any analytics
- Facebook SDK, Google SDK (tracking)
- Sentry cloud (use self-hosted or local logging)
- Mapbox GL JS (use MapLibre instead)
- Any package with built-in telemetry

---

## Changelog

### 2025-11-08
- Initial dependency documentation
- Actual installed versions documented:
  - React 19.2.0 (not 19.0.0 as referenced in some docs)
  - Vite 5.4.21 (not 5.0.12 as in package.json)
  - TypeScript 5.9.3 (not 5.3.3 as in package.json)

---

**Last Verified**: November 8, 2025
**Next Review**: February 8, 2026 (quarterly)
