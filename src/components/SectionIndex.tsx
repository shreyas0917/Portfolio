import { useEffect, useState } from 'react'
import { useSmoothScroll } from '../hooks/useLenis'
import { cn } from '../lib/cn'

export interface IndexEntry {
  id: string
  label: string
}

/**
 * Docs-style "on this page" index: sticky on desktop, hidden on phones.
 * The current section is the one crossing a band in the upper-middle of the viewport.
 */
export function SectionIndex({ entries }: { entries: IndexEntry[] }) {
  const { scrollTo } = useSmoothScroll()
  const [active, setActive] = useState(entries[0]?.id)

  useEffect(() => {
    const els = entries.map((e) => document.getElementById(e.id)).filter((el): el is HTMLElement => el !== null)
    const io = new IntersectionObserver(
      (list) => {
        for (const entry of list) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [entries])

  return (
    <aside className="hidden lg:block" aria-label="On this page">
      <nav className="sticky top-28">
        <p className="label">on this page</p>
        <ol className="mt-4 border-l border-line">
          {entries.map((entry, i) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => scrollTo(`#${entry.id}`)}
                aria-current={active === entry.id ? 'location' : undefined}
                className={cn(
                  '-ml-px block w-full border-l py-1.5 pl-4 text-left font-mono text-[12px] leading-snug transition-colors',
                  active === entry.id ? 'border-accent text-fg' : 'border-transparent text-fg-muted hover:text-fg',
                )}
              >
                <span className="mr-2 text-fg-muted">{String(i + 1).padStart(2, '0')}</span>
                {entry.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  )
}
