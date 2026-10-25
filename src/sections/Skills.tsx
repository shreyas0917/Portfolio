import { m } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionHeading } from '../components/SectionHeading'
import { skillGroups, type Evidence, type Skill } from '../data/skills'
import { useSmoothScroll } from '../hooks/useLenis'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { cn } from '../lib/cn'
import { evidenceFor, evidenceNote, usageFor } from '../lib/skillUsage'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Chip border per evidence level: solid (used in projects), dashed (this site),
 * dotted plus a "lab" tag (hands-on practice). The legend under the grid uses the same styles.
 */
const BORDER: Record<Evidence, string> = { projects: '', site: 'border-dashed', practice: 'border-dotted' }
const SR_EVIDENCE: Record<Evidence, string> = { projects: '', site: ', this site', practice: ', hands-on practice' }

function LabTag() {
  return (
    <span aria-hidden="true" className="relative -top-px ml-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-muted">
      lab
    </span>
  )
}

/** Where the selected skill is used: linked project pages and roles, or why it has none. */
function UsedIn({ skill }: { skill: Skill }) {
  const { scrollTo } = useSmoothScroll()
  const usage = usageFor(skill)
  if (usage.length === 0) return <span className="text-fg-muted">{evidenceNote(skill)}</span>
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span className="text-fg-muted">used in →</span>
      {usage.map((u, i) => (
        <span key={u.kind === 'project' ? u.slug : u.title} className="inline-flex items-center gap-1.5">
          {u.kind === 'project' ? (
            <Link to={`/projects/${u.slug}`} className="text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent">
              {u.title}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => scrollTo('#experience')}
              className="text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent"
            >
              {u.title} <span className="text-fg-muted">(experience)</span>
            </button>
          )}
          {i < usage.length - 1 && <span className="text-fg-muted">·</span>}
        </span>
      ))}
    </span>
  )
}

export function Skills() {
  const reduced = useReducedMotion()
  // One selection for the whole section. It persists after the pointer leaves,
  // so the footer's links stay reachable.
  const [selected, setSelected] = useState<{ group: string; skill: Skill } | null>(null)

  return (
    // Placeholder height per column count (1/2/3), as in Projects.
    <section
      id="skills"
      aria-labelledby="skills-title"
      className="shell defer-render scroll-mt-20 py-24 [contain-intrinsic-size:auto_2600px] sm:py-32 sm:[contain-intrinsic-size:auto_1800px] lg:[contain-intrinsic-size:auto_1400px]"
    >
      <SectionHeading index="03" kicker="skills" title="The toolchain." id="skills-title" />
      <p className="-mt-4 mb-10 max-w-prose text-fg-dim sm:-mt-6 sm:mb-12">
        What my projects, work and this site use, plus what I practise hands-on. Select a skill to trace where it runs.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skillGroups.map((group, i) => {
          const active = selected?.group === group.id ? selected.skill : null
          return (
            <m.div
              key={group.id}
              role="group"
              aria-labelledby={`skills-${group.id}`}
              // Subgrid: each panel's header, chips and readout are rows of the outer grid, so
              // panels in the same row share one readout height and their dividers line up.
              className={cn(
                'row-span-3 grid grid-rows-subgrid gap-0 overflow-hidden rounded-xl border border-line bg-surface/60',
                group.wide && 'sm:col-span-2 lg:col-span-1',
              )}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -8% 0px' }}
              transition={{ duration: 0.6, ease: EASE, delay: (i % 3) * 0.08 }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 font-mono text-[11px] text-fg-muted">
                <h3 id={`skills-${group.id}`} className="text-fg-dim">
                  <span className="text-accent">//</span> {group.title.toLowerCase()}
                </h3>
                <span>[{group.skills.length}]</span>
              </div>

              <ul className="flex flex-1 flex-wrap content-start gap-1.5 p-4">
                {group.skills.map((skill) => {
                  const isActive = active?.name === skill.name
                  const evidence = evidenceFor(skill)
                  return (
                    <li key={skill.name}>
                      <button
                        type="button"
                        aria-pressed={isActive}
                        onPointerEnter={(e) => e.pointerType === 'mouse' && setSelected({ group: group.id, skill })}
                        onFocus={() => setSelected({ group: group.id, skill })}
                        onClick={() => setSelected({ group: group.id, skill })}
                        className={cn(
                          'rounded border px-2 py-1 text-left font-mono text-[12px] leading-snug transition-colors',
                          BORDER[evidence],
                          isActive
                            ? 'border-accent bg-accent/10 text-fg'
                            : cn('bg-bg/40 text-fg-dim hover:border-line-strong hover:text-fg', evidence === 'practice' ? 'border-line-strong' : 'border-line'),
                        )}
                      >
                        {skill.name}
                        {evidence === 'practice' && <LabTag />}
                        {SR_EVIDENCE[evidence] && <span className="sr-only">{SR_EVIDENCE[evidence]}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>

              <p aria-live="polite" className="grid min-h-[3.75rem] border-t border-line bg-bg/40 px-4 py-3 font-mono text-[11px] leading-relaxed">
                {/* Keyed by skill: each selection renders fresh nodes. Reusing them would slide the
                    links sideways as their text changes, a layout shift (hover isn't counted as input). */}
                <span className="[grid-area:1/1]">
                  {active ? <UsedIn key={active.name} skill={active} /> : <span className="text-fg-muted">→ select a skill to see where it's used</span>}
                </span>
                {/* Every readout this panel can show, laid out invisibly in the same cell: the panel
                    is always as tall as its longest one, so selecting a chip never moves anything. */}
                {group.skills.map((skill) => (
                  <span key={skill.name} aria-hidden="true" className="invisible [grid-area:1/1]">
                    <UsedIn skill={skill} />
                  </span>
                ))}
              </p>
            </m.div>
          )
        })}
      </div>

      {/* What the chip borders mean. Swatches use the same border styles as the chips. */}
      <ul aria-label="Chip styles" className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 font-mono text-[11px] text-fg-muted">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3.5 w-6 rounded-[3px] border border-line-strong bg-bg/40" />
          <span>
            <span className="text-fg-dim">used in projects</span> · select one to see which
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3.5 w-6 rounded-[3px] border border-dashed border-line-strong bg-bg/40" />
          <span>
            <span className="text-fg-dim">this site</span> · used to build or ship this portfolio
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-flex h-3.5 items-center rounded-[3px] border border-dotted border-line-strong bg-bg/40 px-1 text-[8px] uppercase leading-none tracking-[0.12em]">
            lab
          </span>
          <span>
            <span className="text-fg-dim">hands-on practice</span> · not yet in a featured project
          </span>
        </li>
      </ul>
    </section>
  )
}
