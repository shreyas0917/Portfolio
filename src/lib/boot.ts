/*
  The first-visit boot overlay lives in index.html (it paints before any
  JavaScript). While it's on screen <html> has the `booting` class; it fires
  'boot:done' as it starts fading out, which is when the hero's intro plays.
*/

export const isBooting = () => document.documentElement.classList.contains('booting')

/** Runs `cb` once the boot overlay hands off to the page (right away if it isn't showing). Returns a cancel function. */
export function afterBoot(cb: () => void): () => void {
  if (!isBooting()) {
    cb()
    return () => {}
  }
  window.addEventListener('boot:done', cb, { once: true })
  return () => window.removeEventListener('boot:done', cb)
}
