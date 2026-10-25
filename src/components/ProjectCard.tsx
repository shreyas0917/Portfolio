import { m, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect, useRef, useState, type FocusEvent, type MouseEvent, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '../data/projects'
import { FINE_POINTER, useMediaQuery } from '../hooks/useMediaQuery'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { cn } from '../lib/cn'
import { FlowDiagram } from '../visuals/FlowDiagram'
import { CountUp } from './CountUp'
import { ArrowIcon, ExternalIcon, GitHubIcon } from './icons'
import { StatusDot } from './StatusDot'

const SPRING = { stiffness: 170, damping: 22, mass: 0.6 }
// Below 360px a third of the card is narrower than a label word like "SCENARIOS", so three metrics stack.
const METRIC_COLS = ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3 max-[359px]:grid-cols-1'] as const

interface ProjectCardProps {
  project: Project
  /** Position in the section, shown as "01", "02", ... */
  index: number
}

/**
 * A project as a console panel: live architecture flow, count-up metrics,
 * highlights, stack and links. Spotlight projects get a two-column card.
 * Desktop: subtle tilt plus a border glow in the project's status colour that
 * follows the pointer; hovering (or tabbing into) the card runs the flow.
 * Touch: the flow runs while it's on screen.
 */
export function ProjectCard({ project, index }: ProjectCardProps) {
  const { spotlight } = project
  const flowRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const fine = useMediaQuery(FINE_POINTER)
  const tilt = fine && !reduced
  const [engaged, setEngaged] = useState(false)
  const [onScreen, setOnScreen] = useState(false)

  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const maxTilt = spotlight ? 2 : 3.5
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-maxTilt, maxTilt]), SPRING)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [maxTilt, -maxTilt]), SPRING)

  // Touch devices have no hover: run the flow while the diagram is visible.
  useEffect(() => {
    const el = flowRef.current
    if (fine || !el) return
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [fine])

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    e.currentTarget.style.setProperty('--mx', `${x}px`)
    e.currentTarget.style.setProperty('--my', `${y}px`)
    if (tilt) {
      px.set(x / r.width - 0.5)
      py.set(y / r.height - 0.5)
    }
  }
  const onPointerEnter = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') setEngaged(true)
  }
  const onPointerLeave = () => {
    px.set(0)
    py.set(0)
    setEngaged(false)
  }
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEngaged(false)
  }
  // Desktop: the whole card opens the project (the cursor reads "open"). Its own
  // links and buttons keep their actions, and a click that ends a text selection
  // doesn't navigate. Goes through the title link, so the shared-title transition
  // and scroll memory work as for any project link. Keyboard users have the links.
  const titleLinkRef = useRef<HTMLAnchorElement>(null)
  const onClick = (e: MouseEvent<HTMLElement>) => {
    if (!fine || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (e.target instanceof Element && e.target.closest('a, button, input, textarea, select, [role="button"]')) return
    if (!(window.getSelection()?.isCollapsed ?? true)) return
    titleLinkRef.current?.click()
  }

  const active = fine ? engaged : onScreen
  const measured = project.metrics.filter((metric) => !metric.unverified)
  const caveats = project.metrics.filter((metric) => metric.unverified)
  const highlights = project.highlights.slice(0, spotlight ? 3 : 2)
  const chips = spotlight ? project.stack : project.stack.slice(0, 5)
  const hiddenChips = project.stack.length - chips.length
  const titleId = `${project.slug}-title`
  const status = reduced ? 'static' : active ? 'tracing' : fine ? 'hover to trace' : 'idle'

  return (
    <m.article
      data-signal={project.signal}
      // Title and year chip carry into the project page header (lib/sharedElement).
      data-shared-root={project.slug}
      data-cursor-label={fine ? 'open' : undefined}
      aria-labelledby={titleId}
      className={cn('project-card relative h-full rounded-xl border border-line bg-surface/70', fine && 'cursor-pointer')}
      style={tilt ? { rotateX, rotateY } : undefined}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onFocus={() => setEngaged(true)}
      onBlur={onBlur}
      onClick={onClick}
    >
      <span aria-hidden="true" className="card-glow" />

      <div
        className={cn(
          'relative h-full p-5 sm:p-7',
          spotlight
            ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-x-10'
            : 'flex flex-col gap-5',
        )}
      >
        {/* Head */}
        <header className={cn(spotlight && 'lg:col-start-1 lg:row-start-1')}>
          <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-fg-muted">
            <span>
              {String(index + 1).padStart(2, '0')} · {project.category}
            </span>
            {/* fg-dim: muted 11px text measured just under 4.5:1 on the card surface. */}
            <span data-shared="chip" className="flex items-center gap-1.5 text-fg-dim">
              <StatusDot /> {project.year}
            </span>
          </div>
          <h3
            id={titleId}
            data-shared="title"
            className={cn(
              'mt-4 font-display font-semibold tracking-tight text-fg',
              spotlight ? 'text-3xl sm:text-4xl' : 'text-2xl',
            )}
          >
            <Link ref={titleLinkRef} to={`/projects/${project.slug}`} className="transition-colors hover:text-accent">
              {project.title}
            </Link>
          </h3>
          <p className="mt-1.5 text-fg-dim">{project.subtitle}</p>
        </header>

        {/* Visual: live data path + metrics */}
        <div className={cn('flex flex-col gap-4', spotlight && 'lg:col-start-2 lg:row-span-2 lg:row-start-1')}>
          <div ref={flowRef} className="rounded-lg border border-line bg-bg/60">
            <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
              <span>data path</span>
              <span className="flex items-center gap-1.5" aria-hidden="true">
                {active && !reduced && <StatusDot live status={project.signal} />}
                {status}
              </span>
            </div>
            <div className="px-3 pb-2 pt-3">
              <FlowDiagram flow={project.flow} active={active} mode={fine ? 'hover' : 'view'} />
            </div>
            <p className="border-t border-line px-3 py-2 text-[12px] leading-snug text-fg-muted">{project.flow.caption}</p>
          </div>

          {measured.length > 0 && (
            <dl className={cn('grid gap-px overflow-hidden rounded-lg border border-line bg-line', METRIC_COLS[measured.length])}>
              {measured.map((metric) => (
                <div key={metric.label} className="flex min-w-0 flex-col-reverse justify-end bg-bg-elev px-3 py-3 sm:px-3.5">
                  <dt className="mt-1.5 flex items-start gap-1.5 font-mono text-[10px] uppercase leading-tight tracking-[0.1em] text-fg-muted">
                    <StatusDot status={metric.status} className="mt-px" />
                    {metric.label}
                  </dt>
                  <dd
                    className={cn(
                      'font-display font-semibold leading-none tracking-tight text-fg [font-variant-numeric:tabular-nums]',
                      // Three columns at 360px: keep "12/12" inside its cell.
                      spotlight ? 'text-[1.6rem] sm:text-4xl' : 'text-[1.6rem] sm:text-3xl',
                    )}
                  >
                    <CountUp value={metric.value} />
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {/* Unverified figures: verbatim, flagged, never styled as a result. */}
          {caveats.map((metric) => (
            <p
              key={metric.label}
              className="flex items-start gap-2 rounded-lg border border-dashed border-warn/50 bg-warn/5 px-3 py-2.5 font-mono text-[11px] leading-snug text-warn"
            >
              <StatusDot status="warn" className="mt-1" />
              <span>
                <span className="sr-only">Unverified estimate, {metric.label}: </span>
                {metric.value}
              </span>
            </p>
          ))}
        </div>

        {/* Body: highlights, stack, links */}
        <div className={cn('flex flex-1 flex-col gap-5', spotlight && 'lg:col-start-1 lg:row-start-2')}>
          <ul className="space-y-2.5">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex gap-3 text-sm leading-relaxed text-fg-dim">
                <span className="mt-2.5 h-px w-3 shrink-0 bg-accent" aria-hidden="true" />
                {highlight}
              </li>
            ))}
          </ul>

          <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack">
            {chips.map((tech) => (
              <li key={tech} className="rounded border border-line bg-bg/40 px-2 py-0.5 font-mono text-[11px] text-fg-dim">
                {tech}
              </li>
            ))}
            {hiddenChips > 0 && <li className="px-1 py-0.5 font-mono text-[11px] text-fg-muted">+{hiddenChips}</li>}
          </ul>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <Link
              to={`/projects/${project.slug}`}
              aria-label={`View details: ${project.title}`}
              className="btn-ghost btn-sm group/btn border-accent/40 text-accent hover:bg-accent/10"
            >
              View Details
              <ArrowIcon className="transition-transform duration-300 group-hover/btn:translate-x-0.5" />
            </Link>
            {project.githubUrl ? (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${project.title} on GitHub`}
                className="btn-ghost btn-sm"
              >
                <GitHubIcon width={14} height={14} /> GitHub
              </a>
            ) : (
              // opacity-60, not 50: at 50% the label fell to 3.4:1 contrast in the light theme.
              <span className="btn-ghost btn-sm cursor-not-allowed opacity-60" title="Repository link not yet published">
                <GitHubIcon width={14} height={14} /> GitHub
                <span className="sr-only">(link not yet published)</span>
              </span>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${project.title}, live site`}
                className="btn-ghost btn-sm"
              >
                Live <ExternalIcon />
              </a>
            )}
          </div>
        </div>
      </div>
    </m.article>
  )
}
