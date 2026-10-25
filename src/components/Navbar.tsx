import { AnimatePresence, m, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { navLinks, profile } from '../data/profile'
import { useSmoothScroll } from '../hooks/useLenis'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { cn } from '../lib/cn'
import { openPalette, SHORTCUT, warmPalette } from '../lib/palette'
import { StatusDot } from './StatusDot'
import { ThemeToggle } from './ThemeToggle'

type SectionId = (typeof navLinks)[number]['id']

/** Tracks which home section is in view to light up its nav item. */
function useActiveSection(enabled: boolean): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null)

  useEffect(() => {
    if (!enabled) {
      setActive(null)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id as SectionId)
      },
      // A thin band across the upper-middle of the viewport.
      { rootMargin: '-40% 0px -55% 0px' },
    )
    // Home mounts its sections just after first paint, so observe again when they arrive.
    const observe = () =>
      navLinks.forEach((l) => {
        const el = document.getElementById(l.id)
        if (el) io.observe(el)
      })
    observe()
    window.addEventListener('home:sections', observe)
    return () => {
      io.disconnect()
      window.removeEventListener('home:sections', observe)
    }
  }, [enabled])

  return active
}

export function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { scrollTo } = useSmoothScroll()
  const reduced = useReducedMotion()
  const isHome = pathname === '/'
  const active = useActiveSection(isHome)

  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  const scrollProgress = useMotionValue(0)
  const progress = useSpring(scrollProgress, { stiffness: 200, damping: 30, restDelta: 0.001 })

  // Measures only in response to scrolling. Reading scroll metrics on mount
  // (as useScroll does) forces the page's first layout synchronously in JS.
  // A restored scroll position on reload fires a scroll event too.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollProgress.set(max > 0 ? Math.min(1, y / max) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [scrollProgress])

  // Keyboard focus never sits under the fixed bar (WCAG 2.4.11). Browsers scroll a newly
  // focused element just into view, which can be under the bar (tabbing backwards, or
  // Safari going forwards); nudge the page so it's below the bar instead.
  const headerRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target
      if (!(el instanceof Element) || el.closest('header, dialog') || !el.matches(':focus-visible')) return
      if (getComputedStyle(el).position === 'fixed') return // e.g. the skip link, which sits above the bar
      requestAnimationFrame(() => {
        const bar = headerRef.current?.getBoundingClientRect().bottom ?? 0
        const top = el.getBoundingClientRect().top
        if (top < bar + 8) window.scrollBy({ top: top - bar - 16 })
      })
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [])

  // Close the mobile menu on route change or Escape.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (id: string) => {
    setOpen(false)
    if (isHome) scrollTo(`#${id}`)
    else navigate(`/#${id}`)
  }

  return (
    <header
      ref={headerRef}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled || open ? 'border-b border-line bg-bg/75 backdrop-blur-md' : 'border-b border-transparent',
      )}
    >
      <nav className="shell flex h-16 items-center justify-between gap-4" aria-label="Primary">
        <Link
          to="/"
          onClick={(e) => {
            if (isHome) {
              e.preventDefault()
              scrollTo(0)
            }
          }}
          className="hit-area group flex items-center gap-2.5 font-mono text-sm text-fg"
        >
          {/* Accessible name comes from the text, so it always matches what's visible. */}
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-md border border-line-strong bg-surface text-[13px] font-semibold transition-colors group-hover:border-accent"
          >
            {profile.initials}
          </span>
          <span className="sr-only sm:hidden">{profile.name}, home</span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="font-medium">{profile.handle}</span>
            <span aria-hidden="true" className="hidden items-center gap-1.5 whitespace-nowrap text-[10px] text-fg-muted lg:flex">
              <StatusDot live /> all systems operational
            </span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l, i) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => go(l.id)}
                aria-current={active === l.id ? 'true' : undefined}
                className={cn(
                  'relative rounded-md px-3 py-2 font-mono text-[12px] transition-colors',
                  active === l.id ? 'text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {/* Full muted colour: the dimmed /60 variant failed WCAG contrast (2.5:1). */}
                <span className="mr-1 text-fg-muted">0{i + 1}</span>
                {l.label.toLowerCase()}
                {/* Active marker draws in from the left (CSS only; no layout-animation engine needed). */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-3 -bottom-px h-px origin-left bg-accent transition-transform duration-300 ease-out-expo',
                    active === l.id ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {/* Command palette hint, desktop only (the shortcut needs a keyboard). */}
          <button
            type="button"
            onClick={openPalette}
            onPointerEnter={warmPalette}
            onFocus={warmPalette}
            aria-keyshortcuts={SHORTCUT.aria}
            // The visible shortcut is part of the name (no brackets: axe's label-in-name check splits on them).
            aria-label={`Command palette, ${SHORTCUT.label}`}
            title="Command palette"
            className="hidden h-9 items-center rounded-md border border-line px-2.5 font-mono text-[11px] tracking-[0.06em] text-fg-muted transition-colors hover:border-accent hover:text-fg lg:inline-flex"
          >
            {SHORTCUT.label}
          </button>
          <ThemeToggle />
          <button
            type="button"
            className="hit-area grid h-9 w-9 place-items-center rounded-md border border-line text-fg lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-4">
              <span className={cn('absolute left-0 top-0 h-px w-4 bg-current transition-transform duration-300', open && 'translate-y-1.5 rotate-45')} />
              <span className={cn('absolute bottom-0 left-0 h-px w-4 bg-current transition-transform duration-300', open && '-translate-y-1.5 -rotate-45')} />
            </span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            className="overflow-hidden border-t border-line lg:hidden"
            initial={reduced ? false : { height: 0 }}
            animate={{ height: 'auto' }}
            exit={reduced ? undefined : { height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <ul className="shell flex flex-col py-3">
              {navLinks.map((l, i) => (
                <m.li
                  key={l.id}
                  initial={reduced ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i + 0.05 }}
                >
                  <button
                    type="button"
                    onClick={() => go(l.id)}
                    className="flex w-full items-center gap-3 py-3 text-left font-mono text-sm text-fg-dim hover:text-fg"
                  >
                    <span className="text-accent">0{i + 1}</span>
                    {l.label.toLowerCase()}
                  </button>
                </m.li>
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>

      {/* Scroll progress: a thin "throughput" bar along the bottom edge. */}
      <m.div
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-px h-px origin-left bg-accent/70"
        // Project pages draw their own progress bar, in the project's status colour.
        style={{ scaleX: progress, opacity: scrolled && isHome ? 1 : 0 }}
      />
    </header>
  )
}
