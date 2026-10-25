import { m } from 'framer-motion'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Caveat } from '../components/Caveat'
import { CountUp } from '../components/CountUp'
import { Fillable, isPlaceholder } from '../components/Fillable'
import { Gallery } from '../components/Gallery'
import { ExternalIcon, GitHubIcon } from '../components/icons'
import { ScrollProgress } from '../components/ScrollProgress'
import { SectionIndex, type IndexEntry } from '../components/SectionIndex'
import { StatusDot } from '../components/StatusDot'
import { getProject, projects, type Project } from '../data/projects'
import { usePageMeta } from '../hooks/usePageMeta'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { cn } from '../lib/cn'
import { at } from '../lib/schedule'
import { notFoundMeta, projectMeta } from '../lib/seo'
import { hasSharedFor, landShared } from '../lib/sharedElement'
import { FlowDiagram } from '../visuals/FlowDiagram'

const EASE = [0.16, 1, 0.3, 1] as const
const pad = (n: number) => String(n).padStart(2, '0')
const METRIC_GRID: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3' }

export default function ProjectDetail() {
  const { slug } = useParams()
  const { pathname } = useLocation()
  const project = slug ? getProject(slug) : undefined
  if (!project) return <SystemNotFound name={slug ?? pathname.replace(/^\/+/, '')} />
  return <ProjectPage key={project.slug} project={project} />
}

/* ── Shared pieces ────────────────────────────────────────────────────── */

/** Back to the home page, at the spot in the Projects section the visitor left. */
function BackLink({ label = 'all systems', className }: { label?: string; className?: string }) {
  return (
    <Link
      to="/"
      state={{ restore: true }}
      className={cn('hit-area group inline-flex items-center gap-2 font-mono text-[12px] text-fg-muted transition-colors hover:text-fg', className)}
    >
      <span aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-x-0.5">
        ←
      </span>
      {label}
    </Link>
  )
}

interface DocSectionProps {
  id: string
  index: string
  kicker: string
  title: string
  action?: ReactNode
  children: ReactNode
}

function DocSection({ id, index, kicker, title, action, children }: DocSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 pt-16 sm:pt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label flex items-center gap-3">
            <span className="text-accent">{index}</span>
            <span className="h-px w-6 bg-line-strong" aria-hidden="true" />
            {kicker}
          </p>
          <h2 id={`${id}-title`} className="mt-3 font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Links({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {project.githubUrl ? (
        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" aria-label={`${project.title} on GitHub`} className="btn-ghost btn-sm">
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
        <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" aria-label={`${project.title}, live site`} className="btn-ghost btn-sm">
          Live <ExternalIcon />
        </a>
      )}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */

