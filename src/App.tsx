import { AnimatePresence, m } from 'framer-motion'
import { lazy, Suspense, useLayoutEffect, useState, type ReactNode } from 'react'
import { Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { CommandMenu } from './components/CommandMenu'
import { CustomCursor } from './components/CustomCursor'
import { Footer } from './components/Footer'
import { Navbar } from './components/Navbar'
import { useIdleTitle } from './hooks/useIdleTitle'
import { useSmoothScroll } from './hooks/useLenis'
import { useProjectLinks } from './hooks/useProjectLinks'
import { useReducedMotion } from './hooks/useReducedMotion'
import { getHomeScroll } from './lib/navMemory'
import { hasSharedFor } from './lib/sharedElement'
import { Home } from './pages/Home'

// Project pages load on demand (and are warmed on first hover of a project link),
// so the home page doesn't pay for them.
const loadProjectDetail = () => import('./pages/ProjectDetail')
const ProjectDetail = lazy(loadProjectDetail)

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * How a page was reached decides its entrance:
 * - shared:  from a project card; the card's title and chip fly into the header (lib/sharedElement)
 * - restore: back to home; return to the saved spot in the Projects section (Home)
 * - hash:    to a #section of home (Home)
 * - top:     everything else starts at the top
 */
type Arrival = 'shared' | 'restore' | 'hash' | 'top'

function Page({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  const { scrollTo } = useSmoothScroll()
  const location = useLocation()
  const navType = useNavigationType()

  const [arrival] = useState<Arrival>(() => {
    const restore = (location.state as { restore?: boolean } | null)?.restore
    if (location.pathname === '/' && getHomeScroll() !== null && (restore || navType === 'POP')) return 'restore'
    if (location.hash) return 'hash'
    const slug = /^\/projects\/([^/]+)/.exec(location.pathname)?.[1]
    if (slug && hasSharedFor(slug)) return 'shared'
    return 'top'
  })

  // Before paint, so a new page never flashes at the previous page's scroll.
  // Runs after children's layout effects: the shared header measures itself first,
  // in document coordinates, i.e. already relative to the top.
  useLayoutEffect(() => {
    if (arrival === 'top' || arrival === 'shared') scrollTo(0, { immediate: true })
  }, [arrival, scrollTo])

  if (reduced) {
    // Reduced motion: a simple cross-fade, nothing moves.
    return (
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
        {children}
      </m.div>
    )
  }

  return (
    <m.div
      // Shared: the flying title is the transition. Restore/hash: fade only, since
      // a moving page would skew the scroll-target measurement.
      initial={arrival === 'shared' ? false : { opacity: 0, y: arrival === 'top' ? 16 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.25, ease: EASE } }}
      transition={{ duration: 0.45, ease: EASE, delay: arrival === 'restore' ? 0.08 : 0 }}
    >
      {children}
    </m.div>
  )
}

export default function App() {
  const location = useLocation()
  useProjectLinks(loadProjectDetail)
  useIdleTitle()

  const detail = (
    <Page>
      {/* Holds the page open while the chunk loads, so the footer never flashes in and gets pushed down. */}
      <Suspense fallback={<div aria-hidden="true" className="min-h-screen" />}>
        <ProjectDetail />
      </Suspense>
    </Page>
  )

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-fg focus:px-3 focus:py-2 focus:text-bg">
        Skip to content
      </a>
      <Navbar />
      <div id="main">
        {/* initial={false}: the transition plays between routes, never on first load (the hero has its own intro). */}
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <Page>
                  <Home />
                </Page>
              }
            />
            <Route path="/projects/:slug" element={detail} />
            <Route path="*" element={detail} />
          </Routes>
        </AnimatePresence>
      </div>
      <Footer />
      <CustomCursor />
      <CommandMenu />
    </>
  )
}
