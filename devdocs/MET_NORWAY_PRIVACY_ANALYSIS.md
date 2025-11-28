# MET Norway API - Privacy & Compliance Analysis for Tråkke

**Date:** 2025-11-19
**Analyst:** Claude (via Claude Code)
**Purpose:** Evaluate MET Norway weather APIs for Phase 3 integration with Tråkke's privacy-first architecture

---

## Executive Summary

[OK] **APPROVED FOR INTEGRATION** - MET Norway's Locationforecast 2.0 API meets Tråkke's privacy requirements with specific implementation guidelines.

**Key Findings:**
- [OK] EU/EØS compliant (Norwegian government agency, data processed in Oslo, Norway)
- [OK] No user tracking or analytics required by API
- [WARNING] IP address logging occurs - **proxy required for privacy**
- [OK] CC BY 4.0 license compatible with Tråkke
- [OK] No API keys or authentication needed
- [OK] Free for non-commercial use
- [WARNING] User-Agent header with contact info **mandatory**

---

## Privacy Compliance Analysis

### 1. EU/EØS Data Residency [OK]

**Requirement:** All external APIs must be EU/EØS based with data processing in EU/EØS.

**MET Norway:**
- **Provider:** Meteorologisk Institutt (Norwegian Meteorological Institute) - Norwegian government agency
- **Data Center:** Oslo, Norway
- **Quote:** *"All api.met.no access logs are stored in our own data center in Oslo, Norway"*

**Verdict:** [OK] **COMPLIANT** - Government agency in Norway (EEA member), data processed in Norway.

---

### 2. User Privacy & Data Collection [WARNING]

**Requirement:** No user tracking, no personal data collection, no analytics.

**MET Norway Practices:**

**IP Address Logging:**
> *"Keep in mind that the user ip address and geocoordinates may then be logged when your API call originates directly from a app or browser"*

**Privacy Recommendation from MET:**
> *"To guarantee anonymity we recommend using a proxy gateway so that the ip addresses of the users are not revealed to us"*

**Developer Responsibility:**
> *"The confidentiality of the users' personal data are your own responsibility"*

**Verdict:** [WARNING] **REQUIRES PROXY** - Direct API calls would expose user IPs to MET Norway. **Implementation must use backend proxy.**

---

### 3. GDPR Compliance [OK]

**MET Norway Position on GDPR:**
- Developer contact emails in User-Agent are "not considered personal information for GDPR"
- User IP logging occurs but MET recommends proxy to avoid this
- No cookies or persistent tracking

**Tråkke Implementation:**
- [OK] Use backend proxy (prevents user IP exposure)
- [OK] Cache weather data locally (reduce API calls)
- [OK] No user login or accounts needed

**Verdict:** [OK] **COMPLIANT** when proxy is used.

---

### 4. Attribution Requirements [OK]

**License:** CC BY 4.0

**Requirements:**
> *"You must give appropriate credit, provide a link to the license, and indicate if changes were made"*

**Tråkke Implementation:**
- Add MET Norway to InfoSheet data sources
- Link to https://www.met.no/
- Note: "Weather data from MET Norway (CC BY 4.0)"

**Verdict:** [OK] **SIMPLE COMPLIANCE** - Already have attribution infrastructure in InfoSheet.

---

### 5. Commercial Use Restrictions [OK]

**Prohibited:**
- Cannot use "Yr" branding or logo
- Cannot use service name containing "Yr"

**Tråkke Status:**
- [OK] Non-commercial open-source project
- [OK] No "Yr" branding used
- [OK] Name is "Tråkke" (no conflict)

**Verdict:** [OK] **COMPLIANT**

---

## Technical Requirements

### 1. User-Agent Header (MANDATORY)

**Requirement:**
> *"All requests must include an identifying User-Agent header that includes your application name and a publicly visible contact email address"*

