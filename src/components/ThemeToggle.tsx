import { AnimatePresence, m } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'
import { useReducedMotion } from '../hooks/useReducedMotion'

/** Console-style toggle: shows the current mode as a mono flag, swaps with a short vertical roll. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const reduced = useReducedMotion()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      // Starts with the visible label ("dark"/"light") so voice-control users can say what they see.
      aria-label={`${theme} theme, switch to ${next}`}
      title={`Switch to ${next} theme`}
      className="hit-area group inline-flex h-9 items-center gap-2 rounded-md border border-line px-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim transition-colors hover:border-accent hover:text-fg"
    >
      {/* No overflow clipping on the button, so its hit area (.hit-area) can extend past it.
          The rolling icon only reaches ~2px past the edge while it's almost fully faded. */}
      <span className="relative h-4 w-4">
        <AnimatePresence mode="wait" initial={false}>
          {/* Animate an HTML wrapper, not the <svg>: Framer Motion measures transformed
              SVG elements with getBBox() on mount, forcing a synchronous page layout. */}
          <m.span
            key={theme}
            className="absolute inset-0"
            initial={reduced ? false : { y: 12, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={reduced ? undefined : { y: -12, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
              {theme === 'dark' ? (
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </>
              )}
            </svg>
          </m.span>
        </AnimatePresence>
      </span>
      <span className="hidden sm:inline">{theme}</span>
    </button>
  )
}
