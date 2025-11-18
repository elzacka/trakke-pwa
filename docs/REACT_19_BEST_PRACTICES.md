# React 19 Best Practices Implementation

This document details the modern React 19 (2025) best practices implemented in Tråkke PWA.

## Overview

Tråkke uses React 19.2 with TypeScript 5.9.3. The following patterns ensure optimal performance, error handling, and user experience.

## 1. Error Boundaries

### Implementation
- **Component**: [ErrorBoundary.tsx](../src/components/ErrorBoundary.tsx)
- **Styling**: [ErrorBoundary.css](../src/styles/ErrorBoundary.css)
- **Usage**: Wraps entire app in [App.tsx](../src/App.tsx)

### Features
- Catches JavaScript errors anywhere in child component tree
- Prevents entire app crash when component fails
- User-friendly Norwegian error messages
- Technical error details (collapsible)
- Recovery options: "Last siden på nytt" (reload) and "Prøv igjen" (reset)
- Nordisk ro design system styling

### Usage Example
```tsx
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  )
}
```

### Custom Fallback
```tsx
<ErrorBoundary fallback={<CustomErrorUI />}>
  <Component />
</ErrorBoundary>
```

## 2. Suspense Boundaries

### Implementation
- **Location**: [App.tsx](../src/App.tsx:72-81)
- **Lazy Loading**: Map component loaded with `React.lazy()`

### Features
- Deferred loading of heavy Map component (1.2 MB bundle)
- Loading spinner with "Laster kart..." message
- Smooth user experience during initial load
- CSS animation (rotating refresh icon)

### Usage Example
```tsx
import { Suspense, lazy } from 'react'

const Map = lazy(() => import('./components/Map'))

function App() {
  return (
    <Suspense fallback={
      <div className="map-loading-fallback">
        <div className="loading-spinner">
          <span className="material-symbols-outlined rotating">refresh</span>
          <p>Laster kart...</p>
        </div>
      </div>
    }>
      <Map />
    </Suspense>
  )
}
```

### Benefits
- **Faster Initial Load**: Map bundle only loaded when needed
- **Better UX**: Visual feedback during load instead of blank screen
- **Code Splitting**: Automatic bundle optimization by Vite

## 3. Intersection Observer API

### Implementation
- **Hook**: [useIntersectionObserver.ts](../src/hooks/useIntersectionObserver.ts)
- **Purpose**: Performance optimization for POI markers

### Features

#### Single Element Observer
```tsx
const [ref, isVisible, entry] = useIntersectionObserver({
  threshold: 0.1,
  rootMargin: '100px'
})

return (
  <div ref={ref}>
    {isVisible && <ExpensiveComponent />}
  </div>
)
```

#### Multiple Element Observer
```tsx
const { observe, unobserve } = useIntersectionObserverMultiple(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Element entered viewport
      } else {
        // Element left viewport
      }
    })
  },
  { threshold: 0.1 }
)

// Attach to elements
useEffect(() => {
  observe(elementRef.current)
  return () => unobserve(elementRef.current)
}, [])
```

### Use Cases in Tråkke
1. **POI Marker Virtualization**: Only render markers visible in viewport
2. **Lazy Loading**: Defer loading of off-screen components
3. **Performance Monitoring**: Track component visibility
4. **Viewport-Based Fetching**: Trigger data fetching when entering viewport

### Benefits
- **Reduced DOM Nodes**: Only render visible POIs (100s → 10s)
- **Better Performance**: Lower memory usage, smoother scrolling
- **Battery Savings**: Less CPU/GPU work on mobile devices

## 4. Performance Optimizations

### Bundle Size
- **Before Lazy Loading**: ~1.4 MB initial bundle
- **After Lazy Loading**: ~200 KB initial + 1.2 MB on-demand
- **Initial Load Improvement**: ~85% reduction

### Chunking Strategy
```javascript
// Vite automatic code splitting via dynamic imports
const Map = lazy(() => import('./components/Map'))
// Results in separate Map-BHCyAr9Q.js chunk (1.2 MB)
```

### Future Optimization Opportunities
1. **Manual Chunks**: Split large components further
   ```javascript
   // vite.config.ts
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           'maplibre': ['maplibre-gl'],
           'vendor': ['react', 'react-dom']
         }
       }
     }
   }
   ```

2. **Route-Based Code Splitting**: If adding multiple pages
3. **Component Lazy Loading**: Lazy load bottom sheets, FAB menu

## 5. Best Practices Checklist

### Error Handling ✅
- [x] ErrorBoundary wraps entire app
- [x] User-friendly error messages (Norwegian)
- [x] Technical details for debugging
- [x] Recovery mechanisms (reload, reset)

### Loading States ✅
- [x] Suspense boundaries for lazy components
- [x] Loading fallback UI with spinner
- [x] Consistent loading indicators

### Performance ✅
- [x] Lazy loading for heavy components (Map)
- [x] Intersection Observer hook for virtualization
- [x] Code splitting via dynamic imports
- [x] Optimized bundle sizes

### Accessibility
- [x] ARIA labels on error buttons
- [x] Semantic HTML in loading states
- [x] Keyboard navigation support

### Developer Experience
- [x] TypeScript strict mode
- [x] Comprehensive JSDoc comments
- [x] Reusable hooks
- [x] Clear component structure

## 6. Migration Notes

### From React 18 to React 19
Tråkke is built with React 19.2 and follows these patterns:

1. **Concurrent Features**: All async rendering is properly handled
2. **Strict Mode**: Enabled in development for detecting issues
3. **Error Boundaries**: Class components still required (no hooks alternative)
4. **Suspense**: Works seamlessly with lazy loading

### Breaking Changes Addressed
- None - Tråkke was built with React 19 from start
- All dependencies compatible with React 19

## 7. Testing Recommendations

### Error Boundary Testing
```typescript
// Simulate error in component
throw new Error('Test error')
// Verify:
// - Error UI displays
// - "Prøv igjen" resets state
// - "Last siden på nytt" reloads
```

### Suspense Testing
```typescript
// Verify loading fallback appears
// Check that Map eventually loads
// Test slow 3G network conditions
```

### Intersection Observer Testing
```typescript
// Scroll element into viewport
// Verify callback fires
// Check element visibility state
```

## 8. Documentation References

- [React 19 Documentation](https://react.dev)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [React Suspense](https://react.dev/reference/react/Suspense)

## 9. Monitoring & Debugging

### Console Logging
All hooks and error boundaries log to console:
- `[ErrorBoundary]` - Error details
- `[IntersectionObserver]` - Visibility changes (if enabled)

### Performance Monitoring
Use React DevTools Profiler to measure:
- Lazy loading impact
- Component render times
- Intersection Observer efficiency

### Production Error Tracking
Currently: Console-only (privacy-first design)
Future: Consider self-hosted Sentry instance (GDPR compliant)

---

**Last Updated**: 2025-11-17
**React Version**: 19.2
**TypeScript Version**: 5.9.3