**Format:**
```
User-Agent: Trakke-PWA/1.0 (https://github.com/elzacka/trakke-pwa) hei@tazk.no
```

**Fallback Options:**
- `Origin` header (for JavaScript)
- `Referer` header (last resort)

**Enforcement:**
> *"If we cannot contact you in case of problems, you risk being blocked without warning"*

**Verdict:** [OK] **IMPLEMENTABLE** - Easy to add to fetch headers.

---

### 2. Rate Limits

**Limits:**
- **General:** Max 20 requests/second per application without special agreement
- **Mobile Apps:** Must not retrieve data when app not in use
- **Request Spreading:** Avoid simultaneous bulk requests

**Tråkke Strategy:**
- [OK] Weather updated only when user opens map or every 30-60 minutes
- [OK] Cache data locally for 1-2 hours
- [OK] Single location request (user's current position or route center)
- [OK] No background polling

**Verdict:** [OK] **WELL WITHIN LIMITS**

---

### 3. Coordinate Precision

**Requirement:**
> *"Truncate all coordinates to max 4 decimals"*

**Precision:**
- 4 decimals = ~11 meters accuracy (more than enough for weather)
- 5+ decimals = 403 Forbidden error

**Implementation:**
```typescript
const lat = Math.round(latitude * 10000) / 10000  // 4 decimals
const lon = Math.round(longitude * 10000) / 10000
```

**Verdict:** [OK] **SIMPLE CONSTRAINT**

---

## Recommended API: Locationforecast 2.0

### Overview

**Endpoint:** `https://api.met.no/weatherapi/locationforecast/2.0/compact`

**Data Provided:**
- Temperature (air, feels-like)
- Precipitation (amount, probability)
- Wind (speed, direction, gusts)
- Humidity
- Cloud coverage
- UV index
- Weather symbols/icons

**Forecast Range:** 9 days ahead

**Response Format:** JSON (primary) or XML (classic)

**Update Frequency:** Not explicitly stated, likely hourly

---

### Example Request

```http
GET https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=60.10&lon=9.58&altitude=500
User-Agent: Trakke-PWA/1.0 (https://github.com/elzacka/trakke-pwa) hei@tazk.no
```

**Response Sample:**
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [9.58, 60.10, 500]
  },
  "properties": {
    "meta": {
      "updated_at": "2025-11-19T10:00:00Z",
      "units": {
        "air_temperature": "celsius",
        "precipitation_amount": "mm"
      }
    },
    "timeseries": [
      {
        "time": "2025-11-19T11:00:00Z",
        "data": {
          "instant": {
            "details": {
              "air_temperature": 5.2,
              "wind_speed": 3.1,
              "precipitation_amount": 0.0
            }
          },
          "next_1_hours": {
            "summary": {
              "symbol_code": "partlycloudy_day"
            }
          }
        }
      }
    ]
  }
}
```

---

## Implementation Recommendations

### Architecture: Backend Proxy Required

**Why:**
- Prevent user IP exposure to MET Norway
- Maintain privacy-first architecture
- Enable request caching
- Centralize User-Agent management

**Options:**

#### Option 1: Cloudflare Worker (RECOMMENDED)
```typescript
// Cloudflare Worker proxy
export default {
  async fetch(request: Request) {
    const url = new URL(request.url)
    const lat = url.searchParams.get('lat')
    const lon = url.searchParams.get('lon')

    // Validate and truncate coordinates
    const latTrunc = Math.round(parseFloat(lat) * 10000) / 10000
    const lonTrunc = Math.round(parseFloat(lon) * 10000) / 10000

    const metUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latTrunc}&lon=${lonTrunc}`

    const response = await fetch(metUrl, {
      headers: {
        'User-Agent': 'Trakke-PWA/1.0 (https://github.com/elzacka/trakke-pwa) hei@tazk.no'
      }
    })

    // Cache for 1 hour
    const newResponse = new Response(response.body, response)
    newResponse.headers.set('Cache-Control', 'public, max-age=3600')

    return newResponse
  }
}
```

**Benefits:**
- [OK] Free tier: 100,000 requests/day
- [OK] Global CDN (low latency)
- [OK] Automatic caching
- [OK] No user IP exposed to MET

#### Option 2: GitHub Pages + Netlify Functions
- Deploy serverless function on Netlify
- GitHub Pages frontend calls Netlify function
- Function proxies to MET Norway

#### Option 3: Self-hosted Proxy
- Simple Node.js/Express proxy
- Deployed on any cloud provider
- Full control but requires maintenance

---

### Caching Strategy

**Client-Side (IndexedDB):**
```typescript
interface WeatherCache {
  location: { lat: number, lon: number }
  data: WeatherData
  fetchedAt: number
  expiresAt: number  // 1-2 hours
}
```

**Cache Invalidation:**
- Time-based: Expire after 1-2 hours
- Location-based: Cache miss if >5km from cached location
- User-triggered: Refresh button

**Benefits:**
- [OK] Reduces API calls (stay under rate limits)
- [OK] Faster UI (instant weather display)
- [OK] Offline support (show last known weather)

---

## Phase 3 Weather Feature Design

### UI Components

#### 1. Weather Widget (Map Overlay)
**Location:** Top-right corner (below compass)

**Compact View:**
```
┌─────────────┐
│ ⛅ 12°C     │
│ 🌧️ 60%     │
└─────────────┘
```

**Expanded View (tap to open):**
```
┌──────────────────────────┐
│ Weather - Preikestolen   │
├──────────────────────────┤
│ Now: 12°C, Partly Cloudy │
│ Feels like: 10°C         │
│ Wind: 3 m/s NE           │
│ Precipitation: 60%       │
│                          │
│ Next 3 Hours:            │
│ 12:00  11°C  ⛅  40%    │
│ 15:00   9°C  🌧️  70%    │
│ 18:00   7°C  🌧️  80%    │
└──────────────────────────┘
```

#### 2. Weather Sheet (Bottom Sheet)
- 9-day forecast
- Hourly breakdown
- Weather alerts integration (MetAlerts API)
- Sunrise/sunset times (Sunrise 3.0 API)

#### 3. Route Weather
- Weather along route waypoints
- Show conditions at each waypoint
- Warn about precipitation/wind on planned hiking day

---

### Privacy-Preserving Features

**No Location Tracking:**
- [OK] Weather fetched only for visible map area center
- [OK] No background location polling
- [OK] User must explicitly request weather update

**Minimal Data Collection:**
- [OK] Only current/selected coordinates sent (via proxy)
- [OK] No user ID or session tracking
- [OK] No weather preference analytics

**Transparent to User:**
- [OK] Show "Last updated: X minutes ago"
- [OK] Refresh button visible
- [OK] Data source attribution in InfoSheet

---

## CSP & External API Registry Updates

### Add to PRIVACY_BY_DESIGN.md

**External API Registry:**
```markdown
| Service | Provider | Purpose | Location | API Keys | User Data | Notes |
|---------|----------|---------|----------|----------|-----------|-------|
| Weather Forecast | MET Norway (api.met.no) | 9-day weather forecasts | Oslo, Norway | None | Proxied (no user IP) | CC BY 4.0, Norwegian government |
```

### Update CSP (vite.config.ts)

```typescript
connect-src 'self'
  cache.kartverket.no
  ws.geonorge.no
  ogc.dsb.no
  overpass-api.de
  your-proxy-domain.com;  // Add weather proxy
```

---

## Implementation Checklist

### Phase 3A: Backend Setup
- [ ] Deploy Cloudflare Worker (or alternative proxy)
- [ ] Test proxy with MET Locationforecast API
- [ ] Verify User-Agent header is sent correctly
- [ ] Implement coordinate truncation (4 decimals)
- [ ] Set up caching headers (1-hour cache)

### Phase 3B: Frontend Service
- [ ] Create `weatherService.ts` with proxy client
- [ ] Implement IndexedDB caching (1-2 hour TTL)
- [ ] Add location-based cache invalidation
- [ ] Parse MET JSON response format
- [ ] Handle API errors gracefully

### Phase 3C: UI Components
- [ ] Create `WeatherWidget.tsx` (compact overlay)
- [ ] Create `WeatherSheet.tsx` (detailed forecast)
- [ ] Add weather icons (Material Symbols or MET symbols)
- [ ] Implement refresh button
- [ ] Show last updated timestamp

### Phase 3D: Integration
- [ ] Add weather widget to Map.tsx
- [ ] Connect to user location or map center
- [ ] Add weather to route planning (show conditions at waypoints)
- [ ] Update InfoSheet with MET Norway attribution
- [ ] Update CSP in vite.config.ts

### Phase 3E: Testing & Documentation
- [ ] Test rate limiting (verify <20 req/s)
- [ ] Test offline behavior (cached data)
- [ ] Verify no user IP sent to MET (check Network tab)
- [ ] Update PRIVACY_BY_DESIGN.md
- [ ] Document weather feature in README.md

---

## Cost Analysis

**MET Norway API:**
- [OK] **FREE** for non-commercial use
- [OK] No API keys needed
- [OK] No registration required
- [OK] Unlimited requests (within rate limits)

**Proxy Hosting (Cloudflare Workers):**
- [OK] **FREE TIER:** 100,000 requests/day
- [OK] More than enough for Tråkke's usage pattern
- [OK] No credit card required for free tier

**Total Cost:** **€0/month** [OK]

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| User IP exposure | High (if no proxy) | High (privacy breach) | [OK] Mandatory proxy |
| API rate limiting | Low | Medium | [OK] Caching + throttling |
| Service downtime | Low | Low | [OK] Cached data fallback |
| ToS changes | Low | Medium | [OK] Monitor API mailing list |
| Coordinate precision errors | Low | Low | [OK] Validation + truncation |

---

## Compliance Summary

### Tråkke Privacy Requirements
- [OK] **EU/EØS Provider:** MET Norway (Norwegian government)
- [OK] **Data Processing:** Oslo, Norway datacenter
- [OK] **No User Tracking:** Proxy prevents IP exposure
- [OK] **No Analytics:** Not required by API
- [OK] **No Cookies:** API doesn't use cookies
- [OK] **Local Data Storage:** IndexedDB caching
- [OK] **User Control:** Explicit weather requests only
- [OK] **Attribution:** CC BY 4.0 (simple compliance)

### GDPR Compliance
- [OK] **Data Minimization:** Only coordinates sent (no user ID)
- [OK] **Purpose Limitation:** Weather data only
- [OK] **Storage Limitation:** 1-2 hour cache expiry
- [OK] **Privacy by Design:** Proxy architecture
- [OK] **Transparency:** Data source disclosed in InfoSheet

---

## Recommendation: PROCEED WITH INTEGRATION [OK]

**MET Norway Locationforecast 2.0 API is approved for Tråkke Phase 3** with the following **mandatory requirements:**

1. **MUST implement backend proxy** (Cloudflare Workers recommended)
2. **MUST include proper User-Agent header** with contact email
3. **MUST truncate coordinates** to 4 decimals maximum
4. **MUST cache responses** for 1-2 hours (reduce API load)
5. **MUST add attribution** to InfoSheet (CC BY 4.0)
6. **MUST update CSP** to allow proxy domain
7. **MUST update PRIVACY_BY_DESIGN.md** External API Registry

**Privacy Score:** [OK] **9/10** (Excellent - only minor concern is IP logging, fully mitigated by proxy)

---

**Document Version:** 1.0
**Next Review:** Before Phase 3 implementation
**Approved By:** Pending user review