function ProjectPage({ project }: { project: Project }) {
  const index = projects.indexOf(project)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const chipRef = useRef<HTMLSpanElement>(null)
  // Arriving from a card: the title and chip fly in, so they skip their own intro.
  const [shared] = useState(() => hasSharedFor(project.slug))

  usePageMeta(projectMeta(project))
  useLayoutEffect(() => {
    landShared(project.slug, { title: titleRef.current, chip: chipRef.current })
  }, [project.slug])

  const entries = useMemo(() => {
    const list: IndexEntry[] = [{ id: 'overview', label: 'overview' }]
    if (project.metrics.length) list.push({ id: 'metrics', label: 'metrics' })
    list.push({ id: 'architecture', label: 'architecture' })
    if (project.problem || project.approach?.length) list.push({ id: 'approach', label: 'problem → approach' })
    if (project.decisions?.length) list.push({ id: 'decisions', label: 'decisions' })
    if (project.testing) list.push({ id: 'testing', label: 'testing & results' })
    list.push({ id: 'screenshots', label: 'screenshots' })
    if (project.learnings?.length || project.next?.length) list.push({ id: 'learnings', label: 'learnings & next' })
    return list
  }, [project])
  const num = (id: string) => pad(entries.findIndex((e) => e.id === id) + 1)

  return (
    <main className="pb-24 pt-24 sm:pt-28">
      <ScrollProgress status={project.signal} />
      <div className="shell lg:grid lg:grid-cols-[10.5rem_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[12rem_minmax(0,1fr)] xl:gap-20">
        <SectionIndex entries={entries} />
        <article className="min-w-0 max-w-[54rem]" aria-labelledby="project-title">
          <Header project={project} index={index} shared={shared} titleRef={titleRef} chipRef={chipRef} />
          {project.metrics.length > 0 && <Metrics project={project} num={num('metrics')} />}
          <Architecture project={project} num={num('architecture')} />
          {(project.problem || project.approach?.length) && <ProblemApproach project={project} num={num('approach')} />}
          {project.decisions?.length ? <Decisions project={project} num={num('decisions')} /> : null}
          {project.testing && <Testing project={project} num={num('testing')} />}
          <DocSection id="screenshots" index={num('screenshots')} kicker="screenshots" title="Screenshots">
            <Gallery shots={project.screenshots ?? []} title={project.title} />
          </DocSection>
          {(project.learnings?.length || project.next?.length) && <LearningsNext project={project} num={num('learnings')} />}
          <FooterNav project={project} />
        </article>
      </div>
    </main>
  )
}

/* ── 1. Header ────────────────────────────────────────────────────────── */

interface HeaderProps {
  project: Project
  index: number
  shared: boolean
  titleRef: RefObject<HTMLHeadingElement>
  chipRef: RefObject<HTMLSpanElement>
}

function Header({ project, index, shared, titleRef, chipRef }: HeaderProps) {
  return (
    <header id="overview" className="scroll-mt-28">
      <div className="intro intro-rise" style={at(0.05)}>
        <BackLink />
      </div>
      <p className="label intro intro-rise mt-10" style={at(0.1)}>
        {pad(index + 1)} · {project.category}
      </p>
      <h1
        id="project-title"
        ref={titleRef}
        className={cn(
          'mt-4 font-display text-[clamp(2.5rem,1.5rem+4vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.035em] text-fg',
          !shared && 'intro intro-rise',
        )}
        style={shared ? undefined : at(0.14)}
      >
        {project.title}
      </h1>
      <p className="intro intro-rise mt-4 max-w-2xl text-lg text-fg-dim sm:text-xl" style={at(0.22)}>
        {project.subtitle}
      </p>

      {/* The chip sits outside the intro wrappers: a moving parent would skew the shared-transition target. */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <span
          ref={chipRef}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/60 px-3 py-1 font-mono text-[12px] text-fg-dim',
            !shared && 'intro intro-rise',
          )}
          style={shared ? undefined : at(0.28)}
        >
          <StatusDot live /> running · {project.year}
        </span>
      </div>

      <ul className="intro intro-rise mt-6 flex flex-wrap gap-1.5" style={at(0.34)} aria-label="Tech stack">
        {project.stack.map((tech) => (
          <li key={tech} className="rounded border border-line bg-bg/40 px-2 py-0.5 font-mono text-[11px] text-fg-dim">
            {tech}
          </li>
        ))}
      </ul>
      <div className="intro intro-rise mt-6" style={at(0.4)}>
        <Links project={project} />
      </div>
    </header>
  )
}

/* ── 2. Metrics ───────────────────────────────────────────────────────── */

