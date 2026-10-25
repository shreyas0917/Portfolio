import { m } from 'framer-motion'
import { CountUp } from '../components/CountUp'
import { SectionHeading } from '../components/SectionHeading'
import { education } from '../data/education'
import { useReducedMotion } from '../hooks/useReducedMotion'

const EASE = [0.16, 1, 0.3, 1] as const

/*
  Styled as a records registry rather than a timeline, so it reads as distinct
  from Experience: the degree is a large panel with its CGPA as a prominent
  monospace badge (counting up), school results are compact rows beside it.
*/
export function Education() {
  const reduced = useReducedMotion()
  const primary = education.filter((e) => e.primary)
  const others = education.filter((e) => !e.primary)
  const reveal = (i: number) => ({
    initial: reduced ? false : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '0px 0px -8% 0px' },
    transition: { duration: 0.6, ease: EASE, delay: i * 0.08 },
  })

  return (
    <section id="education" aria-labelledby="education-title" className="shell defer-render scroll-mt-20 py-24 sm:py-32 [contain-intrinsic-size:auto_800px]">
      <SectionHeading index="05" kicker="education" title="Education." id="education-title" />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {primary.map((entry) => (
          <m.article key={entry.school} {...reveal(0)} className="relative overflow-hidden rounded-xl border border-line-strong bg-surface/70">
            <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-70 [mask-image:radial-gradient(ellipse_80%_80%_at_100%_0%,#000,transparent_70%)]" />
            <div className="relative flex items-center justify-between gap-3 border-b border-line px-5 py-2 font-mono text-[11px] text-fg-muted">
              <span>
                <span className="text-accent">record.01</span> · degree
              </span>
              <span>{entry.period}</span>
            </div>
            <div className="relative p-5 sm:p-7">
              <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight text-fg sm:text-3xl">{entry.degree}</h3>
              <p className="mt-2 text-fg-dim">{entry.school}</p>
              <p className="mt-7 inline-flex flex-col gap-1 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 font-mono sm:flex-row sm:items-baseline sm:gap-3">
                <span className="text-[11px] uppercase tracking-[0.14em] text-fg-muted">score</span>
                <span className="whitespace-nowrap text-2xl font-semibold text-fg [font-variant-numeric:tabular-nums] sm:text-3xl">
                  <CountUp value={entry.score} />
                </span>
              </p>
            </div>
          </m.article>
        ))}

        <ul className="grid content-start gap-4">
          {others.map((entry, i) => (
            <m.li key={entry.school} {...reveal(i + 1)} className="overflow-hidden rounded-xl border border-line bg-surface/50">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 font-mono text-[11px] text-fg-muted">
                <span>
                  <span className="text-accent">record.{String(i + 2).padStart(2, '0')}</span> · {entry.period}
                </span>
                <span className="rounded border border-line-strong bg-bg/40 px-2 py-0.5 text-[12px] text-fg [font-variant-numeric:tabular-nums]">
                  {entry.score}
                </span>
              </div>
              <div className="px-4 py-3">
                <h3 className="font-medium text-fg">{entry.degree}</h3>
                <p className="mt-0.5 text-sm text-fg-muted">{entry.school}</p>
              </div>
            </m.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
