# Browser Compatibility - Tråkke PWA

**Last Updated**: November 8, 2025

## Current Browser Versions

### Desktop Browsers

| Browser | Current Version | Minimum Required |
|---------|----------------|------------------|
| **Chrome** | 142.0.7444.134 | 142+ |
| **Microsoft Edge** | 142.0.3595.65 | 142+ |
| **Firefox** | 144.0.2 | 144+ |
| **Safari** | 26.1 | 26+ |

### Mobile Browsers

| Platform | Browser | Current Version | Minimum Required |
|----------|---------|----------------|------------------|
| **iOS** | Safari | 26.1 (iOS 26.1) | iOS 26+ |
| **Android** | Chrome | 142+ | 142+ |

## Feature Support

### Core Technologies

All listed browsers support the following technologies required for Tråkke:

- **WebGL 2.0** with WebGL 1.0 fallback (for MapLibre GL JS)
- **Service Workers** (for offline PWA functionality)
- **IndexedDB** (for local data storage)
- **Geolocation API** (for GPS tracking)
- **Web App Manifest** (for PWA installation)
- **ES2015+ JavaScript** (modern JavaScript features)
- **CSS Flexbox & Grid** (for responsive layouts)

### MapLibre GL JS Support

MapLibre GL JS 5.11 requires:
- WebGL-enabled browsers
- Modern JavaScript (ES2015+)
- Supports all current major browsers

The library includes a `maplibregl.supported()` function to test browser compatibility at runtime.

## PWA Installation Support

| Browser | Install Capability | Notes |
|---------|-------------------|-------|
| **Chrome (Desktop)** | ✅ Full support | "Install" button in address bar |
| **Edge (Desktop)** | ✅ Full support | "Install" button in address bar |
| **Firefox (Desktop)** | ✅ Full support | Added in Firefox 143 (Sept 2025) |
| **Safari (macOS)** | ⚠️ Limited | "Add to Dock" since Safari 17 |
| **Chrome (Android)** | ✅ Full support | "Add to Home Screen" |
| **Safari (iOS)** | ✅ Full support | "Add to Home Screen" |

## Testing Requirements

### Minimum Test Matrix

For comprehensive testing, verify functionality on:

1. **Chrome 142+** (Windows/macOS/Linux)
2. **Safari 26.1** (macOS)
3. **Safari 26.1** (iOS - iPhone & iPad)
4. **Firefox 144+** (Windows/macOS/Linux)
5. **Edge 142+** (Windows)
6. **Chrome 142+** (Android)

### Critical Test Cases

- [ ] Map renders correctly with Kartverket tiles
- [ ] Service Worker registers successfully
- [ ] Offline mode works after caching
- [ ] GPS location tracking functions
- [ ] PWA installs on home screen/desktop
- [ ] IndexedDB initializes without errors
- [ ] Font loading (Material Symbols, Exo 2) works offline

## Browser Release Cycles

Understanding browser release schedules helps with compatibility planning:

| Browser | Release Cycle | Notes |
|---------|--------------|-------|
| **Chrome** | 4 weeks | Stable, Beta, Dev, Canary channels |
| **Edge** | 4 weeks | Follows Chromium release schedule |
| **Firefox** | 4 weeks | Rapid release cycle since Firefox 5 |
| **Safari** | Varies | Tied to macOS/iOS releases |

## Known Issues

### Safari-Specific

- **Safari < 26**: Some PWA features may be limited
- **iOS < 26**: Service Worker support may have limitations

### Firefox-Specific

- **Firefox < 143**: PWA installation not supported on Windows
- **Note**: Firefox 143 (September 2025) added Windows PWA support

### General Notes

- **HTTPS Required**: PWAs require HTTPS in production (localhost exempt)
- **Kartverket WMTS**: Requires internet connection for initial tile loading
- **Local Fonts**: GDPR-compliant local font hosting ensures offline capability

## Future Compatibility

This project uses modern, stable web APIs expected to remain supported:

- All features are part of established web standards
- No experimental or vendor-specific APIs used
- Progressive enhancement approach ensures graceful degradation

## Updating This Document

This document should be reviewed and updated:

- Monthly for current browser versions
- When adding new features requiring specific APIs
- After major browser updates affecting PWA capabilities
- When minimum version requirements change

## Resources

- [Chrome Releases](https://chromereleases.googleblog.com/)
- [Firefox Release Calendar](https://whattrainisitnow.com/calendar/)
- [Safari Release Notes](https://developer.apple.com/documentation/safari-release-notes)
- [Edge Release Notes](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-relnote-stable-channel)
- [Can I Use](https://caniuse.com/) - Web API compatibility tables
- [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data)
