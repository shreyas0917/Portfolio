/*
  Build-time site assets, generated from the same data the site renders:

  - each route's <head> (title, description, canonical, Open Graph, Twitter,
    JSON-LD) written into its own HTML file, so link previews and crawlers see
    the right tags without running JavaScript;
  - Open Graph images (1200×630): one for home, one per project in projects.ts;
  - the "SW" favicon set (SVG, PNG, ICO), apple-touch-icon and web manifest;
  - sitemap.xml and robots.txt, built from SITE_URL.

  Images are laid out with satori (flexbox → SVG, text as paths) and
  rasterised with resvg. Nothing here ships to the browser.
*/
import { readFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import type { Plugin } from 'vite'
import { profile } from '../src/data/profile'
import { getProject, projects, type Project, type Status } from '../src/data/projects'
import { SITE_URL } from '../src/data/site'
import { headHtml, homeMeta, OG_SIZE, projectMeta, type PageMeta } from '../src/lib/seo'

/* ── Palette (dark theme tokens from globals.css) ─────────────────────── */

const C = {
  bg: '#0A0C10',
  bgElev: '#0F131A',
  surface: '#141922',
  line: '#232B38',
  lineStrong: '#303A4A',
  fg: '#E7ECF3',
  fgDim: '#AEB7C6',
  fgMuted: '#758091',
  accent: '#4FD1C5',
  ok: '#3FB950',
  warn: '#E3A008',
  fail: '#F85149',
} as const
const STATUS: Record<Status, string> = { ok: C.ok, warn: C.warn, fail: C.fail }

/* ── Tiny element builder (satori takes React-like element objects) ───── */

type Style = Record<string, string | number>
type Child = Node | string | null | false | undefined
interface Node {
  type: string
  props: Record<string, unknown>
}

const div = (style: Style, ...children: Child[]): Node => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children: children.filter((c) => c !== null && c !== false && c !== undefined) },
})
const text = (style: Style, value: string): Node => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: value } })
const dot = (color: string, size = 12): Node => div({ width: size, height: size, borderRadius: size, background: color, flexShrink: 0 })

/* ── Fonts and photo ──────────────────────────────────────────────────── */

const root = new URL('../', import.meta.url)
const file = (path: string) => readFileSync(new URL(path, root))
const font = (pkg: string, name: string, weight: 400 | 500 | 700) => ({
  name,
  weight,
  style: 'normal' as const,
  data: file(`node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff`),
})

let fontCache: ReturnType<typeof font>[] | null = null
const fonts = () =>
  (fontCache ??= [
    font('space-grotesk', 'Space Grotesk', 400),
    font('space-grotesk', 'Space Grotesk', 500),
    font('space-grotesk', 'Space Grotesk', 700),
    font('jetbrains-mono', 'JetBrains Mono', 400),
    font('jetbrains-mono', 'JetBrains Mono', 500),
  ])

const MONO = 'JetBrains Mono'
const DISPLAY = 'Space Grotesk'
const HOST = new URL(SITE_URL).host

async function toSvg(node: Node, width: number, height: number) {
  return satori(node as unknown as Parameters<typeof satori>[0], { width, height, fonts: fonts() })
}
function toPng(svg: string, width?: number) {
  const opts = width ? { fitTo: { mode: 'width' as const, value: width } } : undefined
  return new Resvg(svg, { ...opts, font: { loadSystemFonts: false } }).render().asPng()
}

/* ── Open Graph images ────────────────────────────────────────────────── */

/** Console grid fading out toward the edges, as in the hero. */
const backdrop = () => [
  div({
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`,
    backgroundSize: '56px 56px',
  }),
  div({ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(75% 85% at 35% 40%, transparent 30%, ${C.bg} 100%)` }),
]

