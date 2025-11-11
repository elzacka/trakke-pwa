# Content Drafts - Tråkke PWA

**Purpose**: Draft content for website, blog articles, and privacy policy
**Created**: November 8, 2025
**Status**: Draft - Not for public use yet

---

## 1. Website & Blog Content

### About Tråkke - Website Copy

#### Hero Section
**Tråkke - Norsk friluftslivskart**

Offline-first kartapplikasjon for norsk friluftsliv. Ingen sporing. Ingen reklame. Bare deg og naturen.

**Nøkkelfunksjoner:**
- 🗺️ Detaljerte topografiske kart fra Kartverket
- 📍 GPS-posisjonering i sanntid
- 📴 Fungerer helt uten internett
- 🔒 Total personvern - ingen data deles
- ⚡ Lynrask og alltid tilgjengelig

#### Unique Features Section

**Hva gjør Tråkke annerledes?**

**1. Bygget for norsk natur**
- Topografiske kart fra Kartverket (Norges offisielle kartmyndighet)
- Optimalisert for norske fjell, skoger og kystområder
- Norsk språk gjennom hele appen

**2. Offline-first filosofi**
- Kartet fungerer uten internettilgang
- Automatisk lagring av besøkte områder
- Ingen overraskelser når du er langt fra sivilisasjonen

**3. Personvern som standard**
- Ingen sporing av brukere
- Ingen registrering påkrevd
- Alle data lagres kun på din enhet
- GDPR-kompatibel fra bunn av
- Ingen informasjonskapsler
- Ingen reklame

**4. Progressiv webapplikasjon (PWA)**
- Installer direkte fra nettleseren
- Ingen App Store eller Google Play nødvendig
- Oppdateres automatisk
- Fungerer på mobil, nettbrett og PC
- Native app-opplevelse

**5. Norsk og åpen**
- Utviklet med norsk personvern i fokus
- Ingen data sendes utenfor EU/EØS
- Åpen kildekode (kommer)
- Community-drevet utvikling

---

### Blog Article Drafts

#### Article 1: "Hvorfor Tråkke er bygget som en PWA"

**Target Audience**: Tråkke users, outdoor enthusiasts

**Key Points:**
- Hva er en PWA? (Progressive Web Application)
- Hvorfor ikke native app?
- Fordeler for brukeren:
  - Ingen app store nødvendig
  - Automatiske oppdateringer
  - Fungerer på alle enheter
  - Mindre lagringsplass
  - Bedre personvern

**Outline:**

**Introduksjon:**
Når vi startet utviklingen av Tråkke, måtte vi ta et viktig valg: Native app eller Progressive Web Application (PWA)? Vi valgte PWA, og her er hvorfor.

**Hva er en PWA?**
En PWA er en webapplikasjon som oppfører seg som en native app, men kjører i nettleseren. Du installerer den direkte fra nettstedet uten å gå gjennom App Store eller Google Play.

**Fordel 1: Ingen mellommenn**
- Direkte fra utvikler til bruker
- Ingen 30% avgift til Apple/Google
- Ingen godkjenningsprosesser som forsinker oppdateringer
- Ingen sensur eller kontroll fra store selskaper

**Fordel 2: Personvern by design**
- PWA-er kjører i nettleserens sandbox
- Ingen tilgang til unødvendig data
- Brukeren kontrollerer all lagring
- Ingen skjulte tillatelser

**Fordel 3: Alltid oppdatert**
- Service Workers gir automatiske oppdateringer
- Ingen "oppdater app" meldinger
- Gradvis utrulling av nye funksjoner
- Bugfixes når du trenger dem

**Fordel 4: En kode - alle plattformer**
- Samme app på iPhone, Android, PC, Mac
- Konsistent brukeropplevelse
- Raskere utvikling = flere funksjoner

**Konklusjon:**
For Tråkke, hvor personvern og pålitelighet er fundamentalt, var PWA det åpenbare valget.

