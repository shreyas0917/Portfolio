import { startTransition, useEffect, useLayoutEffect, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { useSmoothScroll } from '../hooks/useLenis'
import { usePageMeta } from '../hooks/usePageMeta'
import { afterLayoutSettles, holdLayout } from '../lib/layoutSettle'
import { getHomeScroll } from '../lib/navMemory'
import { homeMeta } from '../lib/seo'
import { About } from '../sections/About'
import { Contact } from '../sections/Contact'
import { Education } from '../sections/Education'
import { Experience } from '../sections/Experience'
import { Hero } from '../sections/Hero'
import { Projects } from '../sections/Projects'
import { Skills } from '../sections/Skills'

export function Home() {
  const { hash, state } = useLocation()
  const navType = useNavigationType()
  const { scrollTo } = useSmoothScroll()
  usePageMeta(homeMeta())

  // First paint renders only the Hero. Everything below the fold mounts right
  // after, in a transition React time-slices, so the initial render is not one
  // long main-thread task. Until then, scroll jumps wait (layout hold) and the
  // navbar re-observes the sections once they exist ('home:sections').
  const [belowFold, setBelowFold] = useState(false)
  useLayoutEffect(() => {
    if (belowFold) return
    return holdLayout()
  }, [belowFold])
  useEffect(() => {
    if (!belowFold) startTransition(() => setBelowFold(true))
    else window.dispatchEvent(new Event('home:sections'))
  }, [belowFold])

  // Arriving via /#section: jump there once the page has mounted.
  useEffect(() => {
    if (!hash) return
    const id = window.setTimeout(() => scrollTo(hash, { immediate: true }), 50)
    return () => window.clearTimeout(id)
  }, [hash, scrollTo])

  // Back from a project page ("all systems" link or the browser's back button):
  // return to the same spot in the Projects section, not the top of the page.
  const [arrival] = useState(() => ({ restore: (state as { restore?: boolean } | null)?.restore === true, pop: navType === 'POP' }))
  useEffect(() => {
    if (hash || !(arrival.restore || arrival.pop)) return
    const offset = getHomeScroll()
    if (offset === null) {
      if (arrival.restore) scrollTo('#projects', { immediate: true })
      return
    }
    // Render every section, wait for self-sizing components, then measure.
    document.documentElement.classList.add('render-all')
    afterLayoutSettles(() => {
      const section = document.getElementById('projects')
      if (section) scrollTo(section.getBoundingClientRect().top + window.scrollY + offset, { immediate: true })
    })
  }, [arrival, hash, scrollTo])

  return (
    <main>
      <Hero />
      {belowFold ? (
        <>
          <About />
          <Projects />
          <Skills />
          <Experience />
          <Education />
          <Contact />
        </>
      ) : (
        // Keeps the footer well below the fold until the sections arrive.
        <div aria-hidden="true" className="h-[200vh]" />
      )}
    </main>
  )
}
