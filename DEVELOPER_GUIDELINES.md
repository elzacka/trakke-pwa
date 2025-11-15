# Developer Guidelines - Tråkke PWA

**Version**: 1.0
**Last Updated**: November 8, 2025
**Framework**: React 19.2.0 + Vite 5.4.21 + TypeScript 5.9.3

## Privacy by Design - Mandatory Requirements

All development on Tråkke MUST comply with GDPR and Norwegian privacy regulations. This is not optional.

### Golden Rule
**No user data shall ever be transmitted to servers outside EU/EØS countries.**

## Pre-Implementation Checklist

Before writing any code for a new feature, answer these questions:

### 1. External Services

```
❓ Does this feature require external API calls?
   ✅ YES → Continue to question 1a
   ❌ NO → Skip to question 2

❓ 1a. Is the API provider located in EU/EØS?
   ✅ YES → Add to [External API Registry](PRIVACY_BY_DESIGN.md#external-api-registry) in PRIVACY_BY_DESIGN.md
   ❌ NO → STOP - Find EU/EØS alternative or implement client-side

❓ 1b. Does the provider have a Data Processing Agreement (DPA)?
   ✅ YES → Review and file DPA
   ❌ NO → STOP - Cannot proceed without DPA

❓ 1c. Does the API collect user identifiable data?
   ✅ YES → Implement user consent mechanism
   ❌ NO → Proceed with implementation
```

### 2. Data Collection

```
❓ Does this feature collect user data?
   ✅ YES → Continue to question 2a
   ❌ NO → Skip to question 3

❓ 2a. What type of data?
   - Personal identifiable information (PII)? → MINIMIZE or AVOID
   - Location data? → Require explicit user action
   - Usage patterns? → Use local storage only
   - Preferences? → IndexedDB, never sync to server

❓ 2b. Where will data be stored?
   ✅ IndexedDB (client-side) → OK
   ✅ localStorage (client-side) → OK for non-sensitive only
   ❌ External database → STOP - Must be EU/EØS with DPA
   ❌ Cloud storage → STOP - Must be EU/EØS with DPA

❓ 2c. How long will data be retained?
   ✅ Session only (runtime) → Best practice
   ✅ User-controlled (manual deletion) → Acceptable
   ❌ Indefinite without user control → NOT ALLOWED
```

### 3. Third-Party Dependencies

```
❓ Does this feature require new npm packages?
   ✅ YES → Continue to question 3a
   ❌ NO → Skip to question 4

❓ 3a. Does the package make network requests?
   ✅ YES → AUDIT - Check destination servers
   ❌ NO → Review and proceed

❓ 3b. Does the package collect telemetry/analytics?
   ✅ YES → REJECT - Find alternative
   ❌ NO → Proceed with review

❓ 3c. Is the package open source?
   ✅ YES → Review code for privacy issues
   ❌ NO → EXTRA SCRUTINY - Document why necessary
```

### 4. User Consent

```
❓ Does this feature require user consent?
   ✅ YES → Implement opt-in mechanism
   ❌ NO → Ensure truly no consent needed

❓ 4a. Types requiring consent:
   - Geolocation access? → YES
   - Camera/microphone? → YES
   - Analytics/tracking? → N/A (we don't do this)
   - Cookies? → N/A (PWA doesn't use cookies)
```

## Code Patterns

### ✅ APPROVED Patterns

#### Local Data Storage

```typescript
// ✅ GOOD: Local storage only
import { dbService } from './services/dbService'

async function saveUserPreference(key: string, value: any) {
  await dbService.put('preferences', { key, value, timestamp: Date.now() })
  // Data never leaves device
}
```

#### Geolocation with User Consent

```typescript
// ✅ GOOD: Explicit user action required
function handleLocationClick() {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      // Use position
      // Never send to server
      // Store in memory only
    },
    (error) => {
      console.error('Location error:', error)
    }
  )
}
```

#### External API Call (EU/EØS Only)

```typescript
// ✅ GOOD: EU/EØS API with no user tracking
async function fetchMapTiles(z: number, x: number, y: number) {
  const url = `https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/${z}/${y}/${x}.png`
  // Kartverket is Norwegian government (EU/EØS)
  // No user identification in request
  // No cookies sent
  return fetch(url)
}
```

### ❌ PROHIBITED Patterns

#### Analytics/Tracking

```typescript
// ❌ BAD: External analytics
import analytics from 'some-analytics-library'

analytics.track('page_view', {
  user_id: userId,  // ❌ User tracking
  page: '/map'      // ❌ Behavioral data
})
// NEVER implement this
```

#### External API Outside EU/EØS

```typescript
// ❌ BAD: Non-EU service
async function geocode(address: string) {
  const response = await fetch(
    `https://api.some-us-service.com/geocode?q=${address}`
    // ❌ US-based service
    // ❌ Sends user query data
  )
  return response.json()
}

