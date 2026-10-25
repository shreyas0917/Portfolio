import type { CSSProperties } from 'react'

/**
 * Run `cb` once the main thread is idle, or after `timeout` ms at the latest.
 * For decorative or below-the-fold work that shouldn't compete with first paint.
 * Returns a cancel function.
 */
export function onIdle(cb: () => void, timeout = 1500): () => void {
  // Safari lacks requestIdleCallback (the DOM typings assume it exists).
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(cb, { timeout })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(cb, Math.min(timeout, 300))
  return () => clearTimeout(id)
}

/** Inline start time for a `.intro` CSS animation (see globals.css). */
export function at(seconds: number): CSSProperties {
  return { '--d': `${seconds.toFixed(2)}s` } as CSSProperties
}
