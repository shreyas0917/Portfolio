# Portfolio audit report

Audit of the production build, 2026-10-19. Nothing was deployed or pushed, and
`SITE_URL` and the environment values were not changed. Copy and data are unchanged.
Content problems are listed in §3 for you to decide on.

How it was tested:
- **Browsers:** Playwright 1.64 with Chromium 156, Firefox 157 and WebKit 27.2 (Safari's engine).
- **Accessibility:** axe-core 4.14, plus pixel-sampled contrast checks for text over gradients
  and photos.
- **Performance:** Lighthouse 12.
- **Server:** a local static server set up like `vercel.json` (cleanUrls, the SPA fallback, cache
  headers, gzip). `vite preview` sends different headers and caused false alarms in WebKit
  (see §4).

---

## 1. Summary: ready to deploy?

**Yes. Nothing technical blocks deployment.** Every functional, responsive, keyboard and
SEO check passes in all three engines. axe reports no violations in either theme, and the
production build logs no console errors or warnings.

Lighthouse is at or above the baseline on every page:
- mobile 96 (home) and 97 (project pages);
- desktop 100;
- CLS 0;
- 100 for accessibility, best practices and SEO.

14 bugs were found and fixed (§2).

Before you share the link widely, three things need you:

1. **Visible placeholders.** 19 `[to fill]` markers and one `[… — to confirm]` figure
   appear on the project pages as dashed placeholders. All five projects also show
   "GitHub (link not yet published)" and "screenshots coming soon". See §3.
2. **The contact form is offline** until you set `VITE_FORMSPREE_ENDPOINT` in Vercel.
   The form says so and points visitors to your email, so it doesn't break.
3. **`SITE_URL`** must match the real domain. It's `https://shreyaswani.vercel.app` now.
   If the final URL differs, canonical links, share images and the sitemap will point to the
   wrong place until you change it and redeploy.

---

## 2. Bugs found and fixed

Each fix was re-tested after the change (Chromium, Firefox and WebKit unless noted).

| # | Bug | Where | Fix | Verified by |
|---|-----|-------|-----|-------------|
| 1 | Every project page and the 404 logged *"preloaded but not used"* (Chromium, WebKit) and downloaded the 30–90 KB hero photo they never show. All routes shared `index.html`'s photo preload. | `index.html`, `scripts/site-assets.ts` | The build removes the preload from the per-project HTML. Unknown URLs now get a generated `app.html` fallback without it. `app.html` is also `noindex`, so a soft-404 can't be indexed. `vercel.json`, `netlify.toml` and `public/_redirects` point to it. Home keeps the static preload: a script-inserted preload measured ~120 ms worse LCP. | `seo.mjs` (only `/` preloads the photo), console clean on every route in all engines |
| 2 | **Firefox** logged *"This site appears to use a scroll-linked positioning effect"* on every scroll after load. GSAP ScrollTrigger writes styles inside the scroll event. | `Hero.tsx`, `Experience.tsx`, `Projects.tsx` | New `lib/scrollLinked.ts`: the hero scroll-out and timeline line now update in `requestAnimationFrame` (only while on screen), with the same transforms and easing. The card entrance is triggered by an IntersectionObserver. ScrollTrigger is no longer used, which removes an 18 KB (gzip) chunk. | Firefox wheel/hash-load probe: no warnings. Timeline values identical to before (scaleY 0.23 / 1.00 / 0.00, nodes light at the same points). Card stagger 0 → 1. |
| 3 | axe *label-content-name-mismatch* (serious) on the navbar "Ctrl K" hint and the palette's "esc" button. Their names contained the visible text in brackets, which axe can't match. | `Navbar.tsx`, `CommandPalette.tsx` | Names are now "Command palette, Ctrl K" and "Close command palette, esc". | axe: 0 violations |
| 4 | axe *aria-required-children* (critical): when no command matched, the palette rendered an empty `listbox`. | `CommandPalette.tsx` | It's only a listbox while it has options, and the combobox's `aria-expanded`/`aria-controls` follow that. | axe "palette empty" state: 0 violations |
| 5 | Contrast failures: <ul><li>disabled GitHub chip 3.4:1 (light theme)</li><li>amber caveat text 4.2–4.5:1 (light)</li><li>contact "optional" hint 3.4:1</li><li>contact error reason 3.9:1</li><li>hero availability line ~3:1</li><li>portrait "role" label 3.4:1 over the photo</li></ul> | `ProjectCard.tsx`, `ProjectDetail.tsx`, `globals.css`, `Contact.tsx`, `Hero.tsx`, `Portrait.tsx` | <ul><li>Chip opacity 50 → 60%.</li><li>Light-theme amber token `#9A6700` → `#8F5F00` (4.8:1).</li><li>Removed the extra transparency on the two contact texts and the hero line.</li><li>Label uses `fg-dim`.</li></ul> All are slight shifts; no layout change. | axe 0 violations in both themes. Pixel check: all six now pass. |
| 6 | **Safari/WebKit keyboard:** tabbing into the Skills/Projects sections could leave the focused element off screen. WebKit doesn't scroll focus into `content-visibility: auto` sections. | `main.tsx` | All sections render on the first Tab press. | WebKit keyboard walk: every stop in view |
| 7 | Focused elements could end up **under the fixed navbar** (WCAG 2.2 *Focus Not Obscured*): forward tabbing in WebKit, and backward tabbing in every engine. | `Navbar.tsx` | When keyboard focus lands under the bar, the page is nudged so the element sits just below it. | Forward and backward keyboard walks: 0 obscured stops (3 engines) |
| 8 | On project pages the **first diagram node's click area overlapped the second**, by 37 px wide on desktop and 6 px on mobile, so a click there could select the wrong component. | `FlowDiagram.tsx` (`hitBox`) | Each node's area is clamped to the midpoints with its neighbours. | Overlap check at 9 sizes: none |
| 9 | **Layout break below 360px:** the Retrace card's three-column metrics cut their labels off ("SCENARIO\|S", "DIAGNOSI\|S"). | `ProjectCard.tsx` | Below 360px, three-metric cards stack the metrics, as the project pages already do on mobile. 360px and up are unchanged. | New clipped-text check at 320–1920 (Chromium, WebKit): none |
| 10 | **Command palette:** reopening it after closing with Esc could keep the old search for one render, so fast typing was appended ("ret" + "url" opened Retrace). | `CommandPalette.tsx` | The search clears when the palette closes. | Leak/navigation cycle: 60/60 correct |
| 11 | **Tap targets:** 84 controls were under 44 × 44 px. | `globals.css` (`.hit-area`, `.btn`) plus navbar, social icons, back links, contact rows, replay button | Invisible 44 × 44 hit areas wherever there's free space. Nothing looks different; checked that no hit area overlaps another. The theme toggle no longer clips its icon. | 84 → 56. The rest are in dense lists; see §4. |
| 12 | A 422 KB original photo (`public/shreyas.jpg`) was deployed publicly but never used. An identical copy is in the project root. | `public/` | Removed from `public/`. The root copy stays as the source, and the README's regeneration snippet now uses it. | `dist/` no longer contains it |
| 13 | The README's deploy section described the old rewrite, and two notes were outdated. | `README.md` | Deploy steps rewritten (`SITE_URL`, env var, routing, `app.html`). Notes updated. | — |
| 14 | **Layout shift on project pages:** CLS 0.001 (mobile) / 0.002 (desktop) on NextLevel Food. The architecture diagram drew a 72 px placeholder and got its real height a frame after first paint, pushing the text below it down. On the other project pages the same shift happened below the fold, where it doesn't count. | `FlowDiagram.tsx` | On project pages the diagram takes its width before the first paint. Home cards are unchanged: they sit in skipped sections, where measuring early would cost performance. | Layout-shift observer on all 6 project routes at 412 and 1350 px: 0.0000, no entries. Lighthouse NextLevel Food: CLS 0.000 in all 10 runs. |

`npm audit fix` (non-breaking) would change nothing, so no dependency changes were made. See §4.

---

## 3. Content to fill or confirm (checklist)

I didn't change any copy or data; these are for you.

### Placeholders shown on the site

**Retrace** (`src/data/projects.ts`)
- [ ] `year: '2025'`: confirm (marked TODO)
- [ ] `githubUrl: null`. The URL in the comment (`github.com/shreyas0917/retrace`) returns 404.
- [ ] `flow.nodes` → `judge.explain`: "Evaluates the answer before diagnosis: **[to fill]**"
- [ ] `approach[3]`: "Judge: **[to fill]**"
- [ ] `learnings`, `next`: **[to fill]**
- [ ] `screenshots: []` (shows "screenshots coming soon"), `liveUrl: null`, `image.src: null`

**EventGuard**
- [ ] `year: '2025'`: confirm
- [ ] `githubUrl: null`. The comment's `github.com/shreyas0917/eventguard` returns 404.
- [ ] `testing.checks[1]`: "How the duplicate deliveries were produced, and in which environment: **[to fill]**"
- [ ] `testing.checks[2]`: "Automated tests: **[to fill]**"
- [ ] `learnings`, `next`: **[to fill]**
- [ ] `screenshots: []`, `liveUrl: null`, `image.src: null`

**Live Google Jobs Aggregator**
- [ ] `year: '2024'`: confirm
- [ ] `githubUrl: null`
- [ ] `testing.checks[2]`: "Data-quality checks or tests: **[to fill]**"
- [ ] `learnings`, `next`: **[to fill]**
- [ ] `screenshots: []`, `liveUrl: null`, `image.src: null`

**Production-Ready URL Shortener**
- [ ] `year: '2024'`: confirm
- [ ] `githubUrl: null`
- [ ] `metrics[1]`: **"[~70% DB load reduction — to confirm]"** (shown as a dashed "unverified" caveat; never as a result)
- [ ] `approach[4]`: "… The React front end: **[to fill]**"
- [ ] `testing.checks`: "Automated tests: **[to fill]**", "Load testing: **[to fill]**"
- [ ] `learnings`, `next`: **[to fill]**
- [ ] `screenshots: []`, `liveUrl: null`, `image.src: null`

**NextLevel Food**
- [ ] `year: '2024'`: confirm
- [ ] `githubUrl: null`
- [ ] `testing.checks[0]`: "How it was tested: **[to fill]**"
- [ ] `learnings`, `next`: **[to fill]**
- [ ] `screenshots: []`, `liveUrl: null`, `image.src: null`

Note: `image.src` isn't rendered anywhere at the moment, so it's optional.

**Public repos that might match** (from github.com/shreyas0917; I didn't verify the mapping):
`AI_Rag_Project`, `Razorpay-Clone`, `Data_Engineer_BootCamp`, `URL-shortener`,
`Modern_URL_Shortener`, `Food-Recipe`.

**Elsewhere**
- [ ] `src/data/site.ts`: `SITE_URL` is a placeholder until you confirm the domain.
- [ ] `VITE_FORMSPREE_ENDPOINT`: not set. The form is offline.

### Claims to confirm, or soften

These go further than what the data files back up:

- [ ] **Skills: "LLM evaluation (relevance, faithfulness, contradiction)".** None of the three
  criteria appear in any project. Its "used in → Retrace" link comes from the generic word
  "evaluates", and Retrace's Judge step is still `[to fill]`.
- [ ] **Retrace: "98+ automated tests *covering rules, pipeline stages and API contracts*".** The
  testing section only says "98+ automated tests", so the scope part is unconfirmed.
- [ ] **EventGuard: "Admin dashboard for inspecting events, retries and DLQ entries".** Unconfirmed.
  The About bio's "plus the React dashboards that make those systems observable" relies on it.
- [ ] **EventGuard: "Payment-grade event processing…"** (summary) and "at-least-once delivery
  becomes exactly-once business effects" (decision). Both are stronger than the tested scope
  (100 duplicate deliveries of one event, method `[to fill]`). The page's caveat already
  scopes the result, but the wording doesn't.
- [ ] **Jobs: "ACID writes and *time travel* across batches".** "Time travel" is unconfirmed.
- [ ] **URL Shortener: title "Production-Ready" and "built the way production services are".**
  Tests and load testing are `[to fill]`. "Per-client rate limiting" is unconfirmed. React is
  in the stack, but the front end is `[to fill]`.
- [ ] **NextLevel Food: "server-rendered recipe pages" and the diagram's "SSR" label.** Unconfirmed.
- [ ] **Experience: "designed to support 1K+ concurrent sessions".** Fine as written, as long as
  it stays a design target ("designed to") unless it was measured.

### Consistency (checked across Hero, About, Skills, Projects, project pages, footer, JSON-LD, share images, palette, console)

- **Name and title** "Shreyas Wani — Backend & AI Systems Engineer": consistent everywhere.
- **Email** `shreyaswani04@gmail.com`: consistent everywhere it appears:
  - the contact link, copy button and offline note;
  - the footer icon and palette "copy email";
  - the console greeting and JSON-LD (`mailto:`).

  The share images don't show the email, by design.
- **Links:**
  - GitHub profile: 200 OK.
  - Résumé: 200 OK; the Drive file is public, "Shreyas_Wani_Resume_2026.pdf".
  - LinkedIn: answers automated checks with HTTP 999 (normal for LinkedIn). **Open it once by hand.**
- **Figures:** CGPA 8.99 in the bio, status panel and badge ("CGPA 8.99 / 10"). HSC 76%, SSC 90.40%.
- **Dates:** B.E. 2022–2026 matches "graduate" in the bio; internship Jul–Oct 2025.
- **Tech names:** consistent. "Postgres" in diagram labels vs "PostgreSQL" in stacks is a
  deliberate abbreviation.

### Spelling, grammar, tone

No grammar errors in the rendered copy. Small inconsistencies:

- [ ] **"Containerised"** (British, URL Shortener highlight) vs "localized"/"serialized"
  (American) elsewhere. Pick one.
- [ ] **"Resume"** (hero button, palette) vs **"résumé"/"Résumé"** (contact, footer). Pick one.
- [ ] The hero status line lower-cases your availability: "open to backend, full-stack & **ai**
  roles", while About shows "AI".
- [ ] "76%" vs "90.40%": decimal places differ.
- [ ] Page titles for URL Shortener (86 characters) and EventGuard (75) get cut off in search
  results (~60).

---

## 4. Remaining issues for you to decide (ranked)

### Blocker
- **None in the code.** Treat `SITE_URL` as a blocker only if your final domain differs from
  `shreyaswani.vercel.app`.

### Should fix
1. **The visible `[to fill]` placeholders and unconfirmed claims** (§3). Recruiters will see them
   on every project page.
2. **Contact form endpoint:** set `VITE_FORMSPREE_ENDPOINT` (see the pre-deploy checklist).
3. **56 tap targets under 44 px** in dense groups:
   - skill chips (27 px tall);
   - footer section/project links (16 px);
   - the 404 project list (17 px);
   - card title links;
   - contact inputs (42 px).

   They all pass the WCAG 2.2 AA minimum (24 px or enough spacing; axe confirms). Reaching
   44 px needs more spacing between them, a visible design change, so I didn't make it.
   **Want me to?**
4. **Dependency advisories** (13: 7 moderate, 6 high). Every fix is a major upgrade:
   - Tailwind 4, Vite 8 and React Router 7;
   - a satori *downgrade*.
   - **Runtime:** only `react-router-dom` 6.30 ships to the browser. Its advisories cover
     open redirects through user-supplied URLs in `<Link>`/`navigate` and SSR hydration.
     This site uses neither: all links are static.
   - **Build/dev only:** the rest live in the build/dev toolchain (dev-server file access on
     Windows, glob DoS, satori's zip parsing). They don't ship.

   Worth scheduling as a separate upgrade task, not a pre-deploy fix.

### Nice to have
- **Unknown URLs return HTTP 200** (SPA fallback) with a client-side 404. That's now `noindex`
  via `app.html`. A real 404 status would need a dedicated `404.html` and different rewrites.
- **Lenis idle loop.** Lenis (smooth scrolling) runs a ~60/s animation-frame loop even when the
  page is idle. The per-frame cost is near zero, and browsers pause it in background tabs.
- **GSAP (27 KB gzip, lazy)** is now only used for the project-card entrance. It could become a
  CSS/Web Animations stagger and drop GSAP entirely.
- **Navbar over the hero canvas.** The navbar is transparent over the hero's moving canvas; in one
  of three snapshots a canvas line briefly lowered one digit to 3.4:1.
- The spelling/consistency nits in §3.

### Checked and not a problem (test artifacts)
- **WebKit downloading fonts twice:** caused by `vite preview` sending `Vary: Origin`. With
  production-style headers each font downloads once. Worth a glance in Safari DevTools after
  deploying.
- **Firefox "Layout was forced before the page was fully loaded":** comes from Playwright's
  automation layer (`chrome://juggler`), not the site.
- **axe target-size with the mobile menu open:** the targets are underneath the open menu, by
  design.
- **Safari's Tab key skips links by default** (Option-Tab includes them). The skip link and every
  link work with Option-Tab and in Chromium/Firefox.
- **Memory:** 60 cycles of palette use plus card → page → back navigation:
  - event listeners unchanged (352 → 352);
  - one canvas;
  - the heap levels off (+1.3, +0.3, +0.2 MB per 20 cycles);
  - a forced-GC heap snapshot shows **0 detached DOM nodes**.

---

## 5. Results

### Lighthouse (median of 5 runs per row, production build)

| Page | Mobile perf (range) | Desktop perf (range) | Accessibility · Best practices · SEO | CLS (max of runs) | Mobile LCP | Mobile TBT |
|------|--------------------|----------------------|------------------------|-------------------|------------|------------|
| Home | **96** (94–97) | **100** (99–100) | 100 · 100 · 100 | 0.000 | 2.46 s | 58 ms |
| Retrace | **97** (94–97) | **100** (100) | 100 · 100 · 100 | 0.000 | 2.42 s | 75 ms |
| EventGuard | **97** (96–97) | **100** (99–100) | 100 · 100 · 100 | 0.000 | 2.42 s | 56 ms |
| Live Google Jobs Aggregator | **97** (97) | **100** (100) | 100 · 100 · 100 | 0.000 | 2.42 s | 57 ms |
| URL Shortener | **97** (96–97) | **100** (100) | 100 · 100 · 100 | 0.000 | 2.42 s | 44 ms |
| NextLevel Food | **97** (97) | **100** (100) | 100 · 100 · 100 | 0.000 | 2.42 s | 40 ms |

Baseline was mobile ~95, desktop 100, CLS 0. **Every page meets or beats it.** Accessibility,
Best Practices and SEO were 100 in every one of the 60+ runs, and no audit failed.

Notes on the numbers:
- **Variance.** Lighthouse's simulated mobile throttling varies by ±3 points between runs on the
  same build, which is why each row is a median of five.
- **Build measured.** NextLevel Food and EventGuard mobile were re-measured after fix #14. The
  other rows come from the build just before it; that fix only removed a shift below the fold on
  those pages.
- **What helped.** The home page gained ~1 point over the baseline, mainly from dropping
  ScrollTrigger (fix #2).

### axe-core 4.14 (WCAG 2.0/2.1/2.2 A + AA + best practice)

**Coverage:**
- every page (home, 5 projects, 404) in dark and light;
- home and EventGuard also on mobile;
- open palette, palette with no results, open mobile menu;
- contact form with validation errors and after a failed send.

| Engine | Page/theme/state combinations | Violations |
|--------|---------------------------|------------|
| Chromium | 28 | 0, apart from 2 menu-open target-size artifacts (§4) |
| Firefox | 28 | 0 |

**Text over gradients/photos** (axe "incomplete") was checked by sampling pixels: 252
text elements, both themes, desktop and mobile. All pass except the artifacts in §4.

**Keyboard:**
- tab order is logical (skip link → logo → navigation → page → footer);
- every stop has a visible focus indicator, with no traps;
- the palette keeps focus inside and returns it on Esc;
- the skip link moves focus into `<main>`.

**Structure:**
- one `<h1>` per page, no skipped heading levels;
- banner/nav/main/contentinfo landmarks;
- all images have alt text, and diagrams have text alternatives;
- the form status is `aria-live`.

**Reduced motion:**
- 0 running animations and 0 animation frames per second at rest;
- no smooth scrolling, custom cursor or boot sequence.

### Bundle (production, gzip)

| Chunk | Raw | Gzip | Loaded |
|-------|-----|------|--------|
| `index` (app + Framer Motion core + Lenis) | 176.7 KB | 59.5 KB | initial |
| `react` (React, React DOM, Router) | 158.0 KB | 51.5 KB | initial |
| `index-*` (GSAP core) | 68.9 KB | 27.1 KB | lazy, when the projects grid nears |
| `motionFeatures` | 29.9 KB | 10.6 KB | after first paint |
| `ProjectDetail` | 20.5 KB | 6.0 KB | lazy, warmed on first hover of a project link |
| `CommandPalette` | 8.2 KB | 3.6 KB | lazy, on first open |
| CSS | 53.0 KB | 12.8 KB | initial |
| Fonts (Latin, preloaded) | Space Grotesk 21.8 KB, JetBrains Mono 39.5 KB | — | initial |

**What loads first:** 111 KB of JS (gzip) before the home page renders. Nothing is
unexpectedly large. The ScrollTrigger chunk (18 KB gzip) is gone.

**Images:** responsive portrait (`srcset` 480/800/1200 webp, 30–91 KB) sized by `sizes`.
**Share images:** 166–174 KB per project, 420 KB for home (photo).
**`dist/` total:** 2.3 MB.

**Animations:**
- hero canvas pauses off screen and in hidden tabs;
- card diagrams run only while hovered (desktop) or on screen (touch);
- scroll effects only update while their section is on screen.

### SEO and sharing
All 11 prerendered HTML files have:
- exactly one each of title, description, canonical, `og:*` and `twitter:*`;
- matching URLs;
- an existing 1200 × 630 image.

**JSON-LD:** parses as `Person` with name, jobTitle, url, email, sameAs and alumniOf.

**Site files:**
- `sitemap.xml` is valid, with 6 URLs, each backed by a file.
- `robots.txt` allows everything and points to the sitemap.
- The manifest icon sizes match their files.
- `vercel.json` is valid (rewrites plus `cleanUrls`).

---

## 6. Pre-deploy checklist

1. **Content.** Work through §3: fill or remove the `[to fill]` lines, confirm the years, add
   GitHub links (and screenshots if you have them). Decide on the flagged claims.
2. **Domain.** Decide the final URL. If it isn't `https://shreyaswani.vercel.app`, change
   `SITE_URL` in `src/data/site.ts`.
3. **Contact form:**
   - create a form on formspree.io and copy its endpoint;
   - put it in a local `.env.local` as `VITE_FORMSPREE_ENDPOINT=…` (git-ignored) and test with `npm run dev`.
4. **Build locally.** Run `npm ci` then `npm run build`. It should finish with no errors. Then
   run `npm run preview` and click through once.
5. **Repository.** This folder isn't a git repository yet:
   - run `git init`, then check `git status` before the first commit;
   - `.env.local`, `node_modules` and `dist` are ignored by `.gitignore`.
6. **Vercel:**
   - import the repo (framework: Vite; build `npm run build`; output `dist`);
   - add `VITE_FORMSPREE_ENDPOINT` under Settings → Environment Variables;
   - deploy.
7. **Right after deploying:**
   - [ ] open `/projects/retrace` directly and refresh: the page loads (not a 404);
   - [ ] open `/anything-made-up`: the console-style 404 appears;
   - [ ] send yourself a test message (Formspree asks you to confirm the first one by email);
   - [ ] paste the home URL and one project URL into LinkedIn Post Inspector and opengraph.xyz: the share images appear;
   - [ ] run Google's Rich Results Test on the home URL (Person);
   - [ ] run PageSpeed Insights on home and a project page (mobile and desktop);
   - [ ] in Safari, check the Network tab: each font downloads once;
   - [ ] open your LinkedIn link from the site once.
8. **Optional:** add the site in Google Search Console and submit `/sitemap.xml`.
