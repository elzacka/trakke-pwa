# GPS Navigation & Tracking - Design Specification

**Feature Phase**: Phase 4 (Post Phase 2 & 3 completion)
**Status**: Design phase - not yet implemented
**Priority**: High user value for outdoor navigation use cases

## Overview

GPS navigation features will transform Tråkke from a mapping tool into a complete outdoor navigation companion. This document specifies the design for turn-by-turn navigation, live tracking, and route following capabilities.

## Core Principles

### Privacy-First Navigation
- All navigation processing happens **client-side only**
- No route sharing with external servers
- No tracking analytics or telemetry
- Uses browser Geolocation API (already approved)
- User must explicitly activate tracking (no automatic background tracking)
- Complies with GDPR and Norwegian privacy regulations

### Battery Efficiency
- Multiple tracking modes for different use cases
- Smart position update intervals
- Background tracking optimization
- Wake lock API for screen-on navigation

### Offline-First
- Works without network connectivity
- All navigation logic runs locally
- No dependency on external routing services for basic point-to-point

## Feature Scope

### 1. Turn-by-Turn Navigation

**User Flow:**
1. User opens an existing route in RouteSheet
2. Taps "Start navigasjon" button
3. NavigationSheet opens with active guidance
4. Map centers on user position with auto-follow
5. Voice/haptic alerts at waypoints
6. Navigation ends when reaching final waypoint or user cancels

**Core Functionality:**
- Active route guidance with next waypoint display
- Distance to next waypoint (meters/kilometers)
- ETA calculation based on average hiking speed
- Progress indicator (waypoint X of Y)
- Visual arrow/bearing to next waypoint
- Audio cues at waypoint arrival (optional)
- Haptic feedback for turns/waypoints

### 2. Route Following

**Off-Route Detection:**
- Calculate perpendicular distance from route line
- Alert threshold: 50m for trails, 100m for wilderness
- Visual indicator when off-route
- Option to return to route or continue

**Progress Tracking:**
- Total distance traveled
- Distance remaining to destination
- Estimated time to arrival
- Current speed (km/h, configurable)
- Elevation gain/loss (if available)

### 3. Compass & Bearing

**Compass Overlay:**
- Circular compass rose on map
- North indicator (magnetic or true north)
- Bearing line to next waypoint
- Current heading from device compass API

**Bearing Information:**
- Cardinal direction to target (N, NE, E, etc.)
- Numeric bearing in degrees (0-359°)
- Distance as the crow flies

### 4. Live Tracking & Recording

**Position Tracking:**
- Continuous GPS updates during navigation
- Configurable update frequency (1s, 5s, 10s)
- Accuracy circle visualization
- Track line drawn on map (breadcrumb trail)

**Track Recording:**
- Save GPS breadcrumbs as new route
- Auto-save on navigation end
- Manual save/discard option
- Timestamps for each point
- Statistics: distance, duration, avg speed

**Tracking Modes:**
- **High Accuracy** (1-2s updates) - Active navigation
- **Balanced** (5s updates) - Casual hiking
- **Power Saver** (10-15s updates) - Long expeditions
- **Recording Only** - No navigation, just track logging

### 5. Map Interaction During Navigation

**Auto-Follow Mode:**
- Map centers on user position
- Optional rotation to heading-up orientation
- Smooth pan/zoom as user moves
- User can pan away (auto-follow pauses)
- Return to center button re-enables auto-follow

**Navigation Overlay:**
- Semi-transparent navigation bar (bottom)
- Doesn't obscure map features
- Collapsible to compact mode
- Shows critical info: next waypoint, distance, bearing

## Technical Architecture

### New Service: navigationService.ts

