import { education } from '../data/education'
import { profile } from '../data/profile'
import type { Project } from '../data/projects'
import { SITE_URL } from '../data/site'
import { skillGroups } from '../data/skills'

/*
  Page metadata, computed one way for both sides:
  - at build time (vite.config.ts) to write each route's HTML <head>, which
    link-preview crawlers read without running JavaScript;
  - at runtime (usePageMeta) to keep the tags right during client navigation.
  Pure module: no DOM, no Node APIs.
*/

export interface PageMeta {
  path: string
  title: string
  description: string
  /** Site-relative path of the Open Graph image. */
  image: string
  imageAlt: string
  type: 'website' | 'article'
  noindex?: boolean
}

export const OG_SIZE = { width: 1200, height: 630 } as const

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`
export const ogImagePath = (key: string) => `/og/${key}.png`

export function homeMeta(): PageMeta {
  return {
    path: '/',
    title: `${profile.name} — ${profile.title}`,
    description: `${profile.name}, ${profile.title}. ${profile.tagline}`,
    image: ogImagePath('home'),
    imageAlt: `${profile.name}, ${profile.title}: ${profile.tagline}`,
    type: 'website',
  }
}

export function projectMeta(p: Project): PageMeta {
  return {
    path: `/projects/${p.slug}`,
    title: `${p.title}: ${p.subtitle} — ${profile.name}`,
    description: p.summary,
    image: ogImagePath(p.slug),
    imageAlt: `${p.title}: ${p.subtitle}`,
    type: 'article',
  }
}

/** Unknown routes: kept out of search results. */
export function notFoundMeta(path: string, unit: string): PageMeta {
  return {
    ...homeMeta(),
    path,
    title: `404 · system not found — ${profile.name}`,
    description: `No system named "${unit}".`,
    noindex: true,
  }
}

/** schema.org Person, for search engines. */
export function personJsonLd() {
  const degree = education.find((e) => e.primary)
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.title,
    url: `${SITE_URL}/`,
    email: `mailto:${profile.email}`,
    sameAs: [profile.github, profile.linkedin],
    ...(degree && { alumniOf: { '@type': 'CollegeOrUniversity', name: degree.school.split(', ')[0] } }),
    // Every skill listed on the site (skills.ts), once each.
    knowsAbout: [...new Set(skillGroups.flatMap((group) => group.skills.map((skill) => skill.name)))],
  }
}

/** Every meta tag as [attribute, key, content], shared by the HTML writer and the runtime updater. */
export function metaEntries(m: PageMeta): Array<['name' | 'property', string, string]> {
  const url = absoluteUrl(m.path)
  const image = absoluteUrl(m.image)
  return [
    ['name', 'description', m.description],
    ['property', 'og:type', m.type],
    ['property', 'og:site_name', profile.name],
    ['property', 'og:title', m.title],
    ['property', 'og:description', m.description],
    ['property', 'og:url', url],
    ['property', 'og:image', image],
    ['property', 'og:image:width', String(OG_SIZE.width)],
    ['property', 'og:image:height', String(OG_SIZE.height)],
    ['property', 'og:image:alt', m.imageAlt],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', m.title],
    ['name', 'twitter:description', m.description],
    ['name', 'twitter:image', image],
    ['name', 'twitter:image:alt', m.imageAlt],
  ]
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The page's <head> block as HTML (build time). */
export function headHtml(m: PageMeta): string {
  const lines = [
    `<title>${escapeHtml(m.title)}</title>`,
    ...metaEntries(m).map(([attr, key, content]) => `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`),
    `<link rel="canonical" href="${absoluteUrl(m.path)}" />`,
    ...(m.noindex ? ['<meta name="robots" content="noindex" />'] : []),
    // "<" escaped so the JSON can never close the script tag early.
    `<script type="application/ld+json">${JSON.stringify(personJsonLd()).replace(/</g, '\\u003c')}</script>`,
  ]
  return lines.join('\n    ')
}
