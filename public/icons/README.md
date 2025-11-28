# Tråkke Icon Assets

This directory contains all icon assets used in the Tråkke PWA, following a strict privacy-by-design approach with zero external CDN dependencies.

## Icon Strategy

Tråkke uses a **hybrid icon approach** optimized for different use cases:

1. **Material Symbols** (icon font) - UI controls and navigation
2. **Osmic SVG icons** (individual files) - POI category markers
3. **Custom SVG** (inline) - Norwegian-specific icons (T-marker)

## Directory Structure

```
public/icons/
├── osmic/              # OpenStreetMap cartographic icons (CC0)
│   ├── monument.svg    # War memorials
│   ├── watchtower.svg  # Observation towers
│   ├── parking.svg     # Parking areas (future)
│   ├── alpine-hut.svg  # DNT cabins (future)
│   ├── viewpoint.svg   # Viewpoints (future)
│   └── memorial.svg    # Historical memorials (future)
└── README.md           # This file
```

## Icon Sources & Licenses

### Material Symbols (UI Icons)

- **Source**: Google Fonts (self-hosted)
- **Repository**: https://github.com/google/material-design-icons
- **License**: Apache License 2.0
- **Location**: `public/fonts/MaterialSymbolsOutlined.woff2`
- **Usage**: All UI controls (close, menu, check, expand, etc.)
- **Privacy**: Self-hosted font file, no external requests to Google Fonts CDN

### Osmic Icons (POI Markers)

- **Source**: Osmic - CC0 OSM Icons
- **Repository**: https://github.com/gmgeo/osmic
- **License**: CC0-1.0 (Public Domain) - No attribution required
- **Location**: `public/icons/osmic/*.svg`
- **Usage**: Cartographic POI category markers on map
- **Privacy**: Self-hosted SVG files, no external requests

**Current Osmic Icons**:
- `monument.svg` - War memorials (Krigsminner)
- `watchtower.svg` - Observation towers (Observasjonstårn)

**Future Osmic Icons** (already downloaded, ready for use):
- `parking.svg` - Parking areas
- `alpine-hut.svg` - DNT mountain cabins
- `viewpoint.svg` - Scenic viewpoints
- `memorial.svg` - Historical memorials

### OpenStreetMap Carto Icons (Map-Specific POI)

- **Source**: openstreetmap-carto
- **Repository**: https://github.com/gravitystorm/openstreetmap-carto
- **License**: CC0-1.0 (Public Domain) - No attribution required
- **Location**: `public/icons/osm-carto/*.svg`
- **Usage**: Natural feature POI markers
- **Privacy**: Self-hosted SVG files, no external requests

**Current OSM-Carto Icons**:
- `cave.svg` - Cave entrances (Huler)

### Custom Icons (Norwegian-Specific)

- **Source**: In-house design
- **License**: Proprietary (part of Tråkke codebase)
- **Location**: Inline SVG in React components
- **Usage**: Tilfluktsrom T-marker (distinctive yellow square with "T")
- **Privacy**: No external files, rendered directly in code

## Icon Selection Criteria

Icons were selected based on:

1. **Privacy Compliance**: All icons self-hosted, no CDN dependencies
2. **GDPR Compliance**: EU-based sources where applicable (Osmic from Germany)
3. **License Freedom**: CC0/Public Domain preferred for maximum flexibility
4. **Cartographic Suitability**: Osmic designed specifically for map use
5. **Norwegian Context**: Icons relevant to Norwegian outdoor activities
6. **File Size**: Small SVG files (~1-4 KB each) for performance
7. **Semantic Meaning**: Icons that clearly represent their category

## Why Osmic Over Alternatives?

**Osmic was chosen over other icon sets because:**

| Criterion | Osmic | Mapbox Maki | Material Symbols |
|-----------|-------|-------------|------------------|
| **License** | CC0 (Public Domain) | CC0 | Apache 2.0 |
| **Map-Specific** | [OK] Designed for cartography | [OK] Designed for maps | [FAIL] General purpose |
| **Outdoor Coverage** | [OK] Excellent | [WARNING] Good | [FAIL] Limited |
| **File Size** | ~1-3 KB per SVG | ~1-2 KB per SVG | 300 KB font |
| **Norwegian Context** | [OK] Alpine huts, trails | [WARNING] Basic | [FAIL] Generic |
| **Active Maintenance** | [OK] 331 commits | [WARNING] Last update 2022 | [OK] Google-backed |

## Adding New Icons

When adding new POI categories to Tråkke:

1. **Check Osmic first**: https://github.com/gmgeo/osmic
   - Browse category folders: nature, outdoor, tourism, transport, etc.
   - Icons are 14x14px SVG, optimized for maps

2. **Download and rename**:
   ```bash
   cp temp/osmic/{category}/{icon-name}-14.svg public/icons/osmic/{simple-name}.svg
   ```

3. **Update iconService.ts**:
   ```typescript
   export const POI_ICONS: Record<POICategory, IconConfig> = {
     new_category: {
       type: 'osmic',
       path: '/trakke-pwa/icons/osmic/{simple-name}.svg',
       color: '#hexcolor'
     }
   }
   ```

4. **Document in PRIVACY_BY_DESIGN.md**: Update Icon Assets table

5. **Privacy Checklist**:
   - [OK] Icon is self-hosted in `public/icons/`
   - [OK] No external CDN requests
   - [OK] License is compatible (CC0 or similar)
   - [OK] Source documented in this README

## Privacy Guarantees

**All icons comply with Tråkke's privacy-first principles:**

- [OK] **No external CDN requests** - All icons served from same origin
- [OK] **No tracking** - No analytics or telemetry in icon files
- [OK] **GDPR compliant** - EU-based sources (Osmic from Germany)
- [OK] **Offline-first** - Icons cached by Service Worker
- [OK] **No cookies** - Static SVG/font files
- [OK] **No personal data** - Public, open-source icons only

## Performance

**Icon loading strategy:**

- Material Symbols: Loaded once as font (300 KB, cached permanently)
- Osmic SVGs: Lazy-loaded when category is activated (~1-3 KB per icon)
- Custom icons: Inline SVG (no network request, ~200 bytes)

**Optimization:**

- SVG minification: All Osmic icons are already optimized
- Vite bundling: Static assets automatically optimized
- Service Worker: Icons cached for offline use
- Canvas rendering: SVGs converted to canvas for MapLibre performance

## License Compliance

### CC0-1.0 (Osmic Icons)

Public domain dedication. No attribution required, but we credit anyway:

> POI icons from Osmic (CC0) - https://github.com/gmgeo/osmic

### Apache 2.0 (Material Symbols)

Requires license notice. Included in main LICENSE file.

### Custom Icons

Proprietary, part of Tråkke codebase under project license.

---

**Osmic Version**: Latest from github.com/gmgeo/osmic
**Material Symbols Version**: Self-hosted from Google Fonts
