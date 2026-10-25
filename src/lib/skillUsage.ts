import { experience } from '../data/experience'
import { projects } from '../data/projects'
import type { Evidence, Skill } from '../data/skills'

/** Where a skill is used: a project page, or a role in the Experience section. */
export type Usage = { kind: 'project'; slug: string; title: string } | { kind: 'experience'; title: string }

// Each source's searchable text, built once from the data files.
const sources: Array<{ usage: Usage; text: string }> = [
  ...projects.map((p) => ({
    usage: { kind: 'project' as const, slug: p.slug, title: p.title },
    text: [
      p.title,
      p.subtitle,
      p.summary,
      ...p.stack,
      ...p.highlights,
      ...(p.approach ?? []),
      ...(p.decisions ?? []).flatMap((d) => [d.choice, d.why, d.tradeoff]),
      ...p.flow.nodes.flatMap((n) => [n.label, n.detail ?? '', n.explain ?? '']),
    ].join('\n'),
  })),
  ...experience.map((e) => ({
    usage: { kind: 'experience' as const, title: e.company },
    text: [e.company, e.role, ...e.stack, ...e.highlights].join('\n'),
  })),
]

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Whole-word, case-insensitive; a trailing "*" matches a prefix. */
function termPattern(term: string) {
  const prefix = term.endsWith('*')
  const body = escapeRegExp(prefix ? term.slice(0, -1) : term)
  return new RegExp(`(^|[^\\w])${body}${prefix ? '' : '(?!\\w)'}`, 'i')
}

const cache = new Map<string, Usage[]>()

/** Projects and roles that mention this skill, in data order. */
export function usageFor(skill: Skill): Usage[] {
  const hit = cache.get(skill.name)
  if (hit) return hit
  const patterns = (skill.match ?? [skill.name]).map(termPattern)
  const result = sources.filter((s) => patterns.some((re) => re.test(s.text))).map((s) => s.usage)
  cache.set(skill.name, result)
  return result
}

/**
 * How a skill is backed. A mention in a project or role always wins, so a skill
 * shows as "used in projects" exactly when there are projects to list.
 */
export function evidenceFor(skill: Skill): Evidence {
  if (usageFor(skill).length > 0) return 'projects'
  if (!skill.evidence && import.meta.env.DEV) console.warn(`skills.ts: "${skill.name}" is in no project or role; give it an evidence level.`)
  return skill.evidence ?? 'practice'
}

const DEFAULT_NOTE: Record<Exclude<Evidence, 'projects'>, string> = {
  site: 'Used to build this site.',
  practice: 'hands-on practice · not yet in a featured project',
}

/** What a selected chip says when there are no projects to list. */
export function evidenceNote(skill: Skill): string {
  const evidence = evidenceFor(skill)
  return skill.note ?? (evidence === 'projects' ? '' : DEFAULT_NOTE[evidence])
}