---

#### Article 2: "Offline-first: Hvordan Tråkke fungerer uten internett"

**Target Audience**: Technical users, developers, outdoor enthusiasts

**Key Points:**
- Service Workers teknologi
- Cache strategier
- IndexedDB for lokal lagring
- Hvordan kart-tiles caches
- Brukeren merker ingenting

**Outline:**

**Introduksjon:**
"Hva skjer når du er på fjelltur uten dekning?" Med Tråkke: Ingenting. Appen fungerer akkurat som normalt.

**Hvordan fungerer det?**

**1. Service Workers - din personlige server**
- Mellommann mellom app og nett
- Lagrer filer lokalt første gang
- Serverer fra cache når offline
- Transparent for brukeren

**2. Cache-first strategi**
```
Bruker ber om kart
  ↓
Service Worker sjekker cache
  ↓
Finnes i cache? → Vis umiddelbart
  ↓
Finnes ikke? → Last ned og cache
```

**3. Smart tile-caching**
- Kartverket deler kart i små tiles
- Kun tiles du ser caches
- 30 dagers levetid per tile
- Maks 500 tiles (ca. 50MB)
- Automatisk opprydding

**4. IndexedDB for brukerdata**
- Lagrer dine preferanser
- Favorittlokasjoner (kommer)
- Ruter og waypoints (kommer)
- Alt tilgjengelig offline

**5. Progressive enhancement**
- App shell laster først (instant)
- Så kart-tiles
- Til slutt dynamisk data
- Fungerer selv med treg forbindelse

**Resultat:**
Etter første besøk fungerer Tråkke perfekt offline i de områdene du har besøkt. Når du planlegger en tur, last inn kartområdet hjemmefra - så er du garantert tilgang i fjellet.

---

#### Article 3: "GDPR-kompatibel kartapp uten personvernbanner - hvordan?"

**Target Audience**: Developers, privacy advocates, tech-savvy users

**Key Points:**
- Privacy by Design
- Hvorfor ingen consent banner?
- Tekniske løsninger
- GDPR Artikkel 25
- Hva andre kan lære

**Outline:**

**Introduksjon:**
Har du lagt merke til at Tråkke ikke har personvernbanner, cookievarsel eller samtykkeformularer? Det er ikke fordi vi ignorerer GDPR - det er fordi vi følger den.

**Privacy by Design (GDPR Art. 25)**

GDPR krever faktisk IKKE personvernbannere. Det den krever er:
- Dataминimering
- Privacy by default
- Transparent databehandling
- Brukerens kontroll

**Hvordan Tråkke oppfyller GDPR uten bannere:**

**1. Vi samler ingen data = ingen samtykke nødvendig**
- Ingen analytics
- Ingen tracking cookies
- Ingen brukerregistrering
- Ingen behavioral profiling

**2. All data lagres lokalt**
```typescript
// Dette er GDPR-kompatibelt uten samtykke:
await dbService.put('preferences', { theme: 'dark' })
// Data forlater aldri enheten

// Dette krever samtykke:
await fetch('https://analytics.com/track', { userId: 123 })
// Persondata sendes til tredjepart
```

**3. Ingen tredjeparts-tjenester**
- Kartverket (norsk statlig etat) = innenfor EØS
- Alle fonter og ikoner self-hosted
- Ingen CDN-er utenfor EU/EØS
- Content Security Policy håndhever dette

**4. Brukeren har full kontroll**
- Nettleserens innstillinger styrer alt
- Slett data via "Clear browsing data"
- Ingen sentralisert database å slette fra
- GDPR "rett til sletting" = innebygd

**5. Transparent dokumentasjon**
- Åpen kildekode (kommer)
- Detaljert privacy policy
- Developer guidelines
- Ingenting skjult

**Teknisk implementering:**

