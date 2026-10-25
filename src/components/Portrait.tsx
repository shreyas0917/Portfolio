import { m, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef, type PointerEvent } from 'react'
import { profile } from '../data/profile'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { FINE_POINTER, useMediaQuery } from '../hooks/useMediaQuery'
import { at } from '../lib/schedule'
import { StatusDot } from './StatusDot'

const SIZES = '(min-width: 1024px) 400px, (min-width: 768px) 280px, 52vw'

/**
 * Portrait framed as a monitored node:
 * - thin status ring (rotating green sweep over a hairline border)
 * - soft vignette + faint slate duotone so it melts into the dark theme
 * - pointer tilt with counter-parallax on the photo (mouse only)
 * Face stays natural: only a touch of contrast, no heavy filters.
 *
 * Intro (lift, wipe, settle) is CSS keyframes on `translate`/`clip-path`/`scale`,
 * which compose with the Framer Motion tilt/parallax `transform`s on the same nodes.
 */
export function Portrait({ delay = 0.05 }: { delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const fine = useMediaQuery(FINE_POINTER)
  const interactive = fine && !reduced

  // Pointer position normalised to [-0.5, 0.5].
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const spring = { stiffness: 150, damping: 18, mass: 0.5 }
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), spring)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), spring)
  const imgX = useSpring(useTransform(px, [-0.5, 0.5], [10, -10]), spring)
  const imgY = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), spring)
  const glare = useTransform(px, (v) => `radial-gradient(40% 35% at ${50 + v * 60}% 15%, rgba(255,255,255,0.18), transparent 70%)`)

  const onMove = (e: PointerEvent) => {
    if (!interactive || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onLeave = () => {
    px.set(0)
    py.set(0)
  }

  return (
    // Movement only, no fade: the photo is the LCP element and must count as visible from its first paint.
    <figure className="intro intro-lift relative mx-auto w-[min(52vw,240px)] md:w-[280px] lg:w-[400px]" style={{ perspective: 1100, ...at(delay) }}>
      {/* Corner brackets: a viewfinder framing the "node". */}
      <span aria-hidden="true" className="pointer-events-none absolute -inset-3 sm:-inset-4">
        {['left-0 top-0 border-l border-t', 'right-0 top-0 border-r border-t', 'left-0 bottom-0 border-l border-b', 'right-0 bottom-0 border-r border-b'].map(
          (pos) => (
            <span key={pos} className={`absolute h-4 w-4 border-fg-muted/50 ${pos}`} />
          ),
        )}
      </span>

      <m.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={interactive ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
        className="relative overflow-hidden rounded-xl bg-line p-px shadow-[0_30px_80px_-30px_rgb(var(--shadow)/0.7)]"
      >
        {/* Status ring: a green sweep orbiting the hairline border. */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 aspect-square w-[180%] -translate-x-1/2 -translate-y-1/2 animate-ring-spin motion-reduce:animate-none"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg 250deg, rgb(var(--ok) / 0.15) 290deg, rgb(var(--ok)) 345deg, transparent 360deg)',
          }}
        />

        <div className="relative overflow-hidden rounded-[11px] bg-surface">
          <div className="intro intro-wipe relative aspect-[4/5]" style={at(delay + 0.05)}>
            <m.picture
              className="intro intro-settle absolute -inset-3 block"
              style={interactive ? { x: imgX, y: imgY, ...at(delay + 0.05) } : at(delay + 0.05)}
            >
              {/* WebP straight on the <img>, attributes in this order: sizes, srcSet, src. React sets
                  them in order before the element is inserted, and Safari picks and starts loading
                  an image on each change. Any other order (or a separate <source>) made Safari
                  download a second, wrong-sized file. */}
              <img
                sizes={SIZES}
                srcSet={profile.photo.webp.map((s) => `${s.src} ${s.width}w`).join(', ')}
                src={profile.photo.webp.find((s) => s.width === 800)?.src ?? profile.photo.fallback}
                alt={profile.photo.alt}
                width={profile.photo.width}
                height={profile.photo.height}
                loading="eager"
                decoding="async"
                // React 18 only knows the lowercase attribute.
                {...{ fetchpriority: 'high' }}
                className="h-full w-full object-cover object-[50%_30%] [filter:contrast(1.04)_saturate(0.92)]"
              />
            </m.picture>

            {/* Subtle slate duotone: tints shadows cool to match the palette, leaves skin tones alone. */}
            <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(160deg,rgb(var(--accent)/0.10),transparent_45%,rgb(var(--bg)/0.35))] mix-blend-soft-light" />
            {/* Soft vignette that melts the frame into the background. */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'radial-gradient(120% 90% at 50% 30%, transparent 55%, rgb(var(--bg) / 0.55) 100%)' }}
            />
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg/85 to-transparent" />

            {/* Glare that tracks the pointer. */}
            {interactive && (
              <m.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-60 mix-blend-overlay"
                style={{ background: glare }}
              />
            )}

            {/* HUD overlay */}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/80 sm:p-3 sm:text-[10px]">
              <span className="flex items-center gap-1.5 rounded bg-black/35 px-2 py-1 backdrop-blur-sm">
                <StatusDot live /> healthy
              </span>
              <span className="hidden rounded bg-black/35 px-2 py-1 backdrop-blur-sm sm:inline">node {profile.initials}-01</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 hidden p-4 md:block">
              {/* fg-dim, not fg-muted: over the photo, muted text measured 3.4:1. */}
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim">role</p>
              <p className="mt-1 whitespace-nowrap font-mono text-[10px] text-fg lg:text-[12px]">{profile.focus.join(' · ')}</p>
            </div>
          </div>
        </div>
      </m.div>
    </figure>
  )
}
