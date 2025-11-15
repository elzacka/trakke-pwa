# Tråkke Design System

**Nordic Silence** – En rolig, naturinspirert design for privacy-first friluftsnavigasjon.

## Filosofi

Tråkkes designsystem bygger på prinsippet **"Nordic Silence"** – et rolig, minimalistisk uttrykk som lar kartet og naturen stå i fokus. Designet er inspirert av norsk natur med dempede, naturlige farger som ikke distraherer fra brukerens hovedmål: å utforske naturen.

### Designprinsipper

1. **Minimalistisk** – Kun essensielle UI-elementer vises
2. **Kartfokusert** – Kartet er hovedinnholdet, UI-en skal ikke konkurrere
3. **Naturinspirert** – Farger og former hentet fra norsk natur
4. **Privacy-first** – Ingen unødvendige distraksjoner eller tracking
5. **WCAG-bevisst** – Tilgjengelige kontraster og lesbarhet

---

## Logo & Identitet

### Tråkke-logoen

Tråkke-logoen består av to elementer: **symbolet** (skogikon) og **navnet** (typografi).

#### Symbol (Brand Mark)

**Material Symbol:** `forest` (Outlined variant)

I header-implementasjonen (App.tsx):

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

I fargepaletten (color_palette.html) brukes en boksramme:

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

