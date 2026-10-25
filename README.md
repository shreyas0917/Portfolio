# Shreyas Wani — Portfolio

[![CI](https://github.com/shreyas0917/Portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/shreyas0917/Portfolio/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)

![Portfolio home page, dark theme](docs/screenshot.png)

A personal developer portfolio for a backend and AI systems engineer, designed as an
**observability console**: a charcoal/slate palette, status-light accents (green healthy ·
amber retry · red failure), a generative "live system" hero, and motion that respects
`prefers-reduced-motion`.

## Contents

- [Features](#features) · [Tech stack](#tech-stack) · [Projects featured](#projects-featured)
- [Run it](#run-it) · [CI](#ci) · [Contact form](#contact-form-formspree) · [Deploy](#deploy)
- [Structure](#structure) · [SEO and social previews](#seo-social-previews-and-icons)
- [Editing content](#editing-skills-experience-and-education) · [Performance notes](#performance-notes-keep-these-when-extending)

## Features

- **Home sections:** hero, about, projects, skills, experience, education and contact.
- **Project pages** (`/projects/:slug`): problem, approach, decisions, testing, learnings,
  an interactive architecture diagram with a replayable trace, and a screenshot gallery.
- **Skills with evidence:** each skill is marked as used in projects, used to build this
  site, or hands-on practice. "Used in projects" links are derived from the project data,
  so a skill is never linked to a project that doesn't use it.
- **Command palette** (`Ctrl K` / `⌘K`): jump to any section or project, copy the email,
  open the résumé, toggle the theme.
- **Light and dark themes**, applied before first paint so there is no flash.
- **Accessible by default:** keyboard navigation, visible focus, 44 px hit areas on
  buttons and links, reduced-motion support, and axe-clean in both themes.
- **Fast:** Lighthouse 96 mobile / 100 desktop on the home page, with zero layout shift.
- **SEO ready:** per-route `<head>`, Open Graph images, icons, sitemap, robots and JSON-LD,
  all generated at build time.
- **Contact form** through Formspree, with validation, a honeypot and retry handling.

## Tech stack

| Area | Tools |
| --- | --- |
| App | React 18, TypeScript (strict), Vite 5, React Router 6 |
| Styling | Tailwind CSS 3 with CSS-variable design tokens, self-hosted Fontsource fonts |
| Motion | Framer Motion (`LazyMotion`), GSAP (lazy), Lenis smooth scroll |
| Build assets | satori and resvg for Open Graph images and icons |
| CI | GitHub Actions: typecheck and build on every push and PR |
| Hosting | Static; configured for Vercel (`vercel.json`) and Netlify (`netlify.toml`) |

## Projects featured

| Project | What it is |
| --- | --- |
| **Retrace** | RAG Reliability & Failure Diagnosis System |
| **EventGuard** | Idempotent Distributed Event Processing Platform |
| **Live Google Jobs Aggregator** | Data Engineering Pipeline |
| **Production-Ready URL Shortener** | Cached, Rate-Limited Short-Link Service |
| **NextLevel Food** | Recipe-Sharing Platform |

Each has its own page on the site, built from `src/data/projects.ts`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build → dist/
npm run preview    # serve dist/ at http://localhost:4173
```

Requires Node 18+ (built with Node 22).

## CI

`.github/workflows/ci.yml` runs on every push and pull request to `main`. It installs
with `npm ci` (npm cache enabled), then runs the typecheck, the lint script if one
exists, and the production build. The build also generates the share images and
per-route HTML, so a broken data file fails CI. There's no deploy step: Vercel
builds and deploys on its own. The "GitHub Actions" and "CI/CD Pipelines" skills
on the site point to this workflow, so keep it in place.

## Contact form (Formspree)

The contact form posts to [Formspree](https://formspree.io) from the browser. No
backend is needed.

1. Create a form on Formspree and copy its endpoint (`https://formspree.io/f/…`).
2. Copy `.env.example` to `.env.local` (git-ignored) and set
   `VITE_FORMSPREE_ENDPOINT` to that endpoint. Restart `npm run dev`.
3. On Vercel or Netlify, add the same variable in the project's environment settings,
   then redeploy. Vite inlines it at build time.

If the variable is missing (or still the `.env.example` placeholder), the form renders
disabled with an "email me directly" note instead of failing silently.

Behaviour (`src/lib/contactForm.ts`, `src/sections/Contact.tsx`):
- Validation runs in the browser, with inline errors, and focus moves to the first invalid field.
- A hidden `_gotcha` honeypot catches bots. Filled submissions are dropped but shown as "delivered".
- The request lifecycle is idle → sending → `200 OK · message delivered` or
  `request failed · retry`. The error state includes a retry and the email as a fallback.
- One request at a time: an in-flight lock prevents double submits. Requests time out after 15 s.

## Deploy

1. Set the real address in `src/data/site.ts` (`SITE_URL`). Canonical URLs, Open Graph
   image URLs, the sitemap and robots.txt are built from it. If you don't know the final
   domain yet, deploy once, set it, and deploy again.
2. Set `VITE_FORMSPREE_ENDPOINT` in the host's environment variables (see above).
3. **Vercel:** import the repo. It detects Vite: the build command is `npm run build` and the output directory is
   `dist`. **Netlify:** `netlify.toml` already sets both.
4. After deploying, check one project URL directly (refresh on `/projects/retrace`),
   a made-up URL (it should show the console-style 404), and the link previews.

How routing works on the host: home (`index.html`) and every project page
(`projects/<slug>.html` and `projects/<slug>/index.html`) are real files, served
first. Any other path falls back to `app.html` (`vercel.json`, `netlify.toml`,
`public/_redirects`), where the app renders its 404. `app.html` is marked `noindex`
and doesn't preload the hero photo. `vercel.json` also sets `cleanUrls` and a
one-year immutable cache on `/assets/*` (file names are content-hashed).

`npm run preview` is close but not identical: it serves `index.html` for unknown
paths.

The footer's "last deployed" date is the build time, injected by Vite
(`__BUILD_DATE__` in `vite.config.ts`).

## Structure

```
index.html               shell + the first-visit boot sequence (inline, paints before any JS)
scripts/site-assets.ts   build step: per-route <head>, OG images, icons, manifest, sitemap, robots
src/
  main.tsx               providers: LazyMotion, Router, Theme, Lenis
  App.tsx                routes + page transitions
  styles/globals.css     design tokens (light/dark), font fallbacks, intro keyframes, utilities
  data/                  all content — edit here, not in components
    site.ts              SITE_URL (the deployed address)
    profile.ts           name, handle, links, resume, bio, tagline, About focus + principles, nav links
    projects.ts          the five projects (typed), including their animated flow diagrams
    skills.ts            skill groups (where each is used is derived, not stored)
    experience.ts, education.ts
  hooks/                 useReducedMotion, useTheme, useLenis (smooth scroll), useTypewriter, useMediaQuery,
                         usePageMeta (title + social tags per route), useIdleTitle
  lib/                   cn, schedule, motionFeatures, flow (diagram engine), layoutSettle, skillUsage,
                         seo (page metadata), boot, palette + fuzzy (command palette),
                         scrollLinked (scroll-driven effects), ...
  components/            Navbar, ProjectCard, CountUp, Portrait, Magnetic, CustomCursor, CommandPalette, ...
  visuals/               SystemBackground (hero canvas), FlowDiagram (project data paths)
  sections/              Hero, About, Projects, Skills, Experience, Education, Contact
  pages/                 Home, ProjectDetail
```

## SEO, social previews and icons

Set the deployed address once, in `src/data/site.ts` (`SITE_URL`, no trailing slash). Everything
below is built from it and from the data files, so it stays in step with the content:

- **Per-page tags.** `src/lib/seo.ts` defines each page's title, description, canonical URL,
  Open Graph and Twitter tags, plus a schema.org `Person` (JSON-LD). At build time
  (`scripts/site-assets.ts`) they're written into `dist/index.html` and into one HTML file per
  project (`dist/projects/<slug>/index.html`, and the same as `dist/projects/<slug>.html`), so
  link previews and crawlers see the right tags without running JavaScript. Static hosts serve
  those files before the SPA fallback. In the browser, `usePageMeta` keeps the same tags
  updated during client-side navigation; unknown routes get `noindex`.
- **Not full prerendering.** The page body is still rendered in the browser. Prerendering the
  body would need hydration and would replay or fight the intro animations and shared-element
  transitions, so only the `<head>` is prerendered.
- **Open Graph images** (1200×630): `og/home.png` (name, title, tagline with its status
  underlines, the portrait, status lights) and `og/<slug>.png` per project (title, subtitle,
  first measured metric, stack). Unverified metrics are never used. They're laid out with
  satori and rasterised with resvg, using the same fonts and dark-theme colours. To look at
  them, run `npm run build` and open `dist/og/`. The home image uses the photo because it stays
  clear at thumbnail size; set `HOME_OG_PHOTO = false` in `scripts/site-assets.ts` for a
  text-only version.
- **Icons:** an "SW" monogram with a green status light, generated as `favicon.svg`,
  `favicon-32x32.png`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`
  and `icon-maskable-512.png`, plus `manifest.webmanifest`. Theme-color is set for light and
  dark, and follows the site's theme toggle.
- **`sitemap.xml` and `robots.txt`** list home and every project page, dated by the build.

In dev, all of these are served from memory at the same paths. After deploying, check the
previews with a link-preview inspector (LinkedIn Post Inspector, opengraph.xyz).

## Small details

- **Boot sequence** (`index.html`): a ~1.1 s console readout on the first visit to the home
  page. The page renders underneath it, and the hero's intro plays as it fades. Any key, click
  or tap skips it. It shows once per tab session and never on project pages, `/#section` links,
  back/forward navigation, under reduced motion, or in a tab opened in the background. To see
  it again, open the site in a new tab (or clear the `booted` key in sessionStorage).
- **Cursor** (desktop with a mouse, not under reduced motion): a dot plus a trailing ring that
  grows over links and buttons, reads "open" over project cards (`data-cursor-label`) and turns
  into a caret over text fields. Text fields keep the native I-beam, a text-selection drag gets
  the native cursor back, and dialogs use the native cursor. On desktop, clicking anywhere on
  a project card opens it.
- **Command palette:** `Ctrl K` / `⌘K`, or the hint in the navbar (desktop). It has jumps to every section
  (from `navLinks`), every project (from `projects.ts`), and actions: copy email, open
  resume / GitHub / LinkedIn, toggle theme. Fuzzy search, arrow keys, Enter, Esc. To add an
  action, extend `buildCommands` in `src/components/CommandPalette.tsx`. The palette's code loads
  on first use.
- **Tab title** reads "● connection idle…" while the tab is in the background.
- **DevTools console** greets visitors with the contact email (`src/main.tsx`).

## Editing skills, experience and education

- `src/data/skills.ts`: every skill has an evidence level, shown by its chip and
  explained in the legend under the section.
  - **Used in projects** (solid chip): derived, never set by hand. `lib/skillUsage` searches
    the projects' and roles' text for the skill's name, or for its `match` terms
    (whole words; a trailing `*` matches a prefix). Selecting the chip lists those
    projects. A skill is only ever linked to a project that mentions it, and the
    link updates itself when a project changes.
  - **`evidence: 'site'`** (dashed chip): used to build or ship this portfolio, e.g.
    Tailwind CSS, or GitHub Actions for the CI workflow.
  - **`evidence: 'practice'`** (dotted chip with a "lab" tag): learned and practised
    hands-on, not yet in a featured project. Selecting it says so.

  A mention in a project or role always wins over `evidence`, so a practice skill moves
  to "used in projects" by itself once a project's data names it. `note` overrides the
  text shown when the chip is selected. A group with `wide: true` spans both columns
  of the tablet layout (used to keep the rows even). A skill that no project mentions
  and that has no `evidence` logs a warning in dev.
- `src/data/experience.ts`: add roles to the array. The timeline handles any number;
  an entry whose `period` contains "Present" shows as running.
- `src/data/education.ts`: `primary: true` marks the large entry; the rest render compact.
- Navbar entries come from `navLinks` in `profile.ts`. The inline links show from
  1024px; below that, the menu button.

## Editing projects

Everything on a project card comes from `src/data/projects.ts`:

- `spotlight: true` makes a large two-column card (Retrace, EventGuard); the rest are compact.
- `signal` (`ok` / `warn` / `fail`) is the card's status colour, used for the hover glow.
- `highlights`: cards show the first 3 (spotlight) or 2 (compact); detail pages show all.
- `metrics`: a leading number counts up on scroll (`12/12`, `98+`, `6h`). Set
  `unverified: true` for anything not yet measured: it's shown verbatim as a dashed
  caveat, never as a headline number.
- `flow`: the animated data path. `nodes` are listed in pipeline order. Each packet has a
  `path` of node ids (one step at a time, may turn back), a `start` time in seconds, and
  `marks` that set a node's status and callout the first time the packet reaches it.
  An optional `trace` draws a line back from one node to another after the run
  (Retrace's root-cause trace). Keep notes under ~20 characters.

The diagram picks its own layout: a horizontal pipeline when labels fit, the same
without the small detail lines when that's what fits, or a vertical pipeline on
narrow screens.

### Project pages (`/projects/:slug`)

Built entirely from the same entry. The optional fields `problem`, `approach`,
`decisions` (`choice` / `why` / `tradeoff`), `testing` (`checks`, `caveats`),
`learnings`, `next` and `screenshots` (`src`, `caption`) fill the page's sections;
a section without data is left out. Node `explain` lines show when a diagram node is
hovered or tapped.

- Write `[to fill]` wherever a fact is still missing. It renders as a dashed
  placeholder, so gaps stay visible instead of looking finished. Search the data
  file for `[to fill]` to find them all.
- Testing caveats, plus any `unverified` metric, render in the dashed amber caveat style.
- Empty `screenshots` shows a "coming soon" panel. Add images under `public/` and list
  them to get the gallery and lightbox.

Navigation: opening a card carries its title and year chip into the page header
(`lib/sharedElement`). "All systems" and the browser's back button return to the same
spot in the Projects section (`lib/navMemory`). Unknown slugs get a console-style 404.

## Filling in placeholders

- `src/data/projects.ts`: `githubUrl`, `liveUrl`, `image`, `year` are marked `TODO`.
  The Live button only appears once `liveUrl` is set; until `githubUrl` is set, the
  GitHub button shows as "not yet published". The URL shortener's cache figure stays a
  visible placeholder (`[~70% DB load reduction — to confirm]`, flagged
  `unverified`) and its scale is described only as "Designed for high-concurrency
  traffic". Keep it that way until it's benchmarked.
- `src/data/site.ts`: replace the placeholder `SITE_URL` with the real address once deployed.
- Contact form: set `VITE_FORMSPREE_ENDPOINT` (see "Contact form" above).

### Photo

The hero uses 4:5 crops in `public/` generated from the original, `shreyas.jpg` in
the project root (kept out of `public/` so it isn't deployed):
`shreyas-480.webp`, `shreyas-800.webp`, `shreyas-1200.webp`, plus `shreyas-800.jpg`
as a fallback (also used by the Open Graph image). To regenerate after replacing the
source photo (needs Pillow):

```python
from PIL import Image
im = Image.open('shreyas.jpg').convert('RGB')
w = 1836; h = int(w * 5 / 4); x0 = 1036 - w // 2; y0 = 90   # face-centred crop
crop = im.crop((x0, y0, x0 + w, y0 + h))
for s in (480, 800, 1200):
    crop.resize((s, s * 5 // 4), Image.LANCZOS).save(f'public/shreyas-{s}.webp', quality=80, method=6)
crop.resize((800, 1000), Image.LANCZOS).save('public/shreyas-800.jpg', quality=82, optimize=True, progressive=True)
```

## Performance notes (keep these when extending)

Measured with Lighthouse 12 on the production build:
- **Home (all sections, boot sequence included):** mobile median 96 (5 runs), desktop 100.
- **Project pages (all five):** mobile median 97, desktop 100.
- **Both:** Accessibility, Best Practices and SEO at 100, and CLS 0.
These decisions are what got it there:

- **Hero intro is CSS keyframes** (`.intro-*` in `globals.css`, timed with `at()`),
  not JS tweens, so it runs off the main thread while React boots.
- **Framer Motion via `LazyMotion` + `m.*`** with features loaded asynchronously.
  `strict` mode throws if a full `motion.*` component is used. Don't add `layout` /
  `layoutId` (not in the loaded feature set), and don't put transforms on
  `m.svg`: Motion measures SVGs with `getBBox()` on mount, forcing a layout.
- **No `useScroll`** for the progress bar: it measures on mount. The navbar listens
  to scroll events instead.
- **Scroll-linked effects (hero scroll-out, experience timeline) run in
  `requestAnimationFrame`** (`lib/scrollLinked`), only while their section is on screen.
  The scroll listener only wakes the loop. GSAP ScrollTrigger was replaced: it writes
  styles inside the scroll event, which Firefox reports as a console warning.
- **Below-the-fold sections use `.defer-render`** (`content-visibility: auto`).
  Programmatic jumps add `.render-all` first, then wait for self-sizing components
  (`lib/layoutSettle`) before computing the target, so jumps land exactly. A new
  component that measures itself and changes height should hold layout the same way
  `FlowDiagram` does.
- **Diagram height on project pages is known at first paint.** `FlowDiagram` (size
  `lg`) measures its width before paint. A height arriving a frame later would push the
  text below it down, a layout shift when the diagram is in the first viewport.
  Cards measure through a ResizeObserver instead, because they sit in skipped
  `content-visibility` sections.
- **Project cards** draw their flow diagrams with direct SVG attribute writes from a
  small timeline (`lib/flow`). React doesn't re-render per frame, and the loop runs only
  while a card is hovered (desktop) or on screen (touch). GSAP loads lazily for the
  staggered entrance.
- **Project pages are a lazy chunk** (about 6 KB gzipped), warmed on the first hover of
  any project link. The Suspense placeholder is full-height, so the footer never
  jumps (CLS stays 0).
- **Home renders only the Hero first.** The six sections below the fold mount right
  after first paint in a React transition, which is time-sliced, so there is no long
  initial render task. Home holds layout until they exist, so jumps and deep links
  still land exactly.
- **Count-ups reserve their final width** (`CountUp`), and the About readout reserves
  its lines before typing, so nothing shifts while text changes.
- **The hero canvas** boots on idle, pauses off-screen and in hidden tabs, and draws a
  single static frame under reduced motion.
- **Fonts** (Space Grotesk + JetBrains Mono, from Google Fonts) are self-hosted via
  Fontsource. The CDN stylesheet was render-blocking.
  - Both Latin subsets are preloaded by a small plugin in `vite.config.ts`.
  - JetBrains Mono's preload is `fetchpriority="low"`, so on slow connections it doesn't take
    bandwidth from the JS that renders the hero. At normal priority it cost about 1 point on
    mobile.
  - Each font is followed in its stack by a local fallback with matched metrics
    (`size-adjust`, ascent/descent overrides in `globals.css`), so text never moves when the
    web font swaps in. If you change a font, re-measure the overrides from the font files.
- **The boot sequence costs nothing measurable.** It's inline HTML/CSS with no dependencies,
  paints before any JS (it now provides the first contentful paint) and only overlays the
  page, which renders underneath. The hero's typing caret moves with `translate`, so the
  typed line causes no layout shift.

Mobile scores vary by ±3 between runs on the same build. Check the median of several
runs, or PageSpeed Insights after deploying.
