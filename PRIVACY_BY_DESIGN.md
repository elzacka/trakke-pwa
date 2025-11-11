# Privacy by Design - Tråkke PWA

**Implementation Date**: November 8, 2025
**Framework**: React 19.2.0 + Vite 5.4.21 + TypeScript 5.9.3
**Compliance**: GDPR, Norwegian Personopplysningsloven

## Executive Summary

Tråkke implements Privacy by Design principles according to GDPR Article 25 and November 2025 best practices for Progressive Web Applications. All user data remains within EU/EØS jurisdiction, with no third-party trackers, analytics, or external data processing.

## Privacy by Design Principles

### 1. Proactive not Reactive; Preventative not Remedial

**Implementation**:
- No external analytics or tracking by default
- Local-first data storage (IndexedDB)
- All fonts and assets served locally
- No CDN dependencies outside EU/EØS

**Technical Measures**:
```typescript
// All data storage is local
const dbService = {
  init: () => IndexedDB initialization (client-side only)
  // No server synchronization
  // No external API calls for user data
}
```

### 2. Privacy as the Default Setting

**Implementation**:
- No cookies used (PWA doesn't require them)
- No user tracking or profiling
- No consent banners needed (nothing to consent to)
- Geolocation only with explicit user action

**Default Configuration**:
- Service Worker: Caches resources locally
- No analytics: No Google Analytics, Matomo, or similar
- No advertising IDs
- No user fingerprinting

### 3. Privacy Embedded into Design

**Implementation**:
- Data minimization: Only essential data collected
- Client-side rendering: No server-side user tracking
- Offline-first: Reduces network exposure
- Local storage only: No cloud synchronization

### 4. Full Functionality – Positive-Sum

**Implementation**:
- Full map functionality offline
- No feature degradation without tracking
- Location services: Optional, user-initiated
- No "accept cookies to continue" barriers

### 5. End-to-End Security

**Implementation**:
- HTTPS enforced in production
- Content Security Policy (CSP) headers
- Subresource Integrity (SRI) for assets
- No inline scripts in production

### 6. Visibility and Transparency

**Implementation**:
- Open source codebase
- Clear documentation of data practices
- No hidden tracking mechanisms
- Transparent about external resources (Kartverket only)

### 7. Respect for User Privacy

**Implementation**:
- User owns all local data
- No behavioral profiling
- No data sharing with third parties
- User can clear all data via browser settings

## Data Flow Analysis

### Data Collection

| Data Type | Purpose | Storage | Retention | EU/EØS |
|-----------|---------|---------|-----------|--------|
| **Map tiles** | Display maps | Service Worker cache | 30 days | ✅ (Kartverket - Norway) |
| **User location** | Show position on map | Memory only (runtime) | Session only | ✅ (Never leaves device) |
| **App state** | Persist user preferences | IndexedDB (local) | Until user clears | ✅ (Never leaves device) |
| **Fonts** | Display text/icons | Service Worker cache | Permanent | ✅ (Served locally) |

### External Resources Audit

| Resource | Provider | Country | Purpose | GDPR Compliant | Justification |
|----------|----------|---------|---------|----------------|---------------|
| **Kartverket WMTS** | Kartverket | Norway 🇳🇴 | Map tiles | ✅ | Norwegian government agency, EU/EØS |
| **None** | - | - | - | - | No other external resources |

**Note**: All fonts, icons, and assets are self-hosted.

## Technical Implementation

### 1. No External Trackers

```typescript
// ❌ NOT IMPLEMENTED (Privacy by Design)
// - Google Analytics
// - Facebook Pixel
// - Hotjar
// - Mixpanel
// - Any analytics or tracking

// ✅ PRIVACY-PRESERVING ALTERNATIVES (if needed future)
// - Plausible Analytics (EU-hosted, privacy-focused)
// - Matomo (self-hosted on EU servers)
// - Simple Analytics (EU-based)
```

### 2. Content Security Policy (CSP)

Implemented via index.html meta tag:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self';
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https://cache.kartverket.no;
               font-src 'self';
               connect-src 'self' https://cache.kartverket.no;
               worker-src 'self';">
```

### 3. Service Worker Privacy Configuration

```typescript
// vite.config.ts
workbox: {
  runtimeCaching: [
    {
      // ONLY external resource: Norwegian government maps
      urlPattern: /^https:\/\/cache\.kartverket\.no\/.*/i,
      handler: 'CacheFirst',
      // No user identification in requests
      // No cookies sent
      // No tracking headers
    }
  ]
}
```

### 4. Geolocation Privacy

```typescript
// LocationButton.tsx
// ✅ Privacy-preserving implementation
- User must explicitly click button
- No background tracking
- No location history stored
- Position data never leaves device
- No server uploads
```

### 5. IndexedDB Privacy

```typescript
// dbService.ts
// ✅ Privacy-preserving storage
- All data local to device
- No cloud synchronization
- No data export to servers
- User controls data (via browser)
```

## Dependencies Audit

### Current Dependencies (GDPR Compliant)

| Package | Version | Source | Purpose | Privacy Risk | Status |
|---------|---------|--------|---------|--------------|--------|
| **react** | 19.2.0 | Meta (USA) | UI framework | ✅ Low (client-side library) | Safe |
| **react-dom** | 19.2.0 | Meta (USA) | React renderer | ✅ Low (client-side library) | Safe |
| **maplibre-gl** | 5.11.0 | MapLibre (Open Source) | Map rendering | ✅ Low (client-side library) | Safe |
| **vite** | 5.4.21 | Vite (Open Source) | Build tool | ✅ None (dev only) | Safe |
| **vite-plugin-pwa** | 1.1.0 | vite-pwa (Open Source) | PWA generation | ✅ None (build time) | Safe |
| **workbox-window** | 7.3.0 | Google (USA) | Service Worker | ✅ Low (client-side library) | Safe |
| **typescript** | 5.9.3 | Microsoft (USA) | Type safety | ✅ None (dev only) | Safe |

**Risk Assessment**: All dependencies are client-side libraries. No runtime data collection or external API calls.

### Future Dependency Guidelines

**🚫 PROHIBITED** Dependencies:
- Analytics libraries (Google Analytics, Mixpanel, etc.)
- Advertising SDKs
- Social media tracking pixels
- A/B testing platforms with external data
- Error tracking with automatic data upload (Sentry, Bugsnag without self-hosting)
- CDNs outside EU/EØS for runtime assets

**✅ ALLOWED** Dependencies (with review):
- Client-side libraries (no external API calls)
- Build-time tools (development only)
- EU-hosted services with proper DPA
- Open-source libraries (after audit)

## Developer Guidelines

### Adding New Features

Before implementing any new feature, check:

1. **Does it require external API calls?**
   - ✅ Yes → Verify provider is EU/EØS based
   - ❌ No → Proceed

2. **Does it collect user data?**
   - ✅ Yes → Document in privacy policy
   - ✅ Yes → Store locally only (IndexedDB)
   - ❌ No → Proceed

3. **Does it use third-party services?**
   - ✅ Yes → Audit for GDPR compliance
   - ✅ Yes → Check server location (must be EU/EØS)
   - ❌ No → Proceed

4. **Does it require user consent?**
   - ✅ Yes → Implement opt-in mechanism
   - ✅ Yes → Make feature optional
   - ❌ No → Proceed

### Code Review Checklist

- [ ] No external API calls outside EU/EØS
- [ ] No tracking or analytics code
- [ ] No cookies set
- [ ] No localStorage of personal data
- [ ] IndexedDB used for local storage
- [ ] Geolocation requires user action
- [ ] No data sent to third parties
- [ ] All assets self-hosted
- [ ] CSP headers allow only necessary sources

### Testing Privacy

```bash
# 1. Network tab audit
npm run build
npm run preview
# Open DevTools → Network
# Verify NO requests to:
# - fonts.googleapis.com
# - google-analytics.com
# - facebook.com
# - Any non-EU domains

# 2. Storage audit
# Application → Storage → Clear site data
# Verify only expected data:
# - Service Worker cache (maps, assets)
# - IndexedDB (app state only)

# 3. Geolocation test
# Verify location only accessed on button click
# No background location tracking
```

## Regulatory Compliance

### GDPR (EU General Data Protection Regulation)

**Article 25 - Privacy by Design**: ✅ Implemented
- Data minimization
- Storage limitation
- Default privacy settings
- Transparent processing

**Article 32 - Security**: ✅ Implemented
- HTTPS encryption
- Local data storage
- No unnecessary data transmission
- CSP headers

**Article 44-49 - International Transfers**: ✅ Compliant
- No data transfers outside EU/EØS
- Only Kartverket (Norway) accessed

### Norwegian Personopplysningsloven

✅ **Compliant**: No personal data processing requiring consent or registration

## Future Enhancements (Privacy-Preserving)

### Phase 2 Features - Privacy Considerations

1. **Offline Map Downloads**
   - ✅ Store locally in IndexedDB
   - ❌ Do NOT sync to cloud
   - ✅ User controls deletion

2. **Search Functionality**
   - ✅ Use Kartverket API (Norway-based)
   - ❌ Do NOT use Google Places API
   - ✅ Alternative: Local search in cached data

3. **Routes and Waypoints**
   - ✅ Store in IndexedDB
   - ❌ Do NOT sync to external servers
   - ✅ Export as GPX (user-controlled)

4. **Projects/Tracks Management**
   - ✅ Local storage only
   - ✅ User-initiated export/import
   - ❌ No automatic cloud backup

### Privacy-Preserving Services (If Needed)

| Feature | Privacy-Preserving Option | Location | DPA Required |
|---------|---------------------------|----------|--------------|
| **Analytics** | Plausible Analytics | EU | Yes |
| **Error Tracking** | Sentry (self-hosted) | EU | N/A (self-hosted) |
| **Maps Alternative** | OpenStreetMap | EU | No (open data) |
| **Search** | Photon (OSM) | EU | No (open source) |
| **Geocoding** | Nominatim (OSM) | EU | No (open source) |

## Incident Response

### Data Breach Procedure

1. **Assessment**: Determine if personal data exposed
2. **Notification**: 72 hours to Datatilsynet (if applicable)
3. **Mitigation**: Update service worker, force cache clear
4. **Documentation**: Record incident and response

**Note**: Current implementation has minimal breach risk (no server-side storage)

## Compliance Monitoring

### Regular Audits (Quarterly)

- [ ] Review all external API calls
- [ ] Audit new dependencies
- [ ] Check CSP headers
- [ ] Test network traffic
- [ ] Review IndexedDB storage
- [ ] Update this document

### Annual Review

- [ ] GDPR regulation changes
- [ ] Norwegian law updates
- [ ] Best practice evolution
- [ ] Dependency security audit
- [ ] Privacy policy update

## Resources

### Legal References
- [GDPR Official Text](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [Personopplysningsloven](https://lovdata.no/dokument/NL/lov/2018-06-15-38)
- [Datatilsynet Guidelines](https://www.datatilsynet.no/)

### Technical Resources
- [PWA Privacy Best Practices 2025](https://web.dev/privacy/)
- [React Security Guidelines](https://react.dev/learn/security)
- [OWASP PWA Security](https://owasp.org/www-project-mobile-security/)

### Tools
- [Privacy Patterns](https://privacypatterns.org/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Security Headers](https://securityheaders.com/)

## Conclusion

Tråkke implements privacy by design as a core principle, not an afterthought. All future development must maintain these privacy standards to ensure continued GDPR compliance and user trust.

**Contact**: For privacy questions or concerns about future features, consult this document first.

---

**Last Updated**: November 8, 2025
**Next Review**: February 8, 2026
