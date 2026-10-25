import { useEffect } from 'react'
import { captureShared } from '../lib/sharedElement'
import { rememberHomeScroll } from '../lib/navMemory'
import { prefersReducedMotion } from './useReducedMotion'

const PROJECT_LINK = 'a[href^="/projects/"]'

/**
 * Watches clicks on project links before the router navigates (capture phase):
 * remembers the home scroll position and captures the card's shared title and
 * chip for the page transition. Also warms the project page's code on first
 * hover/focus/touch of any project link.
 */
export function useProjectLinks(prefetch: () => void) {
  useEffect(() => {
    let warmed = false
    const warm = (e: Event) => {
      if (warmed || !(e.target instanceof Element) || !e.target.closest(PROJECT_LINK)) return
      warmed = true
      prefetch()
    }
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = e.target instanceof Element ? e.target.closest(PROJECT_LINK) : null
      if (!link) return
      if (window.location.pathname === '/') rememberHomeScroll()
      const root = link.closest<HTMLElement>('[data-shared-root]')
      if (root?.dataset.sharedRoot && !prefersReducedMotion()) captureShared(root.dataset.sharedRoot, root)
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('pointerover', warm, { passive: true })
    document.addEventListener('focusin', warm)
    document.addEventListener('touchstart', warm, { passive: true })
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('pointerover', warm)
      document.removeEventListener('focusin', warm)
      document.removeEventListener('touchstart', warm)
    }
  }, [prefetch])
}