**Spesifikasjoner:**
- **Ikon:** `forest` fra Material Symbols Outlined
- **Størrelse i app:** 28px (direkte på header)
- **Størrelse i fargepalett:** 30px (i 44×44px container)
- **Farge:** Alltid Tråkke-grønn (#3e4533)
- **Font-familie:** 'Material Symbols Outlined' (self-hosted)
- **Line-height:** 1 (for presis sentrering)

**Alternativer:**
- **SVG-fallback:** Hvis Material Symbols ikke er tilgjengelig, bruk en custom SVG-versjon av tree/forest-ikonet (se `/public/trakke-icon.svg`)
- **Monokrom:** På mørk bakgrunn, bruk hvit (#ffffff) ikonfarge

#### Navn (Logotype)

**Typografi:** Exo 2 (self-hosted variable font)

I header-implementasjonen (App.tsx):

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

/* Mobil (max-width: 768px) */
@media (max-width: 768px) {
  .app-title {
    font-size: 24px;
  }
}
```

I fargepaletten brukes system fonts:

```css
.brand-name {
  font-family: system-ui, -apple-system, sans-serif;
  font-weight: 600;        /* Semibold */
  font-size: 26px;
  letter-spacing: 0.04em;
  color: #3e4533;
}
```

**Spesifikasjoner:**
- **Skrivemåte:** `Tråkke` (stor T, små bokstaver, med norsk å)
- **Font i app:** Exo 2 (self-hosted)
- **Font i dokumentasjon:** System fonts (privacy-compliant)
- **Vekt i app:** 300 (light, for elegant uttrykk)
- **Vekt i dokumentasjon:** 600 (semibold, for bedre lesbarhet)
- **Størrelse:** 28px (desktop), 24px (mobil)
- **Farge:** Alltid Tråkke-grønn (#3e4533)
- **Letter-spacing:** 0.02em (app), 0.04em (dokumentasjon)

#### Logo Lockup

Standard plassering er horisontal med symbol til venstre.

I app-headeren:

```css
.header-branding {
  display: flex;
  align-items: center;
  gap: 8px;  /* Avstand mellom symbol og navn */
}
```

I fargepaletten:

```css
.brand-lockup {
  display: flex;
  align-items: center;
  gap: 14px;
}
```

**Varianter:**

1. **Primær (horisontal):**
   ```
   [Symbol] Tråkke
   ```
   - Symbol 28px, navn 28px (desktop app)
   - Symbol 28px, navn 24px (mobil app)
   - Gap: 8px (app), 14px (dokumentasjon)
   - Bruk: Header, velkomstskjerm, about-side

2. **Kompakt (kun symbol):**
   ```
   [Symbol]
   ```
   - Kun symbol 44×44px
   - Bruk: PWA-ikon, favicon, tight spaces

3. **Vertikal (sentert):**
   ```
      [Symbol]
      Tråkke
   ```
   - Symbol over navn
   - Gap: 8px
   - Bruk: Splash screens, onboarding

#### Clearspace & Plassering

**Minimum clearspace:** 12px rundt hele logo-lockupen (0.5× symbol-høyde)

**Ikke:**
- ❌ Strekk eller skjev logoen
- ❌ Endre farger (kun #3e4533 eller #ffffff)
- ❌ Legg til effekter (skygger, gradients på tekst)
- ❌ Plasser på komplekse bakgrunner uten overlay
- ❌ Bruk andre ikoner enn `forest`

**Tillatt:**
- ✅ Monokrom hvit på mørke bakgrunner
- ✅ SVG-fallback hvis Material Symbols ikke tilgjengelig
- ✅ Skalere proporsjonsbestemt (behold aspect ratio)

#### PWA-ikon (App Icon)

Basert på symbolet, optimalisert for maskering.

```json
{
  "sizes": "192x192",
  "type": "image/png",
  "purpose": "maskable"
}
```

**Safe zone:** 20% padding fra kanten (maskable spec)
- Icon size: 192×192px eller 512×512px
- Symbol plassert sentrisk med 38px safe zone
- Bakgrunn: Tråkke-grønn (#3e4533)
- Ikon: Hvit (#ffffff) `forest`-symbol

#### Favicon

```html
<link rel="icon" type="image/svg+xml" href="/trakke-icon.svg">
```

Forenklet versjon:
- 32×32px eller 48×48px
- Tråkke-grønn bakgrunn
- Hvit eller transparent `forest`-ikon

---

## Fargepalett

### Brand-kjerne

Tråkke-grønn er hentet fra norske skoger – en mørk, dyp grønnfarge som brukes sparsomt for identitet og primærhandlinger.

```css
--trk-brand: #3e4533;        /* Primær brand-farge */
--trk-brand-soft: #606756;   /* Mykere variant for UI-elementer */
--trk-brand-tint: #e9ece6;   /* Lys tint for bakgrunner og flater */
```

**Bruksområder:**
- `--trk-brand`: Primærknapper, aktive tilstander, logo, rutelinjer
- `--trk-brand-soft`: Sekundære knapper, inaktive ikoner
- `--trk-brand-tint`: Hover-states, subtile bakgrunner

### Nøytraler

Varme, papiraktige nøytraler uten blåskjær. Gir en naturlig, rolig følelse.

```css
--trk-bg: #fafaf7;              /* Hovedbakgrunn */
--trk-surface: #ffffff;         /* Kort, paneler, overlays */
--trk-surface-subtle: #f2f3f0;  /* Subtil bakgrunn for elementer */
--trk-border: #e4e5e1;          /* Standard border */
--trk-border-strong: #c9ccc5;   /* Sterkere border for separering */
```

**Bruksområder:**
- `--trk-bg`: Body background
- `--trk-surface`: Bottom sheets, kort, modaler
- `--trk-surface-subtle`: Input-bakgrunner, disabled states
- `--trk-border`: Skillelinjer, kortborders
- `--trk-border-strong`: Fremhevede borders, separatorer

### Tekstfarger

Tre nivåer av tekstkontrast for hierarki.

```css
--trk-text: #1a1d1b;          /* Primær tekst (body, overskrifter) */
--trk-text-muted: #4a4f47;    /* Sekundær tekst (beskrivelser) */
--trk-text-soft: #7c8278;     /* Tertiær tekst (hjelpetekst, labels) */
```

**Kontraster:**
- `--trk-text` på `--trk-surface`: **15.8:1** (AAA)
- `--trk-text-muted` på `--trk-surface`: **8.9:1** (AAA)
- `--trk-text-soft` på `--trk-surface`: **4.8:1** (AA)

### Funksjonelle farger

Semantiske farger for GPS-posisjon, varsler og suksess. Brukes sparsomt og konsekvent.

```css
--trk-blue: #1e6ce0;    /* GPS-posisjon, info, fokus */
--trk-red: #d0443e;     /* Waypoints, varsler, destruktive handlinger */
--trk-green: #2e9e5b;   /* Suksess, bekreftelser */
```

**Bruksområder:**
- `--trk-blue`: Brukerposisjon-markør, "følg meg"-knapp, fokuserte elementer
- `--trk-red`: Waypoint-pins, slette-knapper, feilmeldinger
- `--trk-green`: Lagret-bekreftelser, nedlasting fullført, suksessmeldinger

### Overlays & dybde

Transparente lag for paneler som svever over kartet.

```css
--trk-overlay-strong: rgba(255, 255, 255, 0.85);  /* Sterkt overlay */
--trk-overlay-soft: rgba(250, 250, 246, 0.6);     /* Mykt overlay */
--trk-selection: rgba(62, 69, 51, 0.18);          /* Markerte ruter/områder */
--trk-shadow-soft: 0 12px 40px rgba(0, 0, 0, 0.06); /* Subtil skygge */
```

**Bruksområder:**
- `--trk-overlay-strong`: Bottom sheets, søkepanel
- `--trk-overlay-soft`: Velkomst-header, info-kort
- `--trk-selection`: Valgt rute på kart, nedlastingsområde
- `--trk-shadow-soft`: FAB-meny, kort, modaler

---

## Spacing & Layout

### Gap-tokens

Konsistent spacing for margins og gaps.

```css
--gap-xl: 32px;   /* Stor seksjonsspacing */
--gap-lg: 24px;   /* Mellom seksjoner */
--gap-md: 16px;   /* Mellom elementer */
--gap-sm: 10px;   /* Kompakte lister */
```

### Border Radius

```css
--radius-lg: 20px;   /* Bottom sheets, store paneler */
--radius-md: 14px;   /* Knapper, kort */
--radius-sm: 999px;  /* Pills, tags, ikoner */
```

---

## Typografi

### Font Stack

System-fonter for beste ytelse og privacy (ingen eksterne fonts).

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             Oxygen, Ubuntu, Cantarell, sans-serif;
```

### Størrelser

```css
/* Overskrifter */
font-size: clamp(32px, 4vw, 40px);  /* H1 - responsiv */
font-size: 26px;                     /* Brand name */
font-size: 14px;                     /* Section titles (uppercase) */

/* Body tekst */
font-size: 15px;  /* Standard body */
font-size: 13px;  /* Beskrivelser, hjelpetekst */
font-size: 12px;  /* Små labels */
font-size: 11px;  /* Pills, tags */

/* Monospace (hex-koder, koordinater) */
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### Vekter

```css
font-weight: 400;  /* Normal */
font-weight: 500;  /* Medium (knapper, labels) */
font-weight: 600;  /* Semibold (overskrifter) */
font-weight: 700;  /* Bold (store overskrifter) */
```

---

## Komponenter

### Bottom Sheets

```css
border-radius: var(--radius-lg);
background: var(--trk-surface);
box-shadow: var(--trk-shadow-soft);
padding: 18px;
backdrop-filter: blur(10px);
```

**Høyder:**
- Peek: 40vh (collapsed)
- Half: 70vh (medium)
- Full: 95vh (expanded)

### Knapper

**Primær:**
```css
background: var(--trk-brand);
color: #ffffff;
padding: 12px 20px;
border-radius: var(--radius-md);
font-size: 15px;
font-weight: 500;
```

**Sekundær:**
```css
background: transparent;
color: var(--trk-text);
border: 1px solid var(--trk-border);
```

**Destruktiv:**
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

**Interaksjon:**
- Tap: Sentrer på brukerposisjon
- Langt trykk (500ms): Åpne radialmeny

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

### Input-felter

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

## Animasjoner & Transitions

### Timing

```css
--transition-fast: 140ms ease-out;   /* Hover, små bevegelser */
--transition-med: 200ms ease-out;    /* Sheets, modaler */
```

### Hover-states

```css
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  transition: all var(--transition-fast);
}
```

### Auto-hide UI

Kontroller skjules etter 5 sekunder inaktivitet (se `useAutoHide.ts`).

---

## Ikoner

### Material Symbols Outlined

Tråkke bruker **Material Symbols Outlined** som ikonbibliotek. Fonten er selvhostet (ingen eksterne CDN) for å opprettholde privacy-first prinsippet.

**Font-definisjon** (index.css):

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
  font-size: 24px;          /* Standard størrelse */
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

**Bruk i kode:**

```tsx
<span className="material-symbols-outlined">search</span>
<span className="material-symbols-outlined">close</span>
<span className="material-symbols-outlined">forest</span>
```

**Størrelser:**
- **20px**: Små ikoner i trange knapper
- **24px**: Standard UI-ikoner (default)
- **28px**: Logo-ikon i header
- **30px**: FAB-meny hovedikon

**Farger:**
- **Standard**: `var(--trk-text-soft)` (#7c8278) - inaktive ikoner
- **Aktiv**: `var(--trk-brand)` (#3e4533) - valgte tilstander
- **Interaktiv**: `var(--trk-text)` (#1a1d1b) - hoverable ikoner
- **Funksjonell**:
  - GPS: `var(--trk-blue)` (#1e6ce0)
  - Slett: `var(--trk-red)` (#d0443e)
  - Suksess: `var(--trk-green)` (#2e9e5b)

**Ofte brukte ikoner:**
- `search` - Søk
- `close` - Lukk sheets/modaler
- `my_location` - GPS/brukerposisjon
- `location_on` - Waypoints, POI-markører
- `route` - Ruter
- `download` - Last ned offline kart
- `forest` - Logo/brand-symbol
- `expand_more` / `expand_less` - Collapse/expand
- `check` - Bekreftelser, valgte items
- `info` - Informasjon
- `settings` - Innstillinger
- `layers` - Kategorier/POI-lag

**Kilde:** https://fonts.google.com/icons (self-hosted i `/public/fonts/`)

### Custom Symbol: Tilfluktsrom (T-marker)

For POI-kategorien **Tilfluktsrom** (offentlige tilfluktsrom fra DSB) brukes et **custom SVG-symbol** i stedet for Material Symbols. Dette er det eneste unntaket fra regelen om å kun bruke Material Symbols.

**Hvorfor custom symbol:**
- Material Symbols har ikke et passende ikon for tilfluktsrom
- DSB (Direktoratet for samfunnssikkerhet og beredskap) bruker "T" som standard merking
- Tydelig visuell identitet som brukere kjenner igjen fra fysiske skilt

**SVG-definisjon** (CategorySheet.tsx og POI-markører):

```tsx
// I kategori-menyen (20×20px)
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

// På kartet (32×32px POI-markør)
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

**Spesifikasjoner:**

- **Form:** Avrundet firkant (rounded rectangle)
- **Border-radius:** 2.5px (20px størrelse), 4px (32px størrelse)
- **Bakgrunnsfarge:** `#fbbf24` (gul - matcher DSBs oransje/gule merkesystem)
- **Border:** 1px (meny), 2px (kart) - `#111827` (mørk)
- **Tekst:** "T" - system font, 400 weight
- **Tekststørrelse:** 12px (meny), 18px (kart)
- **Tekstfarge:** `#111827` (mørk, høy kontrast mot gul bakgrunn)

**Bruk i kode:**

```tsx
// Sjekk om custom symbol skal brukes
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

**CSS for POI-markører** (Map.css):

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

**Viktighet:** Dette er det **eneste godkjente unntaket** fra Material Symbols. Alle andre POI-kategorier og UI-elementer skal bruke Material Symbols Outlined.

**Kategori-konfigurasjon** (poiService.ts):

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

## Kartlag & Markører

### Kartbase

**Kartverket WMTS** (cache.kartverket.no)
- Stil: Standard topografisk
- Min zoom: 5 (Norge-oversikt)
- Max zoom: 18 (detaljert)

### Rute-styling

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

### Waypoint-markører

```javascript
// Pulserende rød pin
background: #d0443e;  // var(--trk-red)
animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
```

### Brukerposisjon

```javascript
// Blå sirkel med hvit border
background: #1e6ce0;  // var(--trk-blue)
border: 3px solid #ffffff;
border-radius: 50%;
```

---

## Accessibility

### Focus Indicators

Alle interaktive elementer har synlig fokusindikator:

```css
:focus-visible {
  outline: 2px solid var(--trk-blue);
  outline-offset: 2px;
}
```

### Tastaturnavigasjon

- Tab: Navigere mellom elementer
- Enter/Space: Aktivere knapper
- Escape: Lukke sheets/modaler
- Arrow keys: Navigere i lister

### Skjermlesere

Alle ikoner har `aria-label`, dekorative elementer har `aria-hidden="true"`.

### Kontraster

Minimum kontrast 4.5:1 (AA) for all tekst, 3:1 for store elementer.

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

**Bottom sheets:** Alltid fullbredde på mobil, maksbredde 600px på desktop.

---

## Zen Mode vs Classic Mode

### Zen Mode (Standard)

- Auto-hiding kontroller (5s timeout)
- Kollapsbar velkomst-header
- FAB-meny som primærnavigasjon
- Bottom sheets for features

### Classic Mode

- Always-visible kontroller
- Paneler i stedet for sheets
- Tradisjonell navigasjon

---

## Best Practices

### CSS

1. **Bruk alltid CSS custom properties** for farger og spacing
2. **Mobile-first** – skriv base styles for mobil, override for desktop
3. **Unngå hardkodede farger** – bruk `var(--trk-*)`
4. **Transitions** kun på transform og opacity for beste ytelse

### JavaScript

1. **Mounted refs** for async operasjoner som oppdaterer state
2. **Cleanup functions** for event listeners og timers
3. **Debounce** søk og scroll events
4. **Functional updates** når ny state avhenger av gammel state

### Performance

1. **CSS containment** for bottom sheets
2. **will-change** kun under animasjoner
3. **Lazy load** heavy components (RouteSheet, DownloadSheet)
4. **IndexedDB** for all persistence, aldri localStorage

### Privacy

1. **Ingen eksterne fonts** – system font stack
2. **Selv-hostet ikoner** – Material Symbols embedded
3. **Ingen CDNs** for libraries eller assets
4. **CSP** enforce i production builds

---

## Eksempler

### Primærknapp med ikon

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

### Info-kort over kart

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

## Verktøy & Ressurser

### Fargepalett preview

Se `/Users/lene/dev/trakke_pwa_related/color_palette.html` for interaktiv oversikt over alle farger med kopiering til clipboard.

### Design tokens i kode

Alle tokens er definert i `:root` i `index.css`:

```css
/* Se src/index.css for komplett liste */
```

### Figma (fremtidig)

Design-filer vil bli tilgjengelig når Phase 2 er komplett.

---

## Changelog

### v1.0 (2025-01-15)

- Initial design system dokumentasjon
- Nordic Silence fargepalett etablert
- CSS custom properties for alle tokens
- Accessibility guidelines dokumentert

---

**Laget for Tråkke** – Privacy-first friluftsnavigasjon