function Metrics({ project, num }: { project: Project; num: string }) {
  const measured = project.metrics.filter((metric) => !metric.unverified)
  const unverified = project.metrics.filter((metric) => metric.unverified)
  return (
    <DocSection id="metrics" index={num} kicker="metrics" title="Key results">
      {measured.length > 0 && (
        <dl className={cn('grid gap-px overflow-hidden rounded-xl border border-line bg-line', METRIC_GRID[measured.length])}>
          {measured.map((metric) => (
            <div key={metric.label} className="flex min-w-0 flex-col-reverse justify-end bg-bg-elev px-5 py-5 sm:px-6 sm:py-6">
              <dt className="mt-2.5 flex items-start gap-1.5 font-mono text-[11px] uppercase leading-tight tracking-[0.1em] text-fg-muted">
                <StatusDot status={metric.status} className="mt-px" />
                {metric.label}
              </dt>
              <dd className="font-display text-5xl font-semibold leading-none tracking-tight text-fg [font-variant-numeric:tabular-nums] sm:text-6xl">
                <CountUp value={metric.value} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {unverified.length > 0 && (
        <div className="mt-3 space-y-2">
          {unverified.map((metric) => (
            <Caveat key={metric.label} label={metric.label} className="text-[12px]">
              {metric.value}
            </Caveat>
          ))}
        </div>
      )}
    </DocSection>
  )
}

/* ── 3. Architecture ──────────────────────────────────────────────────── */

function Architecture({ project, num }: { project: Project; num: string }) {
  const reduced = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const [run, setRun] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)

  // Plays once when the diagram first scrolls into view.
  useEffect(() => {
    const el = panelRef.current
    if (reduced || !el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        setRun((r) => r || 1)
      },
      { threshold: 0.45 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  const node = selected === null ? null : project.flow.nodes[selected]
  const replay = !reduced && (
    <button
      type="button"
      onClick={() => setRun((r) => r + 1)}
      className="hit-area inline-flex items-center gap-2 rounded-md border border-line-strong bg-surface/60 px-3 py-2 font-mono text-[12px] text-fg-dim transition-colors hover:border-accent hover:text-fg"
    >
      <span aria-hidden="true" className="text-accent">
        $
      </span>
      replay --trace
      <span className="sr-only">(replay the data path animation)</span>
    </button>
  )

  return (
    <DocSection id="architecture" index={num} kicker="architecture" title="Architecture" action={replay}>
      <div ref={panelRef} className="overflow-hidden rounded-xl border border-line bg-bg/60">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
          <span>
            data path<span className="hidden sm:inline"> · {project.flow.nodes.length} components</span>
          </span>
          {reduced ? (
            <span>static view</span>
          ) : (
            <span>
              <span className="[@media(hover:hover)]:hidden">tap a node</span>
              <span className="hidden [@media(hover:hover)]:inline">hover or tap a node</span>
            </span>
          )}
        </div>
        <div className="px-3 py-5 sm:px-6 sm:py-7">
          <FlowDiagram flow={project.flow} size="lg" mode="once" run={run} selected={selected} onSelect={setSelected} />
        </div>
        <p aria-live="polite" className="flex min-h-[3.25rem] items-start gap-2 border-t border-line px-4 py-3 font-mono text-[12px] leading-relaxed">
          <span aria-hidden="true" className="text-accent">
            &gt;
          </span>
          {node ? (
            <span>
              <span className="text-fg">{node.label}</span>
              <span className="text-fg-muted"> · </span>
              <span className="text-fg-dim">
                <Fillable text={node.explain ?? '[to fill]'} />
              </span>
            </span>
          ) : (
            <span className="text-fg-muted">select a component to see what it does</span>
          )}
        </p>
        <p className="border-t border-line px-4 py-3 text-[13px] leading-snug text-fg-muted">{project.flow.caption}</p>
      </div>
    </DocSection>
  )
}

/* ── 4. Problem → approach ────────────────────────────────────────────── */

function ProblemApproach({ project, num }: { project: Project; num: string }) {
  const reduced = useReducedMotion()
  const steps = project.approach ?? []
  return (
    <DocSection id="approach" index={num} kicker="problem → approach" title="What breaks, and how it's handled">
      {project.problem && (
        <p className="max-w-3xl text-lg leading-relaxed text-fg-dim sm:text-xl">
          <Fillable text={project.problem} />
        </p>
      )}
      {steps.length > 0 && (
        <ol className="mt-10">
          {steps.map((step, i) => (
            <m.li
              key={step}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[2.5rem_minmax(0,1fr)]"
              initial={reduced ? false : { opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '0px 0px -12% 0px' }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <div className="flex flex-col items-center" aria-hidden="true">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line-strong bg-surface font-mono text-[12px] text-accent">
                  {pad(i + 1)}
                </span>
                {i < steps.length - 1 && <span className="w-px flex-1 bg-gradient-to-b from-line-strong to-line" />}
              </div>
              <p className={cn('pt-1.5 leading-relaxed text-fg-dim', i < steps.length - 1 && 'pb-8')}>
                <span className="sr-only">Step {i + 1}: </span>
                <Fillable text={step} />
              </p>
            </m.li>
          ))}
        </ol>
      )}
    </DocSection>
  )
}

/* ── 5. Decisions ─────────────────────────────────────────────────────── */

function Decisions({ project, num }: { project: Project; num: string }) {
  const rows = (d: NonNullable<Project['decisions']>[number]) => [
    { term: 'choice', text: d.choice, termClass: 'text-accent', textClass: 'font-medium text-fg' },
    { term: 'why', text: d.why, termClass: 'text-fg-muted', textClass: 'text-fg-dim' },
    { term: 'tradeoff', text: d.tradeoff, termClass: 'text-warn', textClass: 'text-fg-dim' },
  ]
  return (
    <DocSection id="decisions" index={num} kicker="decisions" title="Engineering decisions">
      <ol className="space-y-4">
        {project.decisions?.map((decision, i) => (
          <li key={decision.choice} className="overflow-hidden rounded-xl border border-line bg-surface/60">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg/40 px-4 py-2 font-mono text-[11px] text-fg-muted">
              <span>
                <span className="text-accent">decision.{pad(i + 1)}</span> · {project.slug}
              </span>
              <span className="flex items-center gap-1.5">
                <StatusDot /> adopted
              </span>
            </div>
            <dl className="grid gap-x-6 px-4 py-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-y-3 sm:px-5 sm:py-5">
              {rows(decision).map((row, r) => (
                <div key={row.term} className="contents">
                  <dt className={cn('font-mono text-[11px] uppercase tracking-[0.12em] sm:mt-0 sm:pt-[3px]', r > 0 && 'mt-3', row.termClass)}>
                    {row.term}
                  </dt>
                  <dd className={cn('mt-1 leading-relaxed sm:mt-0', row.textClass)}>
                    <Fillable text={row.text} />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
    </DocSection>
  )
}

/* ── 6. Testing ───────────────────────────────────────────────────────── */

function Testing({ project, num }: { project: Project; num: string }) {
  const checks = project.testing?.checks ?? []
  // Unverified figures are always repeated here as caveats.
  const caveats = [...(project.testing?.caveats ?? []), ...project.metrics.filter((m) => m.unverified).map((m) => m.value)]
  return (
    <DocSection id="testing" index={num} kicker="testing" title="Testing & results">
      <ul className="space-y-3">
        {checks.map((check) => (
          <li key={check} className="flex gap-3 leading-relaxed text-fg-dim">
            {isPlaceholder(check) ? (
              <span aria-hidden="true" className="mt-[9px] h-2 w-2 shrink-0 rounded-full border border-dashed border-fg-muted" />
            ) : (
              <StatusDot className="mt-[9px]" />
            )}
            <span>
              <Fillable text={check} />
            </span>
          </li>
        ))}
      </ul>
      {caveats.length > 0 && (
        <div className="mt-7">
          <p className="label">caveats</p>
          <div className="mt-3 space-y-2">
            {caveats.map((caveat) => (
              <Caveat key={caveat} className="text-[12px]">
                <Fillable text={caveat} />
              </Caveat>
            ))}
          </div>
        </div>
      )}
    </DocSection>
  )
}

/* ── 8. Learnings & next ──────────────────────────────────────────────── */

function ListPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface/60">
      <p className="border-b border-line px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted">{title}</p>
      <ul className="space-y-2.5 px-4 py-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-fg-dim">
            <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-accent" />
            <span>
              <Fillable text={item} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LearningsNext({ project, num }: { project: Project; num: string }) {
  return (
    <DocSection id="learnings" index={num} kicker="learnings & next" title="What I learned, what's next">
      <div className="grid gap-4 sm:grid-cols-2">
        {project.learnings?.length ? <ListPanel title="learned" items={project.learnings} /> : null}
        {project.next?.length ? <ListPanel title="next" items={project.next} /> : null}
      </div>
    </DocSection>
  )
}

/* ── 9. Footer navigation ─────────────────────────────────────────────── */

function NavCard({ project, direction }: { project: Project; direction: 'previous' | 'next' }) {
  const label = direction === 'previous' ? '← previous' : 'next →'
  return (
    <Link
      to={`/projects/${project.slug}`}
      data-shared-root={project.slug}
      data-signal={project.signal}
      data-cursor-label="open"
      className="project-card group relative block rounded-xl border border-line bg-surface/60 p-5"
    >
      <span className={cn('flex items-center justify-between gap-3 font-mono text-[11px] text-fg-muted', direction === 'next' && 'flex-row-reverse')}>
        <span>{label}</span>
        <span data-shared="chip" className="flex items-center gap-1.5">
          <StatusDot /> {project.year}
        </span>
      </span>
      <span data-shared="title" className={cn('mt-3 block font-display text-xl font-semibold tracking-tight text-fg transition-colors group-hover:text-accent', direction === 'next' && 'sm:text-right')}>
        {project.title}
      </span>
      <span className={cn('mt-1 block text-sm text-fg-muted', direction === 'next' && 'sm:text-right')}>{project.subtitle}</span>
    </Link>
  )
}

function FooterNav({ project }: { project: Project }) {
  const i = projects.indexOf(project)
  const prev = projects[(i - 1 + projects.length) % projects.length]
  const next = projects[(i + 1) % projects.length]
  return (
    <nav aria-label="More projects" className="mt-20 border-t border-line pt-10">
      <div className="grid gap-4 sm:grid-cols-2">
        <NavCard project={prev} direction="previous" />
        <NavCard project={next} direction="next" />
      </div>
      <BackLink label="back to all projects" className="mt-8" />
    </nav>
  )
}

/* ── 404 ──────────────────────────────────────────────────────────────── */

function SystemNotFound({ name }: { name: string }) {
  const unit = name || 'unknown'
  const { pathname } = useLocation()
  usePageMeta(notFoundMeta(pathname, unit))
  return (
    // Full height, matching the loading placeholder, so the footer doesn't move once the page renders.
    <main className="shell flex min-h-screen items-center pb-16 pt-28">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-fail/40 bg-surface/70">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2 font-mono text-[11px] text-fg-muted">
          <StatusDot status="fail" /> stderr
        </div>
        <div className="space-y-2 p-5 font-mono text-[13px] sm:p-7">
          <p className="text-fg-muted [overflow-wrap:anywhere]">
            <span className="text-accent">$</span> systemctl status {unit}
          </p>
          <p className="text-fail [overflow-wrap:anywhere]">× Unit {unit}.service could not be found.</p>
          <h1 className="pt-4 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">404 · system not found</h1>
          <p className="pt-2 text-fg-dim">Known systems:</p>
          <ul className="space-y-1">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link
                  to={`/projects/${p.slug}`}
                  className="text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent"
                >
                  {p.slug}
                </Link>
                <span className="text-fg-muted"> · {p.title}</span>
              </li>
            ))}
          </ul>
          <div className="pt-5">
            <BackLink label="back to all systems" />
          </div>
        </div>
      </div>
    </main>
  )
}
