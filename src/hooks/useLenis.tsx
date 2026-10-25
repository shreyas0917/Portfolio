import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react'
import Lenis from 'lenis'
import { afterLayoutSettles } from '../lib/layoutSettle'
import { useReducedMotion } from './useReducedMotion'

type ScrollTarget = string | number | HTMLElement

interface SmoothScrollValue {
  /**
   * Scroll to a y position, selector, or element. Clearance for the fixed navbar
   * comes from each section's `scroll-margin-top` (scroll-mt-*), which both Lenis
   * and native scrollIntoView honour — so no offset is applied here.
   */
  scrollTo: (target: ScrollTarget, opts?: { immediate?: boolean }) => void
}

const SmoothScrollContext = createContext<SmoothScrollValue | null>(null)

/**
 * Lenis smooth scrolling on its own rAF loop. It drives the real window scroll,
 * so native scroll listeners and IntersectionObservers (lib/scrollLinked, the
 * reveals) keep working unchanged. Disabled under prefers-reduced-motion.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    if (reduced) return

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      autoRaf: true,
    })
    lenisRef.current = lenis

    return () => {
      lenis.destroy()
      lenisRef.current = null
    }
  }, [reduced])

  const scrollTo = useCallback<SmoothScrollValue['scrollTo']>((target, opts = {}) => {
    const jump = () => {
      const lenis = lenisRef.current
      if (lenis) {
        // Lenis clamps targets to a cached page height that refreshes asynchronously.
        // Re-measure first, or a jump made right after a route change stops short.
        lenis.resize()
        lenis.scrollTo(target, { immediate: opts.immediate })
        return
      }
      // Reduced-motion / fallback path: instant native jump.
      if (typeof target === 'number') window.scrollTo({ top: target })
      else (typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target)?.scrollIntoView({ block: 'start' })
    }

    if (typeof target === 'number') {
      jump()
      return
    }
    // Sections below the fold skip rendering until needed (.defer-render), so
    // their heights are estimates. Jumping to an element renders them all
    // (they stay rendered), then waits for components that size themselves
    // after rendering (the project flow diagrams) so the target is exact.
    document.documentElement.classList.add('render-all')
    afterLayoutSettles(jump)
  }, [])

  return <SmoothScrollContext.Provider value={{ scrollTo }}>{children}</SmoothScrollContext.Provider>
}

export function useSmoothScroll(): SmoothScrollValue {
  const ctx = useContext(SmoothScrollContext)
  if (!ctx) throw new Error('useSmoothScroll must be used inside <SmoothScrollProvider>')
  return ctx
}
