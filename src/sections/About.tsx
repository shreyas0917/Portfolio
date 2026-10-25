import { m } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { SectionHeading } from '../components/SectionHeading'
import { StatusDot } from '../components/StatusDot'
import { education } from '../data/education'
import { profile } from '../data/profile'
import type { Status } from '../data/projects'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { cn } from '../lib/cn'

const EASE = [0.16, 1, 0.3, 1] as const
const BAR: Record<Status, string> = { ok: 'bg-ok', warn: 'bg-warn', fail: 'bg-fail' }

// Readout values, derived from the data files.
const place = profile.location.split(',').map((s) => s.trim())
const degree = education.find((e) => e.primary) ?? education[0]
const ROWS: Array<{ key: string; value: string; live?: boolean }> = [
  { key: 'location', value: `${place[0]}, ${place[place.length - 1]}` },
  {
    key: 'education',
    value: `${degree.degree.replace('Bachelor of Engineering, ', 'B.E. ')} · ${degree.score.replace(/\s*\/\s*10$/, '')}`,
  },
  { key: 'focus', value: profile.about.focus.join(' · ') },
  { key: 'status', value: profile.availability.charAt(0).toLowerCase() + profile.availability.slice(1), live: true },
]
const COMMAND = 'whoami --status'

// Typing order: the command, then each row's value. PAUSE adds a beat before each row.
const PAUSE = 8
const STARTS = (() => {
  const starts: number[] = []
  let at = COMMAND.length + PAUSE
  for (const row of ROWS) {
    starts.push(at)
    at += row.value.length + PAUSE
  }
  return { rows: starts, total: at }
})()

/** Text typed so far, plus the rest kept invisible so the layout never shifts. */
function Typed({ text, shown }: { text: string; shown: number }) {
  const n = Math.max(0, Math.min(text.length, shown))
  return (
    <>
      {text.slice(0, n)}
      {n < text.length && <span className="invisible">{text.slice(n)}</span>}
    </>
  )
}

function Caret() {
  return <span className="ml-px inline-block h-[1.05em] w-[0.55em] translate-y-[2px] bg-accent animate-blink" />
}

/** A monitoring readout whose lines type in like terminal output when it scrolls into view. */
function StatusPanel() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const typed = reduced ? Infinity : count

  useEffect(() => {
    const el = ref.current
    if (reduced || !el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        setStarted(true)
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  useEffect(() => {
    if (!started) return
    let n = 0
    const id = window.setInterval(() => {
      n += 2
      setCount(n)
      if (n >= STARTS.total) window.clearInterval(id)
    }, 20)
    return () => window.clearInterval(id)
  }, [started])

  const done = typed >= STARTS.total
  const typingRow = ROWS.findIndex((row, i) => typed >= STARTS.rows[i] && typed < STARTS.rows[i] + row.value.length)

  return (
    <div ref={ref} className="overflow-hidden rounded-xl border border-line bg-bg-elev/80">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
        <span>
          node {profile.initials}-01 · status
        </span>
        <span className="flex items-center gap-1.5">
          <StatusDot live /> live
        </span>
      </div>

      {/* Screen readers get the readout as a plain list. */}
      <dl className="sr-only">
        {ROWS.map((row) => (
          <div key={row.key}>
            <dt>{row.key}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      <div aria-hidden="true" className="space-y-2.5 px-4 py-4 font-mono text-[12px] leading-relaxed sm:px-5 sm:py-5 sm:text-[13px]">
        <p className="text-fg-muted">
          <span className="text-accent">$</span> <Typed text={COMMAND} shown={typed} />
          {typed < COMMAND.length && <Caret />}
        </p>
        {ROWS.map((row, i) => {
          const shown = typed - STARTS.rows[i]
          return (
            <div key={row.key} className={cn('grid grid-cols-[5.75rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[6.5rem_minmax(0,1fr)]', shown < 0 && 'invisible')}>
              <span className="text-fg-muted">{row.key}</span>
              <span className={row.live ? 'text-ok' : 'text-fg'}>
                {row.live && <StatusDot live className="mr-2 translate-y-[-1px]" />}
                <Typed text={row.value} shown={shown} />
                {typingRow === i && <Caret />}
              </span>
            </div>
          )
        })}
        <p className={cn('text-fg-muted', !done && 'invisible')}>
          <span className="text-accent">$</span> <Caret />
        </p>
      </div>
    </div>
  )
}

export function About() {
  const reduced = useReducedMotion()
  return (
    <section id="about" aria-labelledby="about-title" className="shell defer-render scroll-mt-20 py-24 sm:py-32 [contain-intrinsic-size:auto_1200px]">
      <SectionHeading index="01" kicker="about" title="Engineering for the bad day." id="about-title" />
      <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <p className="max-w-prose text-lg leading-relaxed text-fg-dim">{profile.bio}</p>
        <StatusPanel />
      </div>

      <ul className="mt-14 grid gap-4 md:grid-cols-3" aria-label="Principles">
        {profile.about.principles.map((principle, i) => (
          <m.li
            key={principle.title}
            className="relative overflow-hidden rounded-xl border border-line bg-surface/60 p-5 sm:p-6"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
          >
            <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-px', BAR[principle.status])} />
            <p className="flex items-center justify-between font-mono text-[11px] text-fg-muted">
              <span>principle.{String(i + 1).padStart(2, '0')}</span>
              <StatusDot status={principle.status} />
            </p>
            <h3 className="mt-4 font-display text-xl font-semibold tracking-tight text-fg">{principle.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-dim">{principle.text}</p>
          </m.li>
        ))}
      </ul>
    </section>
  )
}