/** Bottom status bar: three status lights and the site's address. */
const statusBar = (right: string) =>
  div(
    {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 76,
      padding: '0 64px',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTop: `1px solid ${C.line}`,
      background: C.bgElev,
      fontFamily: MONO,
      fontSize: 20,
      color: C.fgMuted,
    },
    div({ alignItems: 'center', gap: 10 }, dot(C.fail, 11), dot(C.warn, 11), dot(C.ok, 11), text({ marginLeft: 14, color: C.fgDim }, HOST)),
    text({}, right),
  )

function homeImage(photoSrc: string | null): Node {
  // Plain words wrap freely; each status phrase stays whole under one underline, as in the hero.
  const words: Array<{ word: string; status?: Status }> = profile.taglineParts.flatMap((part) =>
    part.status ? [{ word: part.text, status: part.status }] : part.text.split(' ').map((word) => ({ word })),
  )
  const copy = div(
    { flexDirection: 'column', flex: 1, minWidth: 0 },
    div(
      { flexDirection: 'column', fontFamily: MONO, fontSize: 21, color: C.fgMuted, gap: 8 },
      div({ gap: 12 }, text({ color: C.accent }, '$'), text({}, `systemctl status ${profile.firstName.toLowerCase()}`)),
      div({ alignItems: 'center', gap: 12 }, dot(C.ok, 12), text({ color: C.ok }, 'active (running)')),
    ),
    div(
      { flexDirection: 'column', marginTop: 26, fontFamily: DISPLAY, fontWeight: 700, fontSize: 112, lineHeight: 0.98, letterSpacing: -4.5, color: C.fg },
      text({}, profile.firstName),
      div({}, text({}, profile.lastName), text({ color: C.accent }, '.')),
    ),
    div(
      { alignItems: 'center', gap: 16, marginTop: 24, fontFamily: MONO, fontSize: 21, letterSpacing: 3.2, color: C.fgDim },
      div({ width: 34, height: 2, background: C.accent }),
      text({}, profile.title.toUpperCase()),
    ),
    div(
      { flexWrap: 'wrap', marginTop: 24, maxWidth: photoSrc ? 620 : 900, columnGap: 9, rowGap: 6, fontFamily: DISPLAY, fontSize: 31, lineHeight: 1.3 },
      ...words.map(({ word, status }) =>
        text(
          status
            ? { color: C.fg, paddingBottom: 3, borderBottom: `3px solid ${STATUS[status]}` }
            : { color: C.fgDim, paddingBottom: 3, borderBottom: '3px solid transparent' },
          word,
        ),
      ),
    ),
  )

  const portrait =
    photoSrc &&
    div(
      { position: 'relative', width: 336, height: 420, marginLeft: 48, flexShrink: 0 },
      // Viewfinder corner brackets, as around the hero portrait.
      ...[
        { left: -14, top: -14, borderLeft: `2px solid ${C.lineStrong}`, borderTop: `2px solid ${C.lineStrong}` },
        { right: -14, top: -14, borderRight: `2px solid ${C.lineStrong}`, borderTop: `2px solid ${C.lineStrong}` },
        { left: -14, bottom: -14, borderLeft: `2px solid ${C.lineStrong}`, borderBottom: `2px solid ${C.lineStrong}` },
        { right: -14, bottom: -14, borderRight: `2px solid ${C.lineStrong}`, borderBottom: `2px solid ${C.lineStrong}` },
      ].map((corner) => div({ position: 'absolute', width: 22, height: 22, ...corner })),
      div(
        { position: 'relative', width: 336, height: 420, borderRadius: 16, overflow: 'hidden', border: `2px solid ${C.ok}` },
        { type: 'img', props: { src: photoSrc, width: 332, height: 416, style: { width: 332, height: 416, objectFit: 'cover' } } },
        div({ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(to top, rgba(10,12,16,0.75), transparent 38%)` }),
        div(
          { position: 'absolute', left: 14, top: 14, alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.5)', fontFamily: MONO, fontSize: 15, letterSpacing: 1.5, color: 'rgba(255,255,255,0.88)' },
          dot(C.ok, 9),
          text({}, 'HEALTHY'),
        ),
      ),
    )

  return div(
    { position: 'relative', width: OG_SIZE.width, height: OG_SIZE.height, background: C.bg, color: C.fg },
    ...backdrop(),
    div({ position: 'absolute', left: 64, right: 64, top: 0, bottom: 76, alignItems: 'center' }, copy, portrait),
    statusBar(profile.focus.join(' · ')),
  )
}

function projectImage(p: Project): Node {
  const signal = STATUS[p.signal]
  const metric = p.metrics.find((m) => !m.unverified)
  const chips = p.stack.slice(0, 6)
  const more = p.stack.length - chips.length
  const titleSize = p.title.length > 22 ? 76 : 92

  return div(
    { position: 'relative', width: OG_SIZE.width, height: OG_SIZE.height, background: C.bg, color: C.fg },
    ...backdrop(),
    // The project's status colour, as the glow on its card.
    div({ position: 'absolute', left: 0, right: 0, top: 0, height: 6, backgroundImage: `linear-gradient(to right, ${signal}, transparent 80%)` }),
    div(
      { position: 'absolute', left: 64, right: 64, top: 52, bottom: 76, flexDirection: 'column' },
      div(
        { alignItems: 'center', justifyContent: 'space-between', fontFamily: MONO, fontSize: 20, color: C.fgMuted },
        div(
          { alignItems: 'center', gap: 14 },
          div(
            { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: `1px solid ${C.lineStrong}`, background: C.surface, color: C.fg, fontSize: 16, fontWeight: 500 },
            profile.initials,
          ),
          text({}, `${profile.handle} / projects`),
        ),
        div(
          { alignItems: 'center', gap: 10, padding: '7px 14px', borderRadius: 999, border: `1px solid ${C.lineStrong}`, background: C.bgElev, fontSize: 16, letterSpacing: 2.2, color: C.fgDim },
          dot(signal, 10),
          text({}, p.category.toUpperCase()),
        ),
      ),
      text({ marginTop: 44, fontFamily: DISPLAY, fontWeight: 700, fontSize: titleSize, lineHeight: 1, letterSpacing: -3, color: C.fg, maxWidth: 1000 }, p.title),
      text({ marginTop: 18, fontFamily: DISPLAY, fontSize: 32, lineHeight: 1.25, color: C.fgDim, maxWidth: 1000 }, p.subtitle),
      div(
        { marginTop: 'auto', marginBottom: 44, alignItems: 'flex-end', gap: 40 },
        metric &&
          div(
            { flexDirection: 'column', flexShrink: 0, padding: '16px 22px', borderRadius: 12, border: `1px solid ${C.line}`, background: C.bgElev },
            text({ fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, lineHeight: 1, letterSpacing: -2, color: C.fg }, metric.value),
            div(
              { alignItems: 'center', gap: 9, marginTop: 10, fontFamily: MONO, fontSize: 15, letterSpacing: 1.6, color: C.fgMuted },
              dot(STATUS[metric.status], 9),
              text({}, metric.label.toUpperCase()),
            ),
          ),
        div(
          { flexWrap: 'wrap', gap: 10, flex: 1, fontFamily: MONO, fontSize: 19, color: C.fgDim },
          ...chips.map((tech) => text({ padding: '6px 13px', borderRadius: 7, border: `1px solid ${C.lineStrong}`, background: 'rgba(10,12,16,0.6)' }, tech)),
          more > 0 && text({ padding: '6px 6px', color: C.fgMuted }, `+${more}`),
        ),
      ),
    ),
    statusBar(`${profile.name} · ${profile.title}`),
  )
}

/** The hero photo as a data URI (the 4:5 crop used on the site). */
const photo = () => `data:image/jpeg;base64,${file('public/shreyas-800.jpg').toString('base64')}`

export async function renderHomeOg(withPhoto: boolean) {
  return toPng(await toSvg(homeImage(withPhoto ? photo() : null), OG_SIZE.width, OG_SIZE.height))
}
export async function renderProjectOg(p: Project) {
  return toPng(await toSvg(projectImage(p), OG_SIZE.width, OG_SIZE.height))
}

/* ── Icons ────────────────────────────────────────────────────────────── */

/**
 * "SW" monogram with a green status light. Drawn on a 64-unit grid and scaled.
 * - tile: rounded square with a hairline border (favicons, "any" icons)
 * - bleed: square to the edges (apple-touch-icon; iOS rounds it)
 * - maskable: square to the edges, mark inside the central safe zone
 */
function monogram(size: number, variant: 'tile' | 'bleed' | 'maskable'): Node {
  const s = size / 64
  // Maskable icons can be cropped to a circle: keep the mark inside the central safe zone.
  const mark = variant === 'maskable' ? 0.68 : 1
  return div(
    {
      position: 'relative',
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      background: C.bg,
      ...(variant === 'tile' && { borderRadius: 14 * s, border: `${Math.max(1, 2 * s)}px solid ${C.lineStrong}` }),
    },
    text({ fontFamily: DISPLAY, fontWeight: 700, fontSize: 29 * s * mark, letterSpacing: -1 * s * mark, color: C.fg, marginTop: 4 * s * mark }, 'SW'),
    // Status light in the top-right corner, clear of the letters even at 16px.
    div({
      position: 'absolute',
      width: 10 * s * mark,
      height: 10 * s * mark,
      borderRadius: 10 * s,
      background: C.ok,
      top: size / 2 - 25 * s * mark,
      left: size / 2 + 15 * s * mark,
    }),
  )
}

/** ICO container holding PNG images (supported by every browser that asks for /favicon.ico). */
function ico(images: Array<{ size: number; png: Buffer }>) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, e)
    header.writeUInt8(size >= 256 ? 0 : size, e + 1)
    header.writeUInt16LE(1, e + 4)
    header.writeUInt16LE(32, e + 6)
    header.writeUInt32LE(png.length, e + 8)
    header.writeUInt32LE(offset, e + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map((i) => i.png)])
}

export async function renderIcons(): Promise<Asset[]> {
  const tile = await toSvg(monogram(64, 'tile'), 64, 64)
  const tileAt = async (size: number) => toPng(await toSvg(monogram(size, 'tile'), size, size))
  const [png16, png32, png48, png192, png512] = await Promise.all([16, 32, 48, 192, 512].map(tileAt))
  const touch = toPng(await toSvg(monogram(180, 'bleed'), 180, 180))
  const maskable = toPng(await toSvg(monogram(512, 'maskable'), 512, 512))
  return [
    { fileName: 'favicon.svg', source: tile },
    { fileName: 'favicon-32x32.png', source: png32 },
    {
      fileName: 'favicon.ico',
      source: ico([
        { size: 16, png: png16 },
        { size: 32, png: png32 },
        { size: 48, png: png48 },
      ]),
    },
    { fileName: 'apple-touch-icon.png', source: touch },
    { fileName: 'icon-192.png', source: png192 },
    { fileName: 'icon-512.png', source: png512 },
    { fileName: 'icon-maskable-512.png', source: maskable },
  ]
}

/* ── Manifest, sitemap, robots ────────────────────────────────────────── */

function manifest() {
  return JSON.stringify(
    {
      name: `${profile.name} — ${profile.title}`,
      short_name: profile.name,
      description: homeMeta().description,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: C.bg,
      theme_color: C.bg,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  )
}

function sitemap(date: string) {
  const urls = [homeMeta(), ...projects.map(projectMeta)]
    .map((m) => `  <url>\n    <loc>${SITE_URL}${m.path}</loc>\n    <lastmod>${date}</lastmod>\n  </url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`

/* ── Head injection ───────────────────────────────────────────────────── */

const SEO_BLOCK = /<!--seo-->[\s\S]*?<!--\/seo-->/

/** Replaces index.html's <!--seo--> … <!--/seo--> block with a page's tags (markers kept for the next pass). */
export function injectHead(html: string, meta: PageMeta) {
  if (!SEO_BLOCK.test(html)) throw new Error('index.html: the <!--seo--> … <!--/seo--> block is missing')
  return html.replace(SEO_BLOCK, () => `<!--seo-->\n    ${headHtml(meta)}\n    <!--/seo-->`)
}

/** The hero portrait's preload. Only the home page shows the portrait. */
const PORTRAIT_PRELOAD = /\n?[ \t]*<link rel="preload" as="image"[^>]*>/
function withoutPortraitPreload(html: string) {
  if (!PORTRAIT_PRELOAD.test(html)) throw new Error('index.html: the portrait <link rel="preload" as="image"> is missing')
  return html.replace(PORTRAIT_PRELOAD, '')
}

/* ── Vite plugin ──────────────────────────────────────────────────────── */

interface Asset {
  fileName: string
  source: string | Buffer
}

/** Use the photo on the home preview only if it reads clearly at thumbnail sizes (see README). */
export const HOME_OG_PHOTO = true

async function renderAll(): Promise<Asset[]> {
  const date = new Date().toISOString().slice(0, 10)
  const [home, perProject, icons] = await Promise.all([
    renderHomeOg(HOME_OG_PHOTO),
    Promise.all(projects.map(async (p) => ({ fileName: `og/${p.slug}.png`, source: await renderProjectOg(p) }))),
    renderIcons(),
  ])
  return [
    { fileName: 'og/home.png', source: home },
    ...perProject,
    ...icons,
    { fileName: 'manifest.webmanifest', source: manifest() },
    { fileName: 'sitemap.xml', source: sitemap(date) },
    { fileName: 'robots.txt', source: robots() },
  ]
}

const TYPES: Record<string, string> = {
  png: 'image/png',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  webmanifest: 'application/manifest+json',
  xml: 'application/xml',
  txt: 'text/plain; charset=utf-8',
}

export function siteAssets(): Plugin {
  let assets: Promise<Asset[]> | null = null
  const all = () => (assets ??= renderAll())

  return {
    name: 'site-assets',
    enforce: 'post',

    // Home's tags in index.html. In dev, the requested route's tags.
    transformIndexHtml(html, ctx) {
      const slug = /^\/projects\/([^/?#]+)/.exec(ctx.originalUrl ?? '')?.[1]
      const project = slug ? getProject(slug) : undefined
      return injectHead(html, project ? projectMeta(project) : homeMeta())
    },

    // Dev: serve the generated files from memory.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0].slice(1) ?? ''
        if (!/^(og\/[\w-]+\.png|favicon[\w.-]*|apple-touch-icon\.png|icon-[\w-]+\.png|manifest\.webmanifest|sitemap\.xml|robots\.txt)$/.test(path)) return next()
        all()
          .then((list) => {
            const asset = list.find((a) => a.fileName === path)
            if (!asset) return next()
            res.setHeader('Content-Type', TYPES[path.split('.').pop() ?? ''] ?? 'application/octet-stream')
            res.end(asset.source)
          })
          .catch(next)
      })
    },

    // Build: an HTML file per project route, with that project's tags, plus every generated file.
    // Written as both projects/<slug>/index.html and projects/<slug>.html, so /projects/<slug>
    // resolves to it on any static host (directory index or .html lookup) before the SPA fallback.
    // app.html is the SPA fallback for every other path (vercel.json, netlify.toml, _redirects):
    // the app renders its 404 there, so it's marked noindex. Neither shows the hero portrait,
    // so neither preloads it.
    async generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset') return this.error('site-assets: index.html not found in the bundle')
      const html = withoutPortraitPreload(String(index.source))
      for (const p of projects) {
        const page = injectHead(html, projectMeta(p))
        this.emitFile({ type: 'asset', fileName: `projects/${p.slug}/index.html`, source: page })
        this.emitFile({ type: 'asset', fileName: `projects/${p.slug}.html`, source: page })
      }
      this.emitFile({ type: 'asset', fileName: 'app.html', source: injectHead(html, { ...homeMeta(), noindex: true }) })
      for (const asset of await all()) this.emitFile({ type: 'asset', fileName: asset.fileName, source: asset.source })
    },
  }
}
