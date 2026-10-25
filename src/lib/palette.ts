/*
  Command palette plumbing. The palette itself (components/CommandPalette) is
  a lazy chunk: it loads on first use, or early when the navbar hint is hovered.
*/

export const loadPalette = () => import('../components/CommandPalette')
export const warmPalette = () => void loadPalette()

const OPEN_EVENT = 'palette:open'
export const openPalette = () => window.dispatchEvent(new Event(OPEN_EVENT))
export const onOpenPalette = (cb: () => void) => {
  window.addEventListener(OPEN_EVENT, cb)
  return () => window.removeEventListener(OPEN_EVENT, cb)
}

const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || ''
const APPLE = /mac|iphone|ipad|ipod/i.test(platform)

/** The shortcut as shown ("⌘K" on Apple devices, "Ctrl K" elsewhere) and for aria-keyshortcuts. */
export const SHORTCUT = APPLE ? { label: '⌘K', aria: 'Meta+K' } : { label: 'Ctrl K', aria: 'Control+K' }

/** Ctrl+K or ⌘K, on any platform. */
export const isPaletteShortcut = (e: KeyboardEvent) =>
  (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.code === 'KeyK' || e.key.toLowerCase() === 'k')
