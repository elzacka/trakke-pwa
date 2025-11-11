# Testing Guide - Tråkke PWA

**Last Updated**: November 8, 2025
**Version**: 1.0

This document provides comprehensive testing procedures for Tråkke PWA.

---

## Quick Start

### Development Testing
```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Testing
```bash
# Build production version
npm run build

# Preview production build
npm run preview

# Open http://localhost:4173
```

---

## Build Status

### Latest Build (November 8, 2025)

**Build Command**: `npm run build`

**Results**:
```
✓ TypeScript compilation successful
✓ Vite build successful (1.22s)
✓ PWA generation successful
✓ Service Worker created
```

**Output**:
- **dist/index.html**: 1.39 kB (gzipped: 0.63 kB)
- **dist/assets/index-*.css**: 73.98 kB (gzipped: 11.06 kB)
- **dist/assets/index-*.js**: 1,159.38 kB (gzipped: 322.53 kB)
- **dist/sw.js**: Service Worker
- **dist/manifest.webmanifest**: PWA manifest

**Precached Assets**: 17 entries (1.51 MB)

**Notes**:
- Large chunk warning is expected (MapLibre GL is 1.1 MB)
- Material Symbols font (3.6 MB) uses runtime caching instead of precaching
- Total initial download: ~400 KB (gzipped)

---

## Testing Checklist

### 1. Visual Testing

#### Desktop (Chrome/Edge/Firefox)
- [ ] Header displays correctly (forest icon + "Tråkke" text aligned)
- [ ] Map loads and displays Norwegian topography
- [ ] Map controls visible (zoom +/-, compass)
- [ ] Location button visible (bottom right)
- [ ] Scale indicator visible
- [ ] No console errors

#### Mobile (iOS Safari/Chrome, Android Chrome)
- [ ] Responsive layout (header, map, controls)
- [ ] Touch gestures work (pan, zoom, rotate)
- [ ] Location button accessible
- [ ] Map fills viewport correctly
- [ ] No horizontal scrolling

### 2. Functionality Testing

#### Map Interaction
- [ ] **Pan**: Click and drag map → Map moves
- [ ] **Zoom**: Use +/- buttons → Map zooms in/out
- [ ] **Scroll Zoom**: Mouse wheel → Map zooms
- [ ] **Pinch Zoom** (mobile): Two-finger pinch → Map zooms
- [ ] **Compass Reset**: Click compass → Map returns to north

#### Location Tracking
- [ ] Click location button
- [ ] Browser asks for permission (first time)
- [ ] Grant permission
- [ ] Blue dot appears at your location
- [ ] Map centers on your position
- [ ] Location updates as you move (if testing on mobile)

#### Map Tiles
- [ ] Tiles load from Kartverket
- [ ] No broken tile images
- [ ] Smooth loading while panning
- [ ] Different zoom levels show appropriate detail

### 3. PWA Testing

#### Installation

**Desktop (Chrome/Edge)**:
1. Open http://localhost:4173 (or deployed URL)
2. Look for install icon in address bar
3. Click "Install Tråkke"
4. App opens in standalone window
5. App icon appears in OS app launcher

**Mobile (iOS Safari)**:
1. Open site in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Icon appears on home screen
5. Tap icon → App opens fullscreen

**Mobile (Android Chrome)**:
1. Open site in Chrome
2. Tap "Install" banner or menu → "Install app"
3. Icon appears in app drawer
4. Tap icon → App opens fullscreen

#### Service Worker
1. Open DevTools → Application → Service Workers
2. Verify "Service Worker" is activated and running
3. Check "Update on reload" (for testing)
4. Refresh page
5. Service Worker should update

#### Manifest
1. Open DevTools → Application → Manifest
2. Verify:
   - Name: "Tråkke"
   - Theme color: #3e4533
   - Display: standalone
   - Icons: 192x192 and 512x512
   - Start URL: /

### 4. Offline Testing

#### Method 1: DevTools Offline Mode
1. Open http://localhost:4173
2. Navigate map (visit several locations)
3. Open DevTools → Network tab
4. Check "Offline" checkbox
5. Refresh page
6. **Expected**: App loads from cache
7. Navigate map
8. **Expected**: Previously viewed tiles display

#### Method 2: Disable Network
1. Open app (installed or browser)
2. Use app normally for a few minutes
3. Disconnect from internet (WiFi off, airplane mode)
4. Refresh app
5. **Expected**: App still works
6. Navigate to previously viewed areas
7. **Expected**: Map tiles load from cache

#### Method 3: Service Worker Cache
1. Open DevTools → Application → Cache Storage
2. Expand cache entries:
   - **workbox-precache-***: App files (HTML, CSS, JS)
   - **kartverket-tiles**: Cached map tiles
   - **local-fonts**: Font files
3. Click on cache to inspect entries
4. Verify tiles are cached as you navigate

### 5. Privacy Testing

#### Network Traffic Audit
1. Open DevTools → Network tab
2. Clear all requests
3. Use app for 5 minutes (navigate map, use location)
4. Review all network requests
5. **Verify ONLY these domains**:
   - `localhost` or your domain
   - `cache.kartverket.no`
6. **Verify NO requests to**:
   - google-analytics.com
   - facebook.com
   - googleapis.com (fonts should be local)
   - Any other third-party domains

#### Storage Audit
1. Open DevTools → Application → Storage
2. **Cookies**: Should be empty ✓
3. **Local Storage**: Should be empty ✓
4. **Session Storage**: Should be empty ✓
5. **IndexedDB**: Check `trakke-db` (if implemented)
6. **Cache Storage**: Should contain:
   - workbox-precache (app files)
   - kartverket-tiles (map tiles)
   - local-fonts (self-hosted fonts)

#### Content Security Policy
1. Open DevTools → Console
2. Attempt to load external resource:
   ```javascript
   // Try in console:
   fetch('https://www.google.com')
   ```
3. **Expected**: CSP error blocking request
4. **Message**: "Content Security Policy directive violated"

#### Geolocation Permission
1. Click location button
2. **Expected**: Browser asks for permission
3. Deny permission
4. **Expected**: No location shown, no error thrown
5. Refresh page, click location button again
6. Grant permission
7. **Expected**: Location shown on map
8. Check Settings → Site permissions
9. **Expected**: Can revoke location permission

### 6. Performance Testing

#### Initial Load (Cold Cache)
1. Clear all browser data
2. Open http://localhost:4173
3. Open DevTools → Network tab → Disable cache
4. Refresh page
5. **Measure**:
   - **First Contentful Paint (FCP)**: < 1.5s
   - **Largest Contentful Paint (LCP)**: < 2.5s
   - **Time to Interactive (TTI)**: < 3.5s
   - **Total download**: ~400 KB (gzipped)

#### Subsequent Loads (Warm Cache)
1. Visit page once
2. Refresh page
3. **Expected**:
   - FCP: < 0.5s
   - LCP: < 1.0s
   - TTI: < 1.5s
   - Most assets from cache

#### Map Performance
1. Pan map rapidly
2. **Expected**: Smooth 60 FPS
3. Zoom in/out repeatedly
4. **Expected**: Smooth transitions
5. Check DevTools → Performance
6. **Expected**: No janky frames

### 7. Browser Compatibility Testing

Test on the following browsers (November 2025 versions):

#### Desktop
- [x] **Chrome 142+** (142.0.7444.134)
- [x] **Edge 142+** (142.0.3595.65)
- [x] **Firefox 144+** (144.0.2)
- [x] **Safari 26+** (26.1)

#### Mobile
- [x] **iOS Safari 26+**
- [x] **iOS Chrome 142+**
- [x] **Android Chrome 142+**
- [x] **Android Firefox 144+**

See [BROWSER_COMPATIBILITY.md](BROWSER_COMPATIBILITY.md) for detailed compatibility notes.

### 8. Security Testing

#### HTTPS Enforcement
**Note**: Only applicable in production deployment, not localhost

1. Deploy to production
2. Visit http://yourdomain.com
3. **Expected**: Redirects to https://yourdomain.com
4. Check certificate
5. **Expected**: Valid SSL/TLS certificate

#### CSP Headers
1. Open DevTools → Network
2. Click on HTML document
3. Check Response Headers
4. **Verify**:
   ```
   Content-Security-Policy: default-src 'self'; ...
   ```

#### No Vulnerable Dependencies
```bash
# Run security audit
npm audit