```typescript
interface NavigationSession {
  id: string
  routeId: string
  startTime: number
  endTime?: number
  trackPoints: TrackPoint[]
  currentWaypointIndex: number
  status: 'active' | 'paused' | 'completed'
  mode: 'high' | 'balanced' | 'power-saver' | 'recording-only'
}

interface TrackPoint {
  coordinates: [number, number]
  timestamp: number
  accuracy?: number
  altitude?: number
  speed?: number
  heading?: number
}

class NavigationService {
  // Core navigation
  startNavigation(routeId: string, mode: TrackingMode): Promise<NavigationSession>
  pauseNavigation(): void
  resumeNavigation(): void
  stopNavigation(): Promise<SavedTrack | null>

  // Position tracking
  trackPosition(callback: (position: TrackPoint) => void): number // Returns watch ID
  stopTracking(watchId: number): void
  getCurrentPosition(): Promise<TrackPoint>

  // Route following
  calculateDistanceToRoute(point: [number, number], route: Route): number
  isOffRoute(point: [number, number], route: Route, threshold: number): boolean
  getNextWaypoint(currentPosition: [number, number], route: Route): Waypoint | null

  // Bearing calculations
  calculateBearing(from: [number, number], to: [number, number]): number
  getCardinalDirection(bearing: number): string // 'N', 'NE', 'E', etc.

  // ETA & progress
  calculateETA(distance: number, avgSpeed: number): number // milliseconds
  getProgressStats(session: NavigationSession): ProgressStats

  // Track management
  saveTrack(session: NavigationSession, name: string): Promise<Route>
  getActiveSessions(): NavigationSession[]
}
```

### IndexedDB Schema Updates

**New store: navigationSessions**
```typescript
{
  id: string,                     // "nav-{timestamp}-{random}"
  routeId: string,                // Reference to routes store
  startTime: number,
  endTime?: number,
  trackPoints: TrackPoint[],      // GPS breadcrumbs
  currentWaypointIndex: number,
  status: 'active' | 'paused' | 'completed',
  mode: 'high' | 'balanced' | 'power-saver' | 'recording-only',
  settings: {
    autoFollow: boolean,
    audioAlerts: boolean,
    hapticFeedback: boolean,
    offRouteThreshold: number,    // meters
  },
  stats: {
    distanceTraveled: number,     // meters
    avgSpeed: number,              // km/h
    maxSpeed: number,
    elevationGain?: number,
    elevationLoss?: number,
  }
}
```

Increment `DB_VERSION` to 4 in [dbService.ts](src/services/dbService.ts).

### New Component: NavigationSheet.tsx

**UI Layout:**
```
┌─────────────────────────────────────┐
│  [UP]  Til Preikestolen              │  Next waypoint name
│  1.2 km  •  15 min  •  NE (45°)    │  Distance, ETA, bearing
├─────────────────────────────────────┤
│  Veipunkt 2 av 5                   │  Progress
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  Progress bar
├─────────────────────────────────────┤
│  [Pause]  [Stopp]  [[SETTINGS]]            │  Actions
└─────────────────────────────────────┘
```

**Compact Mode:**
```
┌─────────────────────────────────────┐
│  [UP] 1.2 km  •  NE  •  [...]          │  Minimal info bar
└─────────────────────────────────────┘
```

**Props:**
```typescript
interface NavigationSheetProps {
  isOpen: boolean
  onClose: () => void
  session: NavigationSession | null
  currentPosition: TrackPoint | null
  route: Route
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onSettings: () => void
}
```

### New Component: CompassOverlay.tsx

**Visual Design:**
- Circular compass (80px diameter)
- North indicator (red)
- Bearing line to target (green)
- Current heading arrow (blue)
- Positioned top-right, below FAB
- Semi-transparent background

**Props:**
```typescript
interface CompassOverlayProps {
  currentHeading: number      // Device compass heading
  targetBearing: number       // Bearing to next waypoint
  show: boolean
  onClick?: () => void        // Expand for details
}
```

### Map.tsx Integration

**New State:**
```typescript
const [navigationSheetOpen, setNavigationSheetOpen] = useState(false)
const [activeNavigation, setActiveNavigation] = useState<NavigationSession | null>(null)
const [currentPosition, setCurrentPosition] = useState<TrackPoint | null>(null)
const [autoFollow, setAutoFollow] = useState(true)
const [showCompass, setShowCompass] = useState(false)
```