// ✅ ALTERNATIVE: Use Kartverket or OSM Nominatim (EU)
async function geocode(address: string) {
  const response = await fetch(
    `https://ws.geonorge.no/adresser/v1/sok?sok=${address}`
    // ✅ Norwegian service
  )
  return response.json()
}
```

#### Cloud Sync Without Consent

```typescript
// ❌ BAD: Automatic cloud sync
async function saveRoute(route: Route) {
  await dbService.put('routes', route)
  await syncToCloud(route)  // ❌ No user consent
                             // ❌ Where is cloud?
                             // ❌ No DPA?
}

// ✅ ALTERNATIVE: Local only, explicit export
async function saveRoute(route: Route) {
  await dbService.put('routes', route)
  // User can manually export if desired
}

async function exportRoute(route: Route) {
  // User-initiated export
  const gpx = convertToGPX(route)
  downloadFile(gpx, 'route.gpx')
  // User controls where file goes
}
```

## Technology Stack Guidelines

### Frontend Framework (React 19.2.0)

**✅ ALLOWED**:
- Client-side rendering
- Local state management (useState, useReducer)
- IndexedDB for persistence
- Service Workers for offline

**❌ PROHIBITED**:
- Server-side rendering with user tracking
- Redux DevTools in production (exposes state)
- State sync to external servers

### Mapping Library (MapLibre GL JS)

**✅ ALLOWED**:
- Local tile caching
- Client-side rendering
- Kartverket WMTS (Norwegian)

**❌ PROHIBITED**:
- Google Maps (US-based, tracking)
- Mapbox (US-based, telemetry)
- Any map service requiring API keys that track users

### Build Tools (Vite)

**✅ ALLOWED**:
- Local development
- Production builds
- Service Worker generation

**❌ PROHIBITED**:
- Build-time analytics
- Usage telemetry
- Remote logging

## Dependency Review Process

### Before Adding Any Dependency

1. **Check package.json for existing solution**
2. **Search for privacy-focused alternatives**
3. **Review package source code**
4. **Check for network requests**
5. **Verify license compatibility**
6. **Document decision**

### Red Flags

🚩 Package makes requests to analytics domains
🚩 Requires API key from non-EU service
🚩 Collects telemetry "for improvement"
🚩 Closed source with opaque behavior
🚩 Depends on Google/Facebook/Amazon SDKs
🚩 Has "tracking" or "analytics" in description

### Example Review

```bash
# Review a package before adding
npm info <package-name>

# Check dependencies
npm view <package-name> dependencies

# Read source (if open source)
git clone <repository-url>
grep -r "fetch\|XMLHttpRequest\|http" src/

# Check for known tracking
grep -r "google-analytics\|mixpanel\|segment" .
```

## Testing for Privacy

### Manual Testing

```bash
# 1. Build production version
npm run build

# 2. Start preview server
npm run preview

# 3. Open DevTools → Network tab
# 4. Use app normally
# 5. Verify ONLY these domains appear:
#    - localhost (or your domain)
#    - cache.kartverket.no