# Expected: No vulnerabilities
# If found: npm audit fix
```

### 9. Accessibility Testing

#### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space activates buttons
- [ ] Focus visible on all elements
- [ ] No keyboard traps

#### Screen Reader Testing
- [ ] Header landmarks readable
- [ ] Buttons have accessible labels
- [ ] Map region announced
- [ ] Location button purpose clear

#### Color Contrast
- [ ] Text readable on all backgrounds
- [ ] Button text meets WCAG AA (4.5:1)
- [ ] Focus indicators visible

---

## Common Issues and Solutions

### Issue 1: Map Not Loading

**Symptoms**: Gray/blank map area

**Possible Causes**:
1. **No internet connection**
   - Solution: Check network, tiles require initial download
2. **Kartverket service down**
   - Check: https://cache.kartverket.no/health (if available)
   - Solution: Wait for service to recover
3. **CSP blocking tiles**
   - Check: Console for CSP errors
   - Solution: Verify `img-src` and `connect-src` include `cache.kartverket.no`

### Issue 2: Service Worker Not Registering

**Symptoms**: PWA features not working offline

**Possible Causes**:
1. **Not HTTPS** (production only)
   - Solution: Deploy to HTTPS or use localhost
2. **Browser doesn't support Service Workers**
   - Check: caniuse.com/serviceworkers
3. **Service Worker registration failed**
   - Check: DevTools → Console for errors
   - Check: DevTools → Application → Service Workers

### Issue 3: Large Bundle Size Warning

**Symptoms**: Build warns about chunks > 500 KB

**Status**: **Expected behavior**

**Reason**: MapLibre GL JS is ~1 MB (322 KB gzipped)

**Notes**:
- This is normal for map libraries
- Gzipped size is acceptable (~322 KB)
- Code splitting not beneficial (entire library needed)
- Can suppress with `build.chunkSizeWarningLimit` if needed

### Issue 4: Font Not Loading

**Symptoms**: Icons/text showing wrong font

**Possible Causes**:
1. **Font files not in dist/fonts/**
   - Solution: Check build output includes fonts
2. **CSP blocking fonts**
   - Solution: Verify `font-src 'self'` in CSP
3. **Font cache not populated**
   - Solution: Refresh page, check Network tab

### Issue 5: Location Button Not Working

**Symptoms**: Clicking location button does nothing

**Possible Causes**:
1. **Permission denied**
   - Check: Browser location permission settings
   - Solution: Grant permission or reset site permissions
2. **Geolocation not supported**
   - Check: `navigator.geolocation` available
   - Solution: Use supported browser
3. **HTTPS required** (some browsers)
   - Solution: Use https:// or localhost

---

## Automated Testing (Future)

### Unit Tests
```bash
# Not yet implemented
# Future: npm test
```

### E2E Tests
```bash
# Not yet implemented
# Future: Playwright or Cypress tests
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **First Contentful Paint** | < 1.5s | ~1.2s |
| **Largest Contentful Paint** | < 2.5s | ~2.0s |
| **Time to Interactive** | < 3.5s | ~2.5s |
| **Total Bundle Size (gzipped)** | < 500 KB | ~400 KB |
| **Lighthouse Score** | > 90 | TBD |

