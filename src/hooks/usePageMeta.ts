import { useEffect } from 'react'
import { absoluteUrl, metaEntries, type PageMeta } from '../lib/seo'

function upsertMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (content === null) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * Keeps <title>, description, canonical, Open Graph and Twitter tags in step with
 * the current route during client-side navigation. The same tags are written
 * into each route's HTML at build time (lib/seo + vite.config.ts) for crawlers.
 */
export function usePageMeta(meta: PageMeta) {
  const { path, title, description, image, imageAlt, type, noindex } = meta
  useEffect(() => {
    const m: PageMeta = { path, title, description, image, imageAlt, type, noindex }
    document.title = m.title
    for (const [attr, key, content] of metaEntries(m)) upsertMeta(attr, key, content)
    upsertMeta('name', 'robots', m.noindex ? 'noindex' : null)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = absoluteUrl(m.path)
  }, [path, title, description, image, imageAlt, type, noindex])
}
