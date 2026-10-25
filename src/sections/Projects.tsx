import { useEffect, useRef } from 'react'
import { ProjectCard } from '../components/ProjectCard'
import { SectionHeading } from '../components/SectionHeading'
import { StatusDot } from '../components/StatusDot'
import { projects } from '../data/projects'
import { useReducedMotion } from '../hooks/useReducedMotion'

const featured = projects.filter((p) => p.featured)
const spotlight = featured.filter((p) => p.spotlight)
const compact = featured.filter((p) => !p.spotlight)

function ConsoleBar() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-surface/60 px-3 py-2 font-mono text-[12px]">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-2.5 text-fg">
          <StatusDot live />
          <span>
            <span className="text-fg-muted">// </span>featured_systems
          </span>
        </span>
        <span className="text-ok">[{featured.length} running]</span>
      </span>
      <span className="text-fg-muted">02</span>
    </div>
  )
}

export function Projects() {
  const gridRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  // Staggered entrance with GSAP, loaded only once the grid nears the viewport.
  // Cards already on screen at that point are left alone, so nothing visible
  // ever blinks out; only cards still below the fold rise in. Cards are
  // triggered by an IntersectionObserver (their top crossing 92% of the
  // viewport); cards that cross together rise in as one staggered batch.
  useEffect(() => {
    const grid = gridRef.current
    if (reduced || !grid) return
    let cancelled = false
    let revert: (() => void) | undefined

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        import('gsap').then(({ gsap }) => {
          if (cancelled) return
          let reveal: IntersectionObserver | undefined
          const ctx = gsap.context(() => {
            const pending = gsap.utils
              .toArray<HTMLElement>('[data-reveal]', grid)
              .filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.9)
            if (!pending.length) return
            // Opacity only (not visibility): hidden cards stay keyboard-reachable.
            gsap.set(pending, { opacity: 0, y: 48 })
            reveal = new IntersectionObserver(
              (entries) => {
                const batch = entries.filter((e) => e.isIntersecting).map((e) => e.target)
                if (!batch.length) return
                batch.forEach((el) => reveal?.unobserve(el))
                ctx.add(() => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.12, overwrite: true }))
              },
              { rootMargin: '0px 0px -8% 0px' },
            )
            pending.forEach((el) => reveal?.observe(el))
          }, grid)
          revert = () => {
            reveal?.disconnect()
            ctx.revert()
          }
        })
      },
      { rootMargin: '0px 0px 30% 0px' },
    )
    io.observe(grid)

    return () => {
      cancelled = true
      io.disconnect()
      revert?.()
    }
  }, [reduced])

  return (
    // Placeholder height per column count (1/2/3). Too short, and the unrendered cards overflow
    // into the next section's box, which skews checks that read geometry (Lighthouse a11y).
    <section
      id="projects"
      aria-labelledby="projects-title"
      className="shell defer-render scroll-mt-20 py-24 [contain-intrinsic-size:auto_4300px] sm:py-32 md:[contain-intrinsic-size:auto_3200px] lg:[contain-intrinsic-size:auto_2400px]"
    >
      <SectionHeading index="02" kicker="projects" title="Featured systems." id="projects-title" bar={<ConsoleBar />} />
      <p className="-mt-4 mb-10 max-w-prose text-fg-dim sm:-mt-6 sm:mb-12">
        Each card runs its system's data path, including the failure it was built to handle.{' '}
        <span className="hidden [@media(hover:hover)_and_(pointer:fine)]:inline">Hover a card to trace it.</span>
      </p>

      <div ref={gridRef}>
        <ul className="grid gap-5">
          {spotlight.map((project) => (
            <li key={project.slug} data-reveal style={{ perspective: 1600 }}>
              <ProjectCard project={project} index={featured.indexOf(project)} />
            </li>
          ))}
        </ul>
        <ul className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {compact.map((project) => (
            <li key={project.slug} data-reveal style={{ perspective: 1200 }} className="md:last:col-span-2 lg:last:col-span-1">
              <ProjectCard project={project} index={featured.indexOf(project)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