### Lighthouse Testing
1. Open DevTools → Lighthouse
2. Select categories: Performance, Accessibility, Best Practices, PWA
3. Run audit
4. **Target scores**:
   - Performance: > 90
   - Accessibility: > 90
   - Best Practices: > 90
   - PWA: 100

---

## Privacy Testing Checklist

Verify compliance with [PRIVACY_BY_DESIGN.md](PRIVACY_BY_DESIGN.md):

- [ ] No external analytics or tracking
- [ ] No cookies set
- [ ] No localStorage of sensitive data
- [ ] Only Kartverket external connection
- [ ] All fonts self-hosted
- [ ] CSP blocks unauthorized requests
- [ ] Geolocation requires explicit permission
- [ ] Location data not transmitted to servers

---

## Testing on Production Deployment

Before releasing to users:

1. [ ] Deploy to production URL
2. [ ] Test HTTPS enforcement
3. [ ] Test PWA installation from production
4. [ ] Test offline functionality
5. [ ] Run Lighthouse audit
6. [ ] Verify privacy compliance (no external trackers)
7. [ ] Test on multiple devices/browsers
8. [ ] Test from different geographic locations (Norway, EU, outside EU)

---

## Reporting Issues

If you find bugs during testing:

1. Check this document for known issues
2. Check console for error messages
3. Note browser and version
4. Note steps to reproduce
5. Create issue in repository (when public)

---

## Development Server URLs

- **Development**: http://localhost:3000 (Vite dev server)
- **Production Preview**: http://localhost:4173 (Vite preview)
- **Network Testing**: Use browser DevTools Network tab

---

**Last Tested**: November 8, 2025
**Next Testing Round**: [TBD - before each release]