**Content Security Policy:**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               connect-src 'self' https://cache.kartverket.no;">
```
Dette blokkerer automatisk all sporing.

**Ingen cookies:**
PWA = ingen server-side sessions = ingen cookies nødvendig.

**IndexedDB istedenfor cloud:**
```typescript
// All lagring lokal
const db = await openDB('trakke-db', 1, {
  upgrade(db) {
    db.createObjectStore('userData')
  }
})
```

**Konklusjon:**
Den beste måten å være GDPR-kompatibel på er å ikke samle data. Ikke fordi loven krever det, men fordi det er riktig for brukerne.

**Lær mer:**
- [PRIVACY_BY_DESIGN.md](./PRIVACY_BY_DESIGN.md)
- [DEVELOPER_GUIDELINES.md](./DEVELOPER_GUIDELINES.md)

---

#### Article 4: "Hvorfor vi bruker Kartverket, ikke Google Maps"

**Target Audience**: Norwegian users, developers

**Key Points:**
- Kartverket vs Google Maps
- Norsk detaljrikdom
- Personvern
- Kostnad
- Norsk kontroll over data

**Outline:**

**Introduksjon:**
Google Maps er verdens mest brukte kartløsning. Likevel bruker Tråkke Kartverket. Hvorfor?

**1. Kartverket er norsk standard**
- Norges offisielle kartmyndighet
- Grunnlag for alt fra navigasjon til eiendomsgrenser
- Mest detaljerte og oppdaterte kart over Norge
- Topografisk informasjon (høydekurver, terreng)

**2. Google Maps er bygget for biler**
- Fokus på veier, adresser, bedrifter
- Manglende topografisk informasjon
- Ikke optimalisert for fjelltur

**3. Personvern**
| Google Maps | Kartverket |
|-------------|------------|
| Tracker position history | Ingen tracking |
| Krever Google-konto for funksjoner | Ingen registrering |
| Data sendes til USA | Data fra Norge (EØS) |
| Behavioral profiling | Ingen profiling |
| Personalized ads | Ingen annonser |

**4. Kostnadsmodell**
- Google Maps: Dyrt for kommersielle apper
- Kartverket: Gratis/åpne data fra det offentlige
- Du har allerede betalt (skatter) = dine kart

**5. Norsk kontroll**
- Kartverket = norsk statlig etat
- GDPR-kompatibelt by default
- Ingen avhengighet av amerikanske selskaper
- Norske databeskyttelseslover gjelder

**6. Teknisk kvalitet**
- WMTS-standard (Web Map Tile Service)
- Høy oppløsning
- Regelmessige oppdateringer
- Stabil API

**Konklusjon:**
For en norsk friluftsapp er Kartverket det åpenbare valget: Bedre kart, bedre personvern, norsk kontroll.

---

#### Article 5: "MapLibre vs Mapbox vs Google Maps - Hvorfor vi valgte MapLibre"

**Target Audience**: Developers

**Key Points:**
- Oversikt over alternativer
- Open source vs proprietary
- Lisenser og kostnader
- Personvern
- Teknisk fleksibilitet

**Outline:**

**Introduksjon:**
Når du bygger en kartapplikasjon i 2025, har du tre hovedvalg:

**1. Google Maps JavaScript API**
- ✅ Enklest å komme i gang
- ✅ Kjent API
- ❌ Dyrt ved skala
- ❌ Tracking innebygd
- ❌ Leverandør-locking
- ❌ Krever API-nøkkel

**2. Mapbox GL JS**
- ✅ Kraftig og fleksibelt
- ✅ Pen design out-of-the-box
- ❌ Proprietær (kun for visning)
- ❌ Telemetri by default
- ❌ Krever API-nøkkel
- ❌ Dyrt ved høy bruk

**3. MapLibre GL JS**
- ✅ Fork av Mapbox GL JS v1
- ✅ 100% open source
- ✅ Ingen API-nøkkel nødvendig
- ✅ Ingen innebygd tracking
- ✅ Community-drevet
- ✅ Gratis for all bruk

**Hvorfor Tråkke valgte MapLibre:**

**1. Privacy by design**
```typescript
// MapLibre - full kontroll
new maplibregl.Map({
  container: 'map',
  style: customMapStyle,
  // Ingen telemetri
  // Ingen external requests
})