# 6. Check Application → Storage
# 7. Verify NO cookies
# 8. Verify IndexedDB only has expected data
```

### Automated Testing

```typescript
// privacy.test.ts
describe('Privacy Compliance', () => {
  it('should not make requests to non-EU domains', async () => {
    const requests: string[] = []

    // Mock fetch to capture requests
    global.fetch = jest.fn((url) => {
      requests.push(url.toString())
      return Promise.resolve(new Response())
    })

    // Use your app
    render(<App />)

    // Verify only allowed domains
    const allowedDomains = [
      'cache.kartverket.no',
      'localhost',
      '127.0.0.1'
    ]

    requests.forEach(url => {
      const isAllowed = allowedDomains.some(domain =>
        url.includes(domain)
      )
      expect(isAllowed).toBe(true)
    })
  })

  it('should not set cookies', () => {
    expect(document.cookie).toBe('')
  })

  it('should store data only in IndexedDB', async () => {
    // Verify no localStorage usage
    expect(Object.keys(localStorage)).toHaveLength(0)

    // Verify IndexedDB usage
    const db = await openDB('trakke-db')
    expect(db).toBeDefined()
  })
})
```

## Common Scenarios

### Scenario 1: Adding Search Functionality

**❌ WRONG Approach**:
```typescript
// Using Google Places API
const results = await fetch(
  `https://maps.googleapis.com/maps/api/place/search?query=${query}&key=${API_KEY}`
)
```
**Why**: Google (US), requires API key, tracks queries

**✅ CORRECT Approach**:
```typescript
// Using Geonorge (Norwegian) or OSM Nominatim (EU)
const results = await fetch(
  `https://ws.geonorge.no/stedsnavn/v1/navn?sok=${query}`
)
```
**Why**: Norwegian government service, no tracking

### Scenario 2: Error Tracking

**❌ WRONG Approach**:
```typescript
// Using Sentry cloud
import * as Sentry from "@sentry/react"
Sentry.init({ dsn: "https://..." })
```
**Why**: Sends error data to Sentry servers (possibly US)

**✅ CORRECT Approach**:
```typescript
// Local error logging
window.addEventListener('error', (event) => {
  // Log to IndexedDB for developer review
  dbService.put('errors', {
    message: event.message,
    timestamp: Date.now()
    // No stack trace (may contain sensitive data)
    // No automatic upload
  })
})
```

### Scenario 3: User Analytics

**❌ WRONG Approach**:
```typescript
// Any analytics
import GA from 'react-ga'
GA.pageview('/map')
```
**Why**: Tracks user behavior, sends to third parties

**✅ CORRECT Approach**:
```typescript
// Don't do analytics
// If absolutely necessary:
// 1. Use Plausible (EU) or Matomo (self-hosted)
// 2. Get user consent first
// 3. Implement opt-out
// 4. Document in privacy policy
```

## Documentation Requirements

### For Every New Feature

**Follow this documentation workflow:**

1. **Update [PRIVACY_BY_DESIGN.md](PRIVACY_BY_DESIGN.md)** (if privacy-relevant)
   - Add external APIs to [External API Registry](PRIVACY_BY_DESIGN.md#external-api-registry)
   - Update [CSP](PRIVACY_BY_DESIGN.md#2-content-security-policy-csp) if needed
   - Document data flow in data flow table
   - Update compliance checklist

2. **Update [README.md](README.md)** (user-facing features)
   - Add to feature list with checkmark
   - Update roadmap status
   - Add to attribution section if using new data source

3. **Update [CLAUDE.md](CLAUDE.md)** (architecture/code patterns)
   - Add to services layer documentation if new service
   - Document component patterns if new UI pattern
   - Update IndexedDB schema if database changes

4. **Code Comments** - Privacy rationale
   ```typescript
   /**
    * Fetches map tiles from Kartverket (Norwegian Mapping Authority)
    * Privacy: No user tracking, no cookies, EU/EØS compliant
    * External API: See PRIVACY_BY_DESIGN.md#external-api-registry
    * GDPR: Article 6(1)(f) - Legitimate interest (map display)
    */
   async function fetchTiles() { ... }
   ```

## Incident Response

### If Privacy Issue Discovered

1. **STOP** - Do not deploy
2. **Document** - Write detailed description
3. **Assess** - Is user data exposed?
4. **Fix** - Remove problematic code
5. **Test** - Verify fix works
6. **Review** - Update guidelines to prevent recurrence
7. **Notify** - If data breach, follow GDPR Article 33

## Resources for Developers

### Privacy-Focused Alternatives

| Need | ❌ Avoid | ✅ Use Instead |
|------|---------|---------------|
| **Maps** | Google Maps | MapLibre + Kartverket |
| **Geocoding** | Google Geocoding | Geonorge, Nominatim |
| **Analytics** | Google Analytics | Plausible (EU), Matomo (self-hosted) |
| **Error Tracking** | Sentry Cloud | Local logging, Sentry self-hosted |
| **Fonts** | Google Fonts CDN | Self-hosted fonts |
| **Icons** | Font Awesome CDN | Self-hosted Material Symbols |
| **CDN** | Cloudflare (US) | Local bundling |

### Learning Resources

- [GDPR Official Text](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [Privacy Patterns](https://privacypatterns.org/)
- [OWASP Privacy Risks](https://owasp.org/www-project-top-10-privacy-risks/)
- [React Security](https://react.dev/learn/security)

### Tools

- **CSP Validator**: https://csp-evaluator.withgoogle.com/
- **Privacy Analysis**: https://webbkoll.dataskydd.net/
- **Network Monitor**: Browser DevTools
- **Dependency Audit**: `npm audit`

## Code Review Checklist

Use this for all PRs:

- [ ] No external API calls outside EU/EØS
- [ ] No analytics or tracking code
- [ ] No cookies set
- [ ] No third-party scripts
- [ ] User data stays local (IndexedDB)
- [ ] Geolocation requires user action
- [ ] No background data collection
- [ ] CSP allows only necessary sources
- [ ] New dependencies reviewed for privacy
- [ ] [PRIVACY_BY_DESIGN.md](PRIVACY_BY_DESIGN.md) updated (External API Registry, CSP if needed)
- [ ] Tests pass including privacy tests

## Summary

**Remember**: Privacy is not optional. It's a core requirement of Tråkke. When in doubt, err on the side of user privacy.

**Documentation reference**:
- **External APIs**: [PRIVACY_BY_DESIGN.md - External API Registry](PRIVACY_BY_DESIGN.md#external-api-registry)
- **CSP configuration**: [PRIVACY_BY_DESIGN.md - CSP](PRIVACY_BY_DESIGN.md#2-content-security-policy-csp)
- **Privacy checklist**: See [Pre-Implementation Checklist](#pre-implementation-checklist) above
- **Design system**: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

---

**"The user's data belongs to the user, not to us."**