**Position Tracking Effect:**
```typescript
useEffect(() => {
  if (!activeNavigation) return

  const watchId = navigationService.trackPosition((position) => {
    setCurrentPosition(position)

    // Update map center if auto-follow
    if (autoFollow && map.current) {
      map.current.panTo(position.coordinates)
    }

    // Check off-route
    const route = routeService.getRoute(activeNavigation.routeId)
    if (route && navigationService.isOffRoute(
      position.coordinates,
      route,
      activeNavigation.settings.offRouteThreshold
    )) {
      // Show off-route alert
      triggerOffRouteAlert()
    }

    // Check waypoint arrival
    checkWaypointArrival(position)
  })

  return () => navigationService.stopTracking(watchId)
}, [activeNavigation, autoFollow])
```

**Map Click Handler Updates:**
```typescript
const handleMapClick = async (e: maplibregl.MapMouseEvent) => {
  // Navigation mode takes priority over other modes
  if (activeNavigation && !autoFollow) {
    // User clicked map during navigation
    // Show "Return to navigation" prompt?
    return
  }

  // ... existing click handlers
}
```

### RouteSheet.tsx Updates

Add "Start navigasjon" button to route items:

```typescript
{routes.map(route => (
  <div key={route.id} className="route-item">
    <h3>{route.name}</h3>
    <p>{formatDistance(route.distance)}</p>
    <div className="route-actions">
      <button onClick={() => toggleRouteVisibility(route.id)}>
        Vis/Skjul
      </button>
      <button
        onClick={() => startNavigation(route.id)}
        className="primary"
      >
        Start navigasjon
      </button>
      <button onClick={() => deleteRoute(route.id)}>
        Slett
      </button>
    </div>
  </div>
))}
```

## User Interface Design

### Navigation Controls

**FABMenu Integration:**
Add to Group 2 (Active Tools):
- "Navigasjon" - Opens active navigation or navigation settings
- Icon: `navigation` (Material Symbol)
- Badge when navigation is active

**Navigation Settings Sheet:**
- Tracking mode selection (High/Balanced/Power Saver/Recording Only)
- Audio alerts toggle
- Haptic feedback toggle
- Off-route threshold slider (25m - 200m)
- Speed unit (km/h, min/km, mph)
- Compass type (magnetic north, true north)

### Voice Alerts

**Alert Types:**
1. **Waypoint approach** - "Om 100 meter når du {waypoint name}"
2. **Waypoint arrival** - "Du har nådd {waypoint name}"
3. **Off-route** - "Du er {distance} fra ruten"
4. **Final destination** - "Du har nådd målet"

**Implementation:**
- Web Speech API for text-to-speech
- Norwegian language (nb-NO)
- Fallback to haptic if speech unavailable
- User can disable in settings

### Haptic Feedback

**Feedback Patterns:**
- Single pulse: Waypoint approach (100m)
- Double pulse: Waypoint arrival
- Triple pulse: Off-route alert
- Long pulse: Navigation started/stopped

Uses [useHaptics.ts](src/hooks/useHaptics.ts) hook.

## Battery Optimization

### Tracking Modes

| Mode | Update Frequency | Use Case | Battery Impact |
|------|-----------------|----------|----------------|
| High Accuracy | 1-2 seconds | Active turn-by-turn | High (4-6 hours) |
| Balanced | 5 seconds | Casual hiking | Medium (8-12 hours) |
| Power Saver | 10-15 seconds | Long expeditions | Low (16-24 hours) |
| Recording Only | 30 seconds | Track logging only | Very Low (24+ hours) |

### Wake Lock API

```typescript
// Keep screen on during navigation
let wakeLock: WakeLockSentinel | null = null

async function acquireWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
    } catch (err) {
      console.error('Wake Lock error:', err)
    }
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release()
    wakeLock = null
  }
}
```