// Mapbox - telemetri by default
new mapboxgl.Map({
  container: 'map',
  accessToken: 'pk.xxx', // Tracks usage
  // Sender data til Mapbox servers
})
```

**2. Self-hosted tiles**
- MapLibre støtter enhver WMTS/TMS kilde
- Vi kan bruke Kartverket direkte
- Ingen mellommann
- Ingen API-kostnad

**3. Ingen vendor lock-in**
- Åpen standard
- Kan bytte tile-provider når som helst
- Community vedlikeholder koden
- Ikke avhengig av ett selskap

**4. Performance**
- Like rask som Mapbox GL JS
- WebGL-basert rendering
- Støtter vector og raster tiles
- Smooth zoom og pan

**5. Developer experience**
```typescript
// Kompatibel API med Mapbox
import maplibregl from 'maplibre-gl'

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      'kartverket': {
        type: 'raster',
        tiles: ['https://cache.kartverket.no/v1/wmts/...'],
        tileSize: 256
      }
    },
    layers: [{
      id: 'kartverket-layer',
      type: 'raster',
      source: 'kartverket'
    }]
  }
})
```

**Migrasjon fra Mapbox til MapLibre:**
```bash
# Ofte så enkelt som:
npm uninstall mapbox-gl
npm install maplibre-gl

# I koden:
- import mapboxgl from 'mapbox-gl'
+ import maplibregl from 'maplibre-gl'

# Fjern accessToken
- accessToken: 'pk.xxx'
```

**Konklusjon:**
For personvernfokuserte apper med egne tiles er MapLibre det åpenbare valget. Open source, ingen tracking, full kontroll.

**Ressurser:**
- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js-docs/)
- [Migration Guide](https://maplibre.org/maplibre-gl-js-docs/example/migrate-from-mapbox/)

---

#### Article 6: "React 19.2 + Vite 5.4 + PWA: Modern Stack for 2025"

**Target Audience**: Developers

**Key Points:**
- Hvorfor React 19.2?
- Vite vs Create React App
- PWA-plugin for Vite
- TypeScript benefits
- Developer experience

**Outline:**

**Tech Stack Overview:**

```
Tråkke PWA Tech Stack (2025)
├── React 19.2.0 (UI Framework)
├── TypeScript 5.9.3 (Type Safety)
├── Vite 5.4.21 (Build Tool)
├── vite-plugin-pwa 1.1.0 (PWA Support)
├── MapLibre GL JS 5.11.0 (Map Rendering)
├── Workbox 7.3.0 (Service Worker)
└── IndexedDB (Local Storage)
```

**Hvorfor hver teknologi:**

**1. React 19.2.0**
- ✅ New: Server Components (future-proofing)
- ✅ New: Improved Suspense
- ✅ Actions API for forms
- ✅ use() hook for async data
- ✅ Mature ecosystem
- ✅ TypeScript-first

**2. Vite 5 vs Create React App**
| Feature | Vite | CRA |
|---------|------|-----|
| Dev server start | <1s | 30s+ |
| HMR speed | Instant | 5-10s |
| Build speed | Fast | Slow |
| Bundle size | Optimized | Larger |
| Maintenance | Active | Deprecated |

**3. vite-plugin-pwa**
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Full control over Service Worker
      }
    })
  ]
})
```

**Benefits:**
- Zero-config PWA generation
- Workbox integration
- Automatic manifest generation
- Dev mode testing
- TypeScript support

**4. TypeScript**
```typescript
// Type safety catches bugs early
interface MapTile {
  z: number  // zoom
  x: number  // tile x
  y: number  // tile y
}

// This would error at compile time:
const tile: MapTile = { z: 10, x: 'abc', y: 20 }
//                                ~~~~ Error!
```

