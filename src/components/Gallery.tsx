import { useRef, useState, type KeyboardEvent } from 'react'
import type { Screenshot } from '../data/projects'
import { StatusDot } from './StatusDot'

/** Placeholder for projects without screenshots: a console listing, not an empty grid. */
function ComingSoon() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface/40 px-5 py-7 sm:px-7">
      <div aria-hidden="true" className="absolute inset-0 bg-grid mask-fade" />
      <div className="relative font-mono text-[12px] sm:text-[13px]">
        <p className="text-fg-muted">
          <span className="text-accent">$</span> ls ./screenshots
        </p>
        <p className="mt-1.5 text-fg-muted">0 files</p>
        <p className="mt-5 flex items-center gap-2 text-fg-dim">
          <StatusDot status="warn" /> screenshots coming soon
        </p>
      </div>
    </div>
  )
}

/**
 * Screenshot grid with a lightbox on the native <dialog> (focus handling and
 * Esc to close come built in). Arrow keys page through; clicking outside closes.
 */
export function Gallery({ shots, title }: { shots: Screenshot[]; title: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [current, setCurrent] = useState<number | null>(null)

  if (shots.length === 0) return <ComingSoon />

  const open = (i: number) => {
    setCurrent(i)
    dialogRef.current?.showModal()
  }
  const close = () => dialogRef.current?.close()
  const step = (delta: number) => setCurrent((c) => (c === null ? c : (c + delta + shots.length) % shots.length))
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') step(1)
    else if (e.key === 'ArrowLeft') step(-1)
  }
  const shot = current === null ? null : shots[current]

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {shots.map((s, i) => (
          <li key={s.src}>
            <button
              type="button"
              onClick={() => open(i)}
              className="group block w-full overflow-hidden rounded-xl border border-line bg-surface/60 text-left transition-colors hover:border-line-strong"
            >
              <span className="block overflow-hidden">
                <img
                  src={s.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/10] w-full object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.02]"
                />
              </span>
              <span className="block border-t border-line px-4 py-3 font-mono text-[12px] text-fg-dim">{s.caption}</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        data-lenis-prevent
        aria-label={`${title} screenshots`}
        className="lightbox m-auto max-h-[94vh] w-[min(94vw,72rem)] overflow-visible bg-transparent p-0 text-fg"
        onClose={() => setCurrent(null)}
        onKeyDown={onKeyDown}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        {shot && current !== null && (
          <figure className="overflow-hidden rounded-xl border border-line-strong bg-bg-elev">
            <img src={shot.src} alt={shot.caption} className="max-h-[78vh] w-full bg-bg object-contain" />
            <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 font-mono text-[12px] text-fg-dim">
              <span>{shot.caption}</span>
              <span className="flex items-center gap-2">
                <span className="text-fg-muted">
                  {current + 1} / {shots.length}
                </span>
                {shots.length > 1 && (
                  <>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => step(-1)} aria-label="Previous screenshot">
                      ←
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => step(1)} aria-label="Next screenshot">
                      →
                    </button>
                  </>
                )}
                <button type="button" className="btn-ghost btn-sm" onClick={close}>
                  close <span className="text-fg-muted">esc</span>
                </button>
              </span>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  )
}