Apply wake lock when navigation is active, release when paused/stopped.

### Background Optimization

- Reduce map rendering when app is backgrounded
- Pause non-essential position updates
- Continue minimal tracking for route following
- Resume full tracking when app returns to foreground

## Geolocation API Usage

### Position Options

```typescript
const positionOptions: PositionOptions = {
  enableHighAccuracy: mode === 'high',
  timeout: 10000,
  maximumAge: mode === 'high' ? 0 : 5000
}

navigator.geolocation.watchPosition(
  successCallback,
  errorCallback,
  positionOptions
)
```

### Error Handling

```typescript
function handleGeolocationError(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      alert('GPS-tilgang nektet. Aktiver stedstjenester i nettleserinnstillinger.')
      break
    case error.POSITION_UNAVAILABLE:
      alert('GPS-posisjon utilgjengelig. Sjekk at du er utendørs.')
      break
    case error.TIMEOUT:
      alert('GPS-forespørsel tidsavbrutt. Prøv igjen.')
      break
  }
}
```

### Accuracy Thresholds

- **High accuracy needed**: < 20m accuracy for navigation
- **Warning threshold**: 20-50m accuracy (show warning icon)
- **Poor accuracy**: > 50m accuracy (alert user, suggest moving to open area)

## Compass API Integration

### Device Orientation

```typescript
// Listen for device orientation events
window.addEventListener('deviceorientationabsolute', (event) => {
  if (event.alpha !== null) {
    // alpha is compass heading (0-359°)
    const heading = event.alpha
    updateCompass(heading)
  }
})
```

### Fallback for Non-Compass Devices

If device doesn't support compass:
- Use GPS heading (calculated from movement)
- Show static north arrow instead of rotating compass
- Disable heading-up map rotation

### Magnetic Declination

For true north calculation:
```typescript
// Magnetic declination for Norway (varies by location)
// Simplified: use fixed declination or calculate from coordinates
function getTrueNorth(magneticHeading: number, declination: number): number {
  return (magneticHeading + declination + 360) % 360
}
```

## Data Storage & Persistence

### Session Auto-Save

- Auto-save navigation session every 60 seconds
- Save on app close/background
- Restore active session on app open
- Prompt user to continue or save track

### Track Export

After navigation ends:
```typescript
async function saveNavigationTrack(session: NavigationSession) {
  const route = await routeService.createRoute({
    name: `Sporing ${new Date(session.startTime).toLocaleDateString('nb-NO')}`,
    coordinates: session.trackPoints.map(p => p.coordinates),
    distance: session.stats.distanceTraveled,
    createdAt: session.startTime,
    updatedAt: session.endTime || Date.now(),
  })

  // Optionally export as GPX (Phase 2 feature)
  return route
}
```

## Accessibility

### ARIA Labels
- Navigation sheet: `role="dialog"`, `aria-label="Aktiv navigasjon"`
- Compass overlay: `role="img"`, `aria-label="Kompass"`
- Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

### Keyboard Support
- Space/Enter: Pause/resume navigation
- Escape: Stop navigation (with confirmation)
- Arrow keys: Manual compass rotation (when focused)

### Voice Announcements
- Use `aria-live="polite"` for waypoint updates
- `aria-live="assertive"` for off-route alerts
- Don't interrupt user speech with auto-announcements

## Testing Strategy

### Unit Tests
- Bearing calculations (all 360 degrees)
- Distance to route calculations
- ETA calculations with various speeds
- Off-route detection edge cases

### Integration Tests
- Start navigation → track position → reach waypoint → end navigation
- Off-route detection → alert → return to route
- Pause → resume → verify tracking continuity
- Battery mode switching

### Manual Testing Scenarios
1. **Urban navigation** - Test GPS accuracy in city
2. **Wilderness navigation** - Test on hiking trails
3. **Low battery** - Verify power saver mode
4. **Poor GPS signal** - Test error handling
5. **Background/foreground** - App switching behavior
6. **Device rotation** - Landscape/portrait modes