**5. Development Experience**

**Hot Module Replacement (HMR):**
```typescript
// Edit Map.tsx
export default function Map() {
  return <div>Updated!</div>
}
// Browser updates INSTANTLY without refresh
// State preserved
```

**Fast Builds:**
```bash
npm run build
# Vite: ~15 seconds
# CRA: ~2 minutes
```

**Project Structure:**
```
trakke_pwa/
├── src/
│   ├── components/    # React components
│   ├── services/      # Business logic
│   ├── styles/        # CSS modules
│   ├── types/         # TypeScript types
│   └── main.tsx       # Entry point
├── public/            # Static assets
└── vite.config.ts     # Build config
```

**Performance:**
- Tree shaking (automatic)
- Code splitting (automatic)
- CSS minification (automatic)
- Asset optimization (automatic)

**Konklusjon:**
Modern web development has never been better. React 19.2 + Vite 5.4 + PWA = Fast development, fast apps, great UX.

---

## 2. Privacy Policy for Tråkke

### Privacy Policy / Personvernerklæring

**Last Updated**: November 8, 2025
**Effective Date**: [TBD]
**Version**: 1.0

---

### English Version

#### Introduction

Tråkke ("we", "our", "the app") is a Progressive Web Application for outdoor navigation in Norway. This privacy policy explains how we handle your data - or more accurately, how we don't handle it.

#### Our Privacy Philosophy

Tråkke is built on a simple principle: **Your data belongs to you, not to us.**

We believe privacy should be the default, not an afterthought. That's why Tråkke is designed to require zero data collection from our users.

#### What Data We Collect

**None.**

We do not collect, store, transmit, or process any personal data on our servers because we don't have any servers for user data.

#### What Happens on Your Device

**Local Storage Only:**

The following data is stored exclusively on your device and never leaves it:

1. **Map Tiles**
   - Source: Kartverket (Norwegian Mapping Authority)
   - Purpose: Display maps offline
   - Storage: Browser cache via Service Worker
   - Retention: 30 days, then automatically deleted
   - Size limit: Maximum 500 tiles (~50MB)

2. **Your Location** (if you grant permission)
   - Source: Your device's GPS
   - Purpose: Show your position on the map
   - Storage: Memory only (runtime, not saved)
   - Retention: Only while app is open
   - Note: Location is NEVER transmitted to any server

3. **App Preferences**
   - Examples: [Future: map zoom level, last position, etc.]
   - Storage: IndexedDB (local browser storage)
   - Retention: Until you clear browser data
   - Note: Never synchronized to any cloud service

#### What We DON'T Do

We explicitly do NOT:

- ❌ Collect analytics or usage statistics
- ❌ Track your location or location history
- ❌ Use cookies
- ❌ Require registration or login
- ❌ Store data on remote servers
- ❌ Share data with third parties
- ❌ Use advertising or advertising IDs
- ❌ Profile users or behavior
- ❌ Use social media pixels or tracking
- ❌ Sell any data (we don't have any to sell)

#### External Resources

Tråkke connects to exactly ONE external service:

**Kartverket (cache.kartverket.no)**
- **Purpose**: Download map tiles
- **Location**: Norway (EU/EØS compliant)
- **Operator**: Norwegian Mapping Authority (government agency)
- **Data sent**: Tile coordinates (z, x, y) - NOT your location
- **Privacy**: No user tracking, no cookies, GDPR compliant

All other resources (fonts, icons, scripts) are served directly from the app - no external CDNs or third-party services.

#### Your Rights Under GDPR

Even though we don't collect data, you have rights:

**Right to Access**: There is no data about you on our servers to access.

**Right to Deletion**: Clear your browser's data:
- Settings → Privacy → Clear browsing data
- Check: "Cached images and files" and "Site data"

**Right to Data Portability**: Your data never leaves your device, so you already have it.

**Right to Withdraw Consent**: You can revoke location permission in your browser settings at any time.

#### Children's Privacy

Tråkke does not collect data from anyone, including children under 16. No special parental consent is required because no data is collected.

#### Data Breach Notification

Since we don't collect or store user data on servers, there is no centralized data to breach. Your data remains on your device, protected by your device's security.

#### Changes to This Policy

We will notify users of any material changes to this privacy policy by:
- Updating the "Last Updated" date above
- Posting a notice in the app (for major changes)
- Publishing updates to our website/repository

#### International Data Transfers

**There are none.**

All data stays on your device. The only external connection is to Kartverket (Norway), which is within the EU/EØS area and GDPR compliant.

#### Legal Basis for Processing (GDPR Art. 6)

The minimal processing we do is based on:
- **Article 6(1)(f)**: Legitimate interest (displaying maps requires fetching tiles)
- **Article 6(1)(a)**: Consent (for geolocation, via browser permission)

#### Data Controller

Since no personal data is processed on servers, there is no traditional data controller. The app runs entirely on your device under your control.

For questions about privacy:
- **Open an issue**: [GitHub repository URL when public]
- **Email**: [contact email TBD]

#### Regulatory Compliance

Tråkke complies with:
- 🇪🇺 **GDPR** (General Data Protection Regulation EU 2016/679)
- 🇳🇴 **Personopplysningsloven** (Norwegian Personal Data Act)
- 🇪🇺 **ePrivacy Directive** (2002/58/EC)

**Norwegian Data Protection Authority (Datatilsynet)**
Website: https://www.datatilsynet.no/

#### Technical Security Measures

Even though we don't collect data, we protect your privacy through:

1. **Content Security Policy (CSP)**
   - Blocks unauthorized external connections
   - Prevents XSS attacks
   - Enforces HTTPS

2. **No Cookies**
   - PWAs don't require cookies
   - No tracking cookies possible

3. **Local-First Architecture**
   - Service Workers cache resources locally
   - IndexedDB for client-side storage
   - No backend database

4. **HTTPS Only**
   - All connections encrypted
   - Production requires HTTPS

#### Open Source Commitment

Tråkke will be open source [when published], allowing anyone to:
- Verify our privacy claims
- Audit the code
- Confirm no hidden tracking
- Contribute improvements

#### Summary

**What makes Tråkke private:**

✅ No data collection
✅ No user tracking
✅ No cookies
✅ No registration
✅ No cloud storage
✅ No third-party services (except Norwegian government maps)
✅ Everything stored locally on your device
✅ You control all data via browser settings

---

### Norwegian Version / Norsk versjon

#### Introduksjon

Tråkke ("vi", "vår", "appen") er en Progressiv Webapplikasjon for navigasjon i norsk natur. Denne personvernerklæringen forklarer hvordan vi håndterer dine data - eller mer presist, hvordan vi IKKE håndterer dem.

#### Vår personvernfilosofi

Tråkke er bygget på et enkelt prinsipp: **Dine data tilhører deg, ikke oss.**

Vi mener personvern skal være standard, ikke et påfunn i etterkant. Derfor er Tråkke designet for å kreve null datainnsamling fra våre brukere.

#### Hvilke data vi samler inn

**Ingen.**

Vi samler ikke inn, lagrer, overfører eller behandler noen personopplysninger på våre servere fordi vi ikke har noen servere for brukerdata.

#### Hva som skjer på din enhet

**Kun lokal lagring:**

Følgende data lagres utelukkende på din enhet og forlater den aldri:

1. **Karttiles**
   - Kilde: Kartverket
   - Formål: Vise kart offline
   - Lagring: Nettleser-cache via Service Worker
   - Oppbevaring: 30 dager, deretter automatisk slettet
   - Størrelsesgrense: Maksimum 500 tiles (~50MB)

2. **Din posisjon** (hvis du gir tillatelse)
   - Kilde: Enhetens GPS
   - Formål: Vise din posisjon på kartet
   - Lagring: Kun i minnet (runtime, ikke lagret)
   - Oppbevaring: Kun mens appen er åpen
   - Merk: Posisjon sendes ALDRI til noen server

3. **App-preferanser**
   - Eksempler: [Fremtid: zoom-nivå, siste posisjon, osv.]
   - Lagring: IndexedDB (lokal nettleserlagring)
   - Oppbevaring: Til du sletter nettleserdata
   - Merk: Aldri synkronisert til noen sky-tjeneste

#### Hva vi IKKE gjør

Vi gjør eksplisitt IKKE:

- ❌ Samle statistikk eller analysedata
- ❌ Spore din posisjon eller posisjonshistorikk
- ❌ Bruke informasjonskapsler (cookies)
- ❌ Kreve registrering eller innlogging
- ❌ Lagre data på eksterne servere
- ❌ Dele data med tredjeparter
- ❌ Bruke reklame eller reklame-IDer
- ❌ Profilere brukere eller atferd
- ❌ Bruke sosiale medier pixels eller sporing
- ❌ Selge data (vi har ingen å selge)

#### Eksterne ressurser

Tråkke kobler til nøyaktig ÉN ekstern tjeneste:

**Kartverket (cache.kartverket.no)**
- **Formål**: Laste ned karttiles
- **Plassering**: Norge (EU/EØS-kompatibel)
- **Operatør**: Kartverket (statlig etat)
- **Data sendt**: Tile-koordinater (z, x, y) - IKKE din posisjon
- **Personvern**: Ingen brukersporing, ingen cookies, GDPR-kompatibel

Alle andre ressurser (fonter, ikoner, scripts) serveres direkte fra appen - ingen eksterne CDN-er eller tredjepartstjenester.

#### Dine rettigheter under GDPR

Selv om vi ikke samler data, har du rettigheter:

**Rett til innsyn**: Det finnes ingen data om deg på våre servere å se.

**Rett til sletting**: Slett nettleserens data:
- Innstillinger → Personvern → Slett nettleserdata
- Kryss av: "Bufrede bilder og filer" og "Nettstedsdata"

**Rett til dataportabilitet**: Dine data forlater aldri enheten din, så du har dem allerede.

**Rett til å trekke tilbake samtykke**: Du kan fjerne posisjonstillatelse i nettleserinnstillingene når som helst.

#### Barns personvern

Tråkke samler ikke data fra noen, inkludert barn under 16 år. Ingen spesiell foreldretillatelse kreves fordi ingen data samles inn.

#### Varsling om databrudd

Siden vi ikke samler eller lagrer brukerdata på servere, finnes det ingen sentralisert data å bryte seg inn i. Dine data forblir på enheten din, beskyttet av enhetens sikkerhet.

#### Endringer i denne erklæringen

Vi vil varsle brukere om vesentlige endringer i denne personvernerklæringen ved å:
- Oppdatere "Sist oppdatert"-datoen ovenfor
- Legge ut varsel i appen (for større endringer)
- Publisere oppdateringer på nettsted/repository

#### Internasjonale dataoverføringer

**Det er ingen.**

All data blir på din enhet. Den eneste eksterne forbindelsen er til Kartverket (Norge), som er innenfor EU/EØS-området og GDPR-kompatibel.

#### Rettslig grunnlag for behandling (GDPR Art. 6)

Den minimale behandlingen vi gjør er basert på:
- **Artikkel 6(1)(f)**: Berettiget interesse (visning av kart krever nedlasting av tiles)
- **Artikkel 6(1)(a)**: Samtykke (for geolokasjon, via nettlesertillatelse)

#### Behandlingsansvarlig

Siden ingen personopplysninger behandles på servere, finnes det ingen tradisjonell behandlingsansvarlig. Appen kjører helt på din enhet under din kontroll.

For spørsmål om personvern:
- **Opprett issue**: [GitHub repository URL når offentlig]
- **E-post**: [kontakt e-post TBD]

#### Overholdelse av regelverk

Tråkke overholder:
- 🇪🇺 **GDPR** (General Data Protection Regulation EU 2016/679)
- 🇳🇴 **Personopplysningsloven**
- 🇪🇺 **ePrivacy-direktivet** (2002/58/EC)

**Datatilsynet**
Nettsted: https://www.datatilsynet.no/

#### Tekniske sikkerhetstiltak

Selv om vi ikke samler data, beskytter vi ditt personvern gjennom:

1. **Content Security Policy (CSP)**
   - Blokkerer uautoriserte eksterne tilkoblinger
   - Forhindrer XSS-angrep
   - Håndhever HTTPS

2. **Ingen informasjonskapsler**
   - PWA-er krever ikke cookies
   - Ingen sporings-cookies mulig

3. **Lokal-først arkitektur**
   - Service Workers cacher ressurser lokalt
   - IndexedDB for klient-side lagring
   - Ingen backend database

4. **Kun HTTPS**
   - Alle tilkoblinger kryptert
   - Produksjon krever HTTPS

#### Åpen kildekode-forpliktelse

Tråkke vil være åpen kildekode [når publisert], slik at alle kan:
- Verifisere våre personvernpåstander
- Granske koden
- Bekrefte ingen skjult sporing
- Bidra med forbedringer

#### Oppsummering

**Hva som gjør Tråkke privat:**

✅ Ingen datainnsamling
✅ Ingen brukersporing
✅ Ingen informasjonskapsler
✅ Ingen registrering
✅ Ingen skylagring
✅ Ingen tredjepartstjenester (bortsett fra Kartverkets kart)
✅ Alt lagret lokalt på din enhet
✅ Du kontrollerer all data via nettleserinnstillinger

---

## Notes for Future Use

### Website Implementation Notes

- **Domain**: [TBD]
- **Hosting**: Consider:
  - GitHub Pages (free, HTTPS, EU-friendly)
  - Netlify (EU region, HTTPS, CDN)
  - Norwegian hosting provider (for extra privacy points)

- **Analytics**: NONE (stay consistent with privacy promise)
  - If absolutely needed in future: Plausible (EU) or self-hosted Matomo

### Blog Platform Options

- **Self-hosted**: WordPress, Ghost (full control)
- **Privacy-friendly platforms**:
  - Write.as (privacy-focused)
  - Bear Blog (minimal, privacy-focused)
  - Self-hosted static site (Hugo, Jekyll)

### Legal Review Needed

Before publishing privacy policy:
- [ ] Review by legal professional familiar with GDPR
- [ ] Confirm compliance with Norwegian Personopplysningsloven
- [ ] Verify Data Protection Impact Assessment (DPIA) not needed (likely not, given architecture)
- [ ] Add contact information (email, GitHub)
- [ ] Set effective date
- [ ] Consider registering with Datatilsynet (likely not needed, but verify)

### Translation Notes

- Privacy policy provided in both English and Norwegian
- Norwegian is primary (Norwegian app, Norwegian users)
- English for international audience and developers

### Content Strategy

**Target Audiences:**
1. **Norwegian outdoor enthusiasts** → About page, Norwegian content
2. **Privacy advocates** → GDPR compliance articles
3. **Developers** → Technical PWA articles, open source angle
4. **Potential contributors** → Developer-focused content

**SEO Keywords** (if needed):
- Norwegian: "friluftslivskart", "offline kart", "personvern", "norske kart"
- English: "privacy-first PWA", "offline maps Norway", "GDPR compliant app"

---

**This is a DRAFT document. Do not publish without:**
1. Legal review
2. Contact information added
3. Final decisions on open source timeline
4. User testing of privacy policy clarity
