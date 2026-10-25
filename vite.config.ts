import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { siteAssets } from './scripts/site-assets'

/**
 * Preload the Latin subsets of both fonts (Space Grotesk ≈22 KB, JetBrains Mono
 * ≈40 KB) so the hero renders in its real fonts from the first frames instead of
 * swapping mid-reveal. The fallbacks are metric-matched (globals.css), so a late
 * swap still doesn't move anything. File names are content-hashed, so they're
 * looked up in the final bundle.
 *
 * The mono preload is low priority. On slow mobile connections it would otherwise
 * share bandwidth with the JS bundles that render the hero, which pushed the
 * Lighthouse LCP back by about 0.2 s. At low priority it still arrives early,
 * just after the critical requests.
 */
function preloadFonts(): Plugin {
  const FONTS: Array<{ pattern: RegExp; priority?: 'low' }> = [
    { pattern: /space-grotesk-latin-wght-normal.*\.woff2$/ },
    { pattern: /jetbrains-mono-latin-wght-normal.*\.woff2$/, priority: 'low' },
  ]
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const files = Object.keys(ctx.bundle ?? {})
        return FONTS.flatMap(({ pattern, priority }) => {
          const file = files.find((f) => pattern.test(f))
          if (!file) return []
          const attrs = { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${file}`, crossorigin: true }
          return [{ tag: 'link', attrs: priority ? { ...attrs, fetchpriority: priority } : attrs, injectTo: 'head' as const }]
        })
      },
    },
  }
}

export default defineConfig({
  // siteAssets: per-route <head> tags, Open Graph images, icons, manifest, sitemap and robots.txt (scripts/site-assets.ts).
  plugins: [react(), preloadFonts(), siteAssets()],
  // Shown in the footer as "last deployed …". In dev it's the server start time.
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Long-lived vendor chunk for React. Framer Motion and GSAP are left to
        // Rollup: their heavy parts (motion features, GSAP) are dynamically
        // imported after first paint, and pinning them here would undo that split.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