### Privacy Testing
- Network tab shows no navigation data sent externally
- IndexedDB inspection shows local-only storage
- Location permission only requested on user action
- No persistent location tracking after navigation stops

## Known Limitations

1. **No Offline Routing**: Point-to-point only, no complex routing engine
2. **No Voice Navigation Recalculation**: If off-route, manual adjustment required
3. **Battery Intensive**: GPS tracking drains battery on long sessions
4. **Requires Clear Sky View**: GPS accuracy poor indoors/under tree cover
5. **Browser API Dependency**: Relies on Geolocation & DeviceOrientation APIs

## Future Enhancements (Post Phase 4)

- Integration with external routing services (if privacy-compliant EU/EØS service found)
- Automatic route recalculation when off-route
- Multi-day expedition support with waypoint camping
- Integration with elevation profiles (from Phase 3)
- Heart rate monitor integration (if privacy-compliant)
- Social features: Share tracks with friends (opt-in, privacy-first)

## Implementation Checklist

### Phase 4A: Core Navigation (Priority 1)
- [ ] Create `navigationService.ts` with core functions
- [ ] Update IndexedDB schema (v4) with `navigationSessions` store
- [ ] Implement `NavigationSheet.tsx` component
- [ ] Add navigation controls to `RouteSheet.tsx`
- [ ] Integrate position tracking in `Map.tsx`
- [ ] Implement bearing calculations
- [ ] Add ETA calculations
- [ ] Test basic navigation flow

### Phase 4B: Compass & Bearing (Priority 2)
- [ ] Create `CompassOverlay.tsx` component
- [ ] Implement Device Orientation API integration
- [ ] Add compass rose graphics/CSS
- [ ] Implement heading-up map rotation
- [ ] Test compass accuracy across devices

### Phase 4C: Track Recording (Priority 3)
- [ ] Implement track point recording
- [ ] Add save track dialog
- [ ] Implement track statistics calculation
- [ ] Add track management UI
- [ ] Test long-duration tracking

### Phase 4D: Alerts & Feedback (Priority 4)
- [ ] Implement voice alerts (Web Speech API)
- [ ] Add haptic feedback patterns
- [ ] Implement off-route detection
- [ ] Add visual alert UI
- [ ] Test alert timing and UX

### Phase 4E: Battery Optimization (Priority 5)
- [ ] Implement tracking modes
- [ ] Add Wake Lock API support
- [ ] Optimize background tracking
- [ ] Add battery usage warnings
- [ ] Test battery impact across modes

### Phase 4F: Settings & Polish (Priority 6)
- [ ] Create navigation settings UI
- [ ] Add unit preferences (km/h, min/km, etc.)
- [ ] Implement auto-follow toggle
- [ ] Add navigation tutorial/onboarding
- [ ] Comprehensive user testing

## Privacy Compliance

### GDPR Checklist
- [OK] No personal data sent to external servers
- [OK] Location data stored locally only (IndexedDB)
- [OK] User controls when tracking starts/stops
- [OK] Clear UI indicators when location is being tracked
- [OK] Option to delete all navigation history
- [OK] No cookies or external tracking
- [OK] Complies with existing privacy architecture

### User Consent
- First-time navigation: Show explanation dialog
- Explain what data is collected (GPS coordinates, timestamps)
- Explain data is local-only, never shared
- User must explicitly start navigation (no auto-start)

## Documentation Updates Required

When implementing Phase 4:

1. **README.md** - Update features list with navigation capabilities
2. **CLAUDE.md** - Add navigation patterns to architecture section
3. **PRIVACY_BY_DESIGN.md** - Document location tracking privacy measures
4. **InfoSheet.tsx** - Add attribution for geolocation APIs used

---

**Design Status**: Complete - Ready for implementation after Phase 2 & 3
**Last Updated**: 2025-11-19
**Approved By**: Pending user review
