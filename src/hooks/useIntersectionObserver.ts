import { useEffect, useRef, useState } from 'react'

export interface IntersectionObserverOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
}

/**
 * Custom hook for Intersection Observer API (2025 Best Practice)
 *
 * Observes when an element enters/exits the viewport for performance optimization.
 * Used for:
 * - Lazy loading POI markers (only render visible markers)
 * - Viewport-based data fetching
 * - Performance monitoring
 *
 * @param options - IntersectionObserver configuration
 * @returns [ref, isIntersecting, entry] - Attach ref to target element
 *
 * @example
 * const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 })
 * return <div ref={ref}>{isVisible && <ExpensiveComponent />}</div>
 */
export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  options: IntersectionObserverOptions = {}
): [React.RefObject<T | null>, boolean, IntersectionObserverEntry | null] {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0
  } = options

  const ref = useRef<T | null>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        setEntry(entry)
      },
      { root, rootMargin, threshold }
    )

    observer.observe(element)

    return () => {
      if (element) {
        observer.unobserve(element)
      }
      observer.disconnect()
    }
  }, [root, rootMargin, threshold])

  return [ref, isIntersecting, entry]
}

/**
 * Hook for observing multiple elements (e.g., list of POI markers)
 *
 * @param callback - Called when any observed element's intersection changes
 * @param options - IntersectionObserver configuration
 * @returns observer ref to be used with element refs
 *
 * @example
 * const observerRef = useIntersectionObserverMultiple((entries) => {
 *   entries.forEach(entry => {
 *     if (entry.isIntersecting) {
 *       // Render marker
 *     } else {
 *       // Remove marker from DOM
 *     }
 *   })
 * })
 */
export function useIntersectionObserverMultiple(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverOptions = {}
) {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0
  } = options

  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(callback, {
      root,
      rootMargin,
      threshold
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [callback, root, rootMargin, threshold])

  const observe = (element: Element) => {
    observerRef.current?.observe(element)
  }

  const unobserve = (element: Element) => {
    observerRef.current?.unobserve(element)
  }

  return { observe, unobserve, observer: observerRef }
}
