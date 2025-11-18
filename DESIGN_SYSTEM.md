# Tråkke Design System

**Nordisk ro** – A muted design that highlights the map and lets the user explore in peace.

## Philosophy

Tråkke's design system is built on the principle of **"Nordisk ro"** (Nordic tranquility). The design is inspired by the stillness of Norwegian nature and is based on a deliberate absence of noise. The map takes center stage, while the interface remains discreetly in the background. The color palette is muted and natural, so that the user's attention remains where it should be: out in the terrain, not on the screen.

### Design Principles

1. **Minimalist** – The user only sees what is actually needed.
2. **Map-centric** – The map is the main content without competition from other elements.
3. **Nature-inspired** – Colors and shapes drawn from Norwegian nature.
4. **Privacy by default** – No noise. No tracking.
5. **Accessibility as practice** – Contrasts, typography, and structure follow WCAG for readability and usability.

---

## Logo & Identity

### The Tråkke Logo

The Tråkke logo consists of two elements: the **symbol** and the **name**. Together they create an expression that is easy to recognize and simple to use across all surfaces.

#### Symbol (Brand Mark)

**Material Symbol:** `forest` (Outlined variant)

In the header implementation (App.tsx):

```tsx
<span className="material-symbols-outlined logo-icon">
  forest
</span>
```

```css
.logo-icon {
  color: #3e4533;      /* var(--trk-brand) */
  font-size: 28px;
  line-height: 1;
  display: flex;
  align-items: center;
}
```

In the color palette (color_palette.html), a box frame is used:

```css
.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  box-shadow:
    0 6px 18px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.06);
}

.forest-icon {
  font-family: 'Material Symbols Outlined';
  font-size: 30px;
  color: #3e4533;  /* var(--trk-brand) */
  line-height: 1;
}
```

