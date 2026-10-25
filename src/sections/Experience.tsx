import { useEffect, useRef } from 'react'
import { SectionHeading } from '../components/SectionHeading'
import { StatusDot } from '../components/StatusDot'
import { experience } from '../data/experience'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { cn } from '../lib/cn'
import { scrollLinked } from '../lib/scrollLinked'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/*
  A deployment log on a vertical timeline. As you scroll, the line draws down
  (scrubbed, lib/scrollLinked) and each entry's node lights green when the
  line's tip reaches it. The tip sits on a fixed line in the viewport (LINE,
  65% down), so line and nodes stay in sync. Reduced motion: drawn and lit
  from the start.
*/
const LINE = 0.65

export function Experience() {
  const reduced = useReducedMotion()
  const listRef = useRef<HTMLOListElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const list = listRef.current
    const line = lineRef.current
    if (reduced || !list || !line) return
    const nodes = [...list.querySelectorAll<HTMLElement>('[data-node]')]
    const stop = scrollLinked(
      list,
      () => {
        // Line: 0 when the list's top reaches LINE, 1 when its bottom does.
        // Nodes light (instantly, not eased) once their top passes LINE.
        const at = window.innerHeight * LINE
        const r = list.getBoundingClientRect()
        const lit = nodes.map((node) => node.getBoundingClientRect().top <= at)
        nodes.forEach((node, i) => node.toggleAttribute('data-lit', lit[i]))
        return (at - r.top) / r.height
      },
      (p) => {
        line.style.transform = `scaleY(${p})`
      },
      { lag: 0.4 },
    )
    return () => {
      stop()
      line.style.removeProperty('transform')
      nodes.forEach((node) => node.removeAttribute('data-lit'))
    }
  }, [reduced])

  return (
    <section id="experience" aria-labelledby="experience-title" className="shell defer-render scroll-mt-20 py-24 sm:py-32 [contain-intrinsic-size:auto_1000px]">
      <SectionHeading index="04" kicker="experience" title="Timeline." id="experience-title" />

      <ol ref={listRef} className="relative">
        {/* Track, and the progress line drawn over it. */}
        <span aria-hidden="true" className="absolute bottom-3 left-[7px] top-3 w-px bg-line" />
        <span
          ref={lineRef}
          aria-hidden="true"
          className={cn('absolute bottom-3 left-[7px] top-3 w-px origin-top bg-ok', reduced ? 'scale-y-100' : 'scale-y-0')}
        />

        {experience.map((entry, i) => {
          const current = /present/i.test(entry.period)
          return (
            <li key={`${entry.company}-${entry.period}`} className="relative pb-10 pl-9 last:pb-0 sm:pl-12">
              <span
                data-node
                {...(reduced ? { 'data-lit': '' } : {})}
                aria-hidden="true"
                className="absolute left-0 top-[13px] h-[15px] w-[15px] rounded-full border border-line-strong bg-bg transition-[background-color,border-color,box-shadow] duration-500 data-[lit]:border-ok data-[lit]:bg-ok data-[lit]:shadow-[0_0_0_5px_rgb(var(--ok)/0.15)]"
              />
              <article className="overflow-hidden rounded-xl border border-line bg-surface/60">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg/40 px-4 py-2 font-mono text-[11px] text-fg-muted">
                  <span>
                    <span className="text-accent">deploy #{experience.length - i}</span> · {slug(entry.company)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <StatusDot live={current} /> {current ? 'running' : 'completed'}
                  </span>
                </header>

                <div className="p-4 sm:p-6">
                  <p className="font-mono text-[12px] text-fg-muted">
                    {entry.period} · {entry.location}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-fg sm:text-2xl">{entry.role}</h3>
                  <p className="mt-1 text-fg-dim">{entry.company}</p>

                  <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Stack">
                    {entry.stack.map((tech) => (
                      <li key={tech} className="rounded border border-line bg-bg/40 px-2 py-0.5 font-mono text-[11px] text-fg-dim">
                        {tech}
                      </li>
                    ))}
                  </ul>

                  <ul className="mt-5 space-y-3">
                    {entry.highlights.map((highlight) => (
                      <li key={highlight} className="flex gap-3 text-sm leading-relaxed text-fg-dim sm:text-[15px]">
                        <span aria-hidden="true" className="mt-px font-mono text-[12px] text-ok">
                          ✓
                        </span>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