**Specifications:**
- **Icon:** `forest` from Material Symbols Outlined
- **Size in app:** 28px (directly on header)
- **Size in color palette:** 30px (in 44×44px container)
- **Color:** Always Tråkke green (#3e4533)
- **Font family:** 'Material Symbols Outlined' (self-hosted)
- **Line-height:** 1 (for precise centering)

**Alternatives:**
- **SVG fallback:** If Material Symbols is not available, use a custom SVG version of the tree/forest icon (see `/public/trakke-icon.svg`)
- **Monochrome:** On dark backgrounds, use white (#ffffff) icon color

#### Name (Logotype)

**Typography:** Exo 2 (self-hosted variable font)

In the header implementation (App.tsx):

```tsx
<h1 className="app-title">Tråkke</h1>
```

```css
.app-title {
  font-family: 'Exo 2', sans-serif;
  color: #3e4533;         /* var(--trk-brand) */
  font-size: 28px;
  font-weight: 300;       /* Light */
  margin: 0;
  letter-spacing: 0.02em;
  line-height: 1;
}

/* Mobile (max-width: 768px) */
@media (max-width: 768px) {
  .app-title {
    font-size: 24px;
  }
}
```

In the color palette, system fonts are used:

```css
.brand-name {
  font-family: system-ui, -apple-system, sans-serif;
  font-weight: 600;        /* Semibold */
  font-size: 26px;
  letter-spacing: 0.04em;
  color: #3e4533;
}
```

**Specifications:**
- **Spelling:** `Tråkke` (capital T, lowercase letters, with Norwegian å)
- **Font in app:** Exo 2 (self-hosted)
- **Font in documentation:** System fonts (privacy-compliant)
- **Weight in app:** 300 (light, for elegant expression)
- **Weight in documentation:** 600 (semibold, for better readability)
- **Size:** 28px (desktop), 24px (mobile)
- **Color:** Always Tråkke green (#3e4533)
- **Letter-spacing:** 0.02em (app), 0.04em (documentation)

#### Logo Lockup

Standard placement is horizontal with symbol on the left.

In the app header:

```css
.header-branding {
  display: flex;
  align-items: center;
  gap: 8px;  /* Distance between symbol and name */
}
```

In the color palette:

```css
.brand-lockup {
  display: flex;
  align-items: center;
  gap: 14px;
}
```

**Variants:**

1. **Primary (horizontal):**
   ```
   [Symbol] Tråkke
   ```
   - Symbol 28px, name 28px (desktop app)
   - Symbol 28px, name 24px (mobile app)
   - Gap: 8px (app), 14px (documentation)
   - Use: Header, welcome screen, about page

2. **Compact (symbol only):**
   ```
   [Symbol]
   ```
   - Symbol only 44×44px
   - Use: PWA icon, favicon, tight spaces

3. **Vertical (centered):**
   ```
      [Symbol]
      Tråkke
   ```
   - Symbol above name
   - Gap: 8px
   - Use: Splash screens, onboarding

#### Clearspace & Placement

**Minimum clearspace:** 12px around the entire logo lockup (0.5× symbol height)

**Don't:**
- Stretch or skew the logo
- Change colors (only #3e4533 or #ffffff)
- Add effects (shadows, gradients on text)
- Place on complex backgrounds without overlay
- Use icons other than `forest`

**Allowed:**
- Monochrome white on dark backgrounds
- SVG fallback if Material Symbols not available
- Scale proportionally (maintain aspect ratio)

#### PWA Icon (App Icon)

Based on the symbol, optimized for masking.

```json
{
  "sizes": "192x192",
  "type": "image/png",
  "purpose": "maskable"
}
```

**Safe zone:** 20% padding from edge (maskable spec)
- Icon size: 192×192px or 512×512px
- Symbol placed centrally with 38px safe zone
- Background: Tråkke green (#3e4533)
- Icon: White (#ffffff) `forest` symbol

#### Favicon

```html
<link rel="icon" type="image/svg+xml" href="/trakke-icon.svg">
```

Simplified version:
- 32×32px or 48×48px
- Tråkke green background
- White or transparent `forest` icon

---

## Color Palette

### Brand Core

Tråkke green is drawn from Norwegian forests – a dark, deep green color used sparingly for identity and primary actions.

```css
--trk-brand: #3e4533;        /* Primary brand color */
--trk-brand-soft: #606756;   /* Softer variant for UI elements */
--trk-brand-tint: #e9ece6;   /* Light tint for backgrounds and surfaces */
```

**Use cases:**
- `--trk-brand`: Primary buttons, active states, logo, route lines
- `--trk-brand-soft`: Secondary buttons, inactive icons
- `--trk-brand-tint`: Hover states, subtle backgrounds

### Neutrals

Warm, paper-like neutrals without blue cast. Provides a natural, calm feeling.

```css
--trk-bg: #fafaf7;              /* Main background */
--trk-surface: #ffffff;         /* Cards, panels, overlays */
--trk-surface-subtle: #f2f3f0;  /* Subtle background for elements */
--trk-border: #e4e5e1;          /* Standard border */
--trk-border-strong: #c9ccc5;   /* Stronger border for separation */
```

**Use cases:**
- `--trk-bg`: Body background
- `--trk-surface`: Bottom sheets, cards, modals
- `--trk-surface-subtle`: Input backgrounds, disabled states
- `--trk-border`: Divider lines, card borders
- `--trk-border-strong`: Emphasized borders, separators

### Text Colors

Three levels of text contrast for hierarchy.

```css
--trk-text: #1a1d1b;          /* Primary text (body, headings) */
--trk-text-muted: #4a4f47;    /* Secondary text (descriptions) */
--trk-text-soft: #7c8278;     /* Tertiary text (help text, labels) */
```

**Contrasts:**
- `--trk-text` on `--trk-surface`: **15.8:1** (AAA)
- `--trk-text-muted` on `--trk-surface`: **8.9:1** (AAA)
- `--trk-text-soft` on `--trk-surface`: **4.8:1** (AA)

### Functional Colors

Semantic colors for GPS position, alerts, and success. Used sparingly and consistently.

```css
--trk-blue: #1e6ce0;    /* GPS position, info, focus */
--trk-red: #d0443e;     /* Waypoints, alerts, destructive actions */
--trk-green: #2e9e5b;   /* Success, confirmations */
```

**Use cases:**
- `--trk-blue`: User position marker, "follow me" button, focused elements
- `--trk-red`: Waypoint pins, delete buttons, error messages
- `--trk-green`: Saved confirmations, download complete, success messages

### Overlays & Depth

Transparent layers for panels that float above the map.

```css
--trk-overlay-strong: rgba(255, 255, 255, 0.85);  /* Strong overlay */
--trk-overlay-soft: rgba(250, 250, 246, 0.6);     /* Soft overlay */
--trk-selection: rgba(62, 69, 51, 0.18);          /* Selected routes/areas */
--trk-shadow-soft: 0 12px 40px rgba(0, 0, 0, 0.06); /* Subtle shadow */
```

**Use cases:**
- `--trk-overlay-strong`: Bottom sheets, search panel
- `--trk-overlay-soft`: Welcome header, info cards
- `--trk-selection`: Selected route on map, download area
- `--trk-shadow-soft`: FAB menu, cards, modals

---

## Spacing & Layout

### Gap Tokens

Consistent spacing for margins and gaps.

```css
--gap-xl: 32px;   /* Large section spacing */
--gap-lg: 24px;   /* Between sections */
--gap-md: 16px;   /* Between elements */
--gap-sm: 10px;   /* Compact lists */
```

### Border Radius

```css
--radius-lg: 20px;   /* Bottom sheets, large panels */
--radius-md: 14px;   /* Buttons, cards */
--radius-sm: 999px;  /* Pills, tags, icons */
```

---

## Typography

### Font Stack

System fonts for best performance and privacy (no external fonts).

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             Oxygen, Ubuntu, Cantarell, sans-serif;
```

### Sizes

```css
/* Headings */
font-size: clamp(32px, 4vw, 40px);  /* H1 - responsive */
font-size: 26px;                     /* Brand name */
font-size: 14px;                     /* Section titles (uppercase) */

/* Body text */
font-size: 15px;  /* Standard body */
font-size: 13px;  /* Descriptions, help text */
font-size: 12px;  /* Small labels */
font-size: 11px;  /* Pills, tags */

/* Monospace (hex codes, coordinates) */
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### Weights

```css
font-weight: 400;  /* Normal */
font-weight: 500;  /* Medium (buttons, labels) */
font-weight: 600;  /* Semibold (headings) */
font-weight: 700;  /* Bold (large headings) */
```

---

## Components

### Bottom Sheets

```css
border-radius: var(--radius-lg);
background: var(--trk-surface);
box-shadow: var(--trk-shadow-soft);
padding: 18px;
backdrop-filter: blur(10px);
```

**Heights:**
- Peek: 40vh (collapsed)
- Half: 70vh (medium)
- Full: 95vh (expanded)

### Buttons

**Primary:**
```css
background: var(--trk-brand);
color: #ffffff;
padding: 12px 20px;
border-radius: var(--radius-md);
font-size: 15px;
font-weight: 500;
```

**Secondary:**
```css
background: transparent;
color: var(--trk-text);
border: 1px solid var(--trk-border);
```

**Destructive:**
```css
background: var(--trk-red);
color: #ffffff;
```

### FAB (Floating Action Button)

```css
width: 56px;
height: 56px;
border-radius: 50%;
background: var(--trk-brand);
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
```

**Interaction:**
- Tap: Center on user position
- Long press (500ms): Open radial menu

### Pills & Tags

```css
padding: 6px 11px;
border-radius: var(--radius-sm);
background: var(--trk-brand-tint);
border: 1px solid var(--trk-border);
font-size: 11px;
text-transform: uppercase;
letter-spacing: 0.12em;
```

### Input Fields

```css
background: var(--trk-surface-subtle);
border: 1px solid var(--trk-border);
border-radius: var(--radius-md);
padding: 10px 14px;
font-size: 15px;
```

**Focus:**
```css
outline: 2px solid var(--trk-blue);
outline-offset: 2px;
```

---

## Animations & Transitions

### Timing

```css
--transition-fast: 140ms ease-out;   /* Hover, small movements */
--transition-med: 200ms ease-out;    /* Sheets, modals */
```

### Hover States

```css
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  transition: all var(--transition-fast);
}
```

### Auto-hide UI

Controls hide after 5 seconds of inactivity (see `useAutoHide.ts`).

---

## Icons

### Material Symbols Outlined

Tråkke uses **Material Symbols Outlined** as its icon library. The font is self-hosted (no external CDN) to maintain the privacy-first principle.

**Font definition** (index.css):

```css
@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 100 700;
  font-display: block;
  src: url('/fonts/MaterialSymbolsOutlined.woff2') format('woff2');
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;          /* Standard size */
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Use in code:**

```tsx
<span className="material-symbols-outlined">search</span>
<span className="material-symbols-outlined">close</span>
<span className="material-symbols-outlined">forest</span>
```

**Sizes:**
- **20px**: Small icons in tight buttons
- **24px**: Standard UI icons (default)
- **28px**: Logo icon in header
- **30px**: FAB menu main icon

**Colors:**
- **Standard**: `var(--trk-text-soft)` (#7c8278) - inactive icons
- **Active**: `var(--trk-brand)` (#3e4533) - selected states
- **Interactive**: `var(--trk-text)` (#1a1d1b) - hoverable icons
- **Functional**:
  - GPS: `var(--trk-blue)` (#1e6ce0)
  - Delete: `var(--trk-red)` (#d0443e)
  - Success: `var(--trk-green)` (#2e9e5b)

**Commonly used icons:**
- `search` - Search
- `close` - Close sheets/modals
- `my_location` - GPS/user position
- `location_on` - Waypoints, POI markers
- `route` - Routes
- `download` - Download offline maps
- `forest` - Logo/brand symbol
- `expand_more` / `expand_less` - Collapse/expand
- `check` - Confirmations, selected items
- `info` - Information
- `settings` - Settings
- `layers` - Categories/POI layers

**Source:** https://fonts.google.com/icons (self-hosted in `/public/fonts/`)

### Custom Symbol: Tilfluktsrom (T-marker)

For the POI category **Tilfluktsrom** (public shelters from DSB), a **custom SVG symbol** is used instead of Material Symbols. This is the only exception from the rule of only using Material Symbols.

**Why custom symbol:**
- Material Symbols doesn't have a suitable icon for shelters
- DSB (Directorate for Civil Protection) uses "T" as standard marking
- Clear visual identity that users recognize from physical signs

**SVG definition** (CategorySheet.tsx and POI markers):

```tsx
// In category menu (20×20px)
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect
    x="0.5"
    y="0.5"
    width="19"
    height="19"
    rx="2.5"
    fill="#fbbf24"      /* Yellow background */
    stroke="#111827"    /* Dark border */
    strokeWidth="1"
  />
  <text
    x="10"
    y="10"
    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize="12"
    fontWeight="400"
    fill="#111827"      /* Dark text */
    textAnchor="middle"
    dominantBaseline="central"
  >T</text>
</svg>

// On map (32×32px POI marker)
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect
    x="1"
    y="1"
    width="30"
    height="30"
    rx="4"
    fill="#fbbf24"
    stroke="#111827"
    strokeWidth="2"
  />
  <text
    x="16"
    y="16"
    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize="18"
    fontWeight="400"
    fill="#111827"
    textAnchor="middle"
    dominantBaseline="central"
  >T</text>
</svg>
```

**Specifications:**

- **Shape:** Rounded rectangle
- **Border-radius:** 2.5px (20px size), 4px (32px size)
- **Background color:** `#fbbf24` (yellow - matches DSB's orange/yellow marking system)
- **Border:** 1px (menu), 2px (map) - `#111827` (dark)
- **Text:** "T" - system font, 400 weight
- **Text size:** 12px (menu), 18px (map)
- **Text color:** `#111827` (dark, high contrast against yellow background)

**Use in code:**

```tsx
// Check if custom symbol should be used
{category.icon === 'custom-t-marker' ? (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    {/* SVG markup */}
  </svg>
) : (
  <span className="material-symbols-outlined" style={{ color: category.color }}>
    {category.icon}
  </span>
)}
```

**CSS for POI markers** (Map.css):

```css
.poi-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 32px;
  height: 32px;
  transition: transform 0.2s ease;
  pointer-events: auto;
  z-index: 1;
}

.poi-marker:hover {
  transform: scale(1.15);
}

/* Only add white circle background for Material Symbol icons, not custom SVG */
.poi-marker:has(.material-symbols-outlined) {
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

/* Custom T marker with drop shadow */
.poi-marker svg {
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3));
}
```

**Importance:** This is the **only approved exception** from Material Symbols. All other POI categories and UI elements should use Material Symbols Outlined.

**Category configuration** (poiService.ts):

```typescript
const CATEGORIES: Record<POICategory, CategoryConfig> = {
  shelters: {
    id: 'shelters',
    name: 'Tilfluktsrom',
    icon: 'custom-t-marker',  // Special case
    color: '#fbbf24',         // Yellow
    wfsUrl: 'https://ogc.dsb.no/wfs.ashx',
    layerName: 'layer_340'
  }
}
```

---

## Map Layers & Markers

### Map Base

**Kartverket WMTS** (cache.kartverket.no)
- Style: Standard topographic
- Min zoom: 5 (Norway overview)
- Max zoom: 18 (detailed)

### Route Styling

```javascript
{
  type: 'line',
  paint: {
    'line-color': '#3e4533',  // var(--trk-brand)
    'line-width': 4,
    'line-opacity': 0.9
  }
}
```

### Waypoint Markers

```javascript
// Pulsing red pin
background: #d0443e;  // var(--trk-red)
animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
```

### User Position

```javascript
// Blue circle with white border
background: #1e6ce0;  // var(--trk-blue)
border: 3px solid #ffffff;
border-radius: 50%;
```

---

## Accessibility

### Focus Indicators

All interactive elements have visible focus indicator:

```css
:focus-visible {
  outline: 2px solid var(--trk-blue);
  outline-offset: 2px;
}
```

### Keyboard Navigation

- Tab: Navigate between elements
- Enter/Space: Activate buttons
- Escape: Close sheets/modals
- Arrow keys: Navigate in lists

### Screen Readers

All icons have `aria-label`, decorative elements have `aria-hidden="true"`.

### Contrasts

Minimum contrast 4.5:1 (AA) for all text, 3:1 for large elements.

---

## Responsive Breakpoints

```css
/* Mobile-first approach */

/* Tablets */
@media (max-width: 768px) { }

/* Small phones */
@media (max-width: 480px) { }

/* Large displays */
@media (min-width: 1200px) { }
```

**Bottom sheets:** Always full-width on mobile, max-width 600px on desktop.

---

## Zen Mode vs Classic Mode

### Zen Mode (Default)

- Auto-hiding controls (5s timeout)
- Collapsible welcome header
- FAB menu as primary navigation
- Bottom sheets for features

### Classic Mode

- Always-visible controls
- Panels instead of sheets
- Traditional navigation

---

## Best Practices

### CSS

1. **Always use CSS custom properties** for colors and spacing
2. **Mobile-first** – write base styles for mobile, override for desktop
3. **Avoid hardcoded colors** – use `var(--trk-*)`
4. **Transitions** only on transform and opacity for best performance

### JavaScript

1. **Mounted refs** for async operations that update state
2. **Cleanup functions** for event listeners and timers
3. **Debounce** search and scroll events
4. **Functional updates** when new state depends on old state

### Performance

1. **CSS containment** for bottom sheets
2. **will-change** only during animations
3. **Lazy load** heavy components (RouteSheet, DownloadSheet)
4. **IndexedDB** for all persistence, never localStorage

### Privacy

1. **No external fonts** – system font stack
2. **Self-hosted icons** – Material Symbols embedded
3. **No CDNs** for libraries or assets
4. **CSP** enforce in production builds

---

## Examples

### Primary Button with Icon

```tsx
<button className="primary-button">
  <span className="material-symbols-outlined">download</span>
  Last ned kart
</button>
```

```css
.primary-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--trk-brand);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.primary-button:hover {
  background: var(--trk-brand-soft);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}
```

### Info Card Over Map

```tsx
<div className="map-overlay-card">
  <h3>Rute lagret</h3>
  <p>Din rute er lagret lokalt på enheten.</p>
</div>
```

```css
.map-overlay-card {
  background: var(--trk-overlay-strong);
  backdrop-filter: blur(10px);
  border: 1px solid var(--trk-border);
  border-radius: var(--radius-lg);
  padding: 16px 18px;
  box-shadow: var(--trk-shadow-soft);
}
```

---

## Tools & Resources

### Color Palette Preview

See `/Users/lene/dev/trakke_pwa_related/color_palette.html` for an interactive overview of all colors with clipboard copying.

### Design Tokens in Code

All tokens are defined in `:root` in `index.css`:

```css
/* See src/index.css for complete list */
```

### Figma (future)

Design files will be available when Phase 2 is complete.

---

## Changelog

### v1.0 (2025-01-15)

- Initial design system documentation
- Nordisk ro color palette established
- CSS custom properties for all tokens
- Accessibility guidelines documented

---

**Made for Tråkke** – Privacy-first outdoor navigation
