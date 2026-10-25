import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { ArrowIcon, ExternalIcon } from '../components/icons'
import { Magnetic } from '../components/Magnetic'
import { Portrait } from '../components/Portrait'
import { SocialLinks } from '../components/SocialLinks'
import { StatusDot } from '../components/StatusDot'
import { profile } from '../data/profile'
import type { Status } from '../data/projects'
import { useSmoothScroll } from '../hooks/useLenis'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useTypewriter } from '../hooks/useTypewriter'
import { afterBoot, isBooting } from '../lib/boot'
import { cn } from '../lib/cn'
import { at } from '../lib/schedule'
import { scrollLinked } from '../lib/scrollLinked'
import { SystemBackground } from '../visuals/SystemBackground'

/*
  Intro timeline (s). The sequence plays as CSS keyframes (`.intro-*`
  in globals.css), so it costs no main-thread work while the page boots.
  0.00  boot command types in
  0.05  portrait wipes up into its frame
  0.35  name rises line by line from a mask
  0.80  title, then tagline words
  1.55  tagline phrases get status underlines: red → amber → green
  1.70  CTAs and socials settle
  idle  live system graph fades in behind everything
*/
const T = { portrait: 0.05, name: 0.35, title: 0.8, tagline: 0.95, underline: 1.55, ctas: 1.7 }

const UNDERLINE: Record<Status, string> = { ok: 'bg-ok', warn: 'bg-warn', fail: 'bg-fail' }

/** `$ systemctl status <name>` typed out, then the service reports healthy. Own component so typing doesn't re-render the Hero. */
function BootLog() {
  const reduced = useReducedMotion()
  // On a first visit, typing starts as the boot overlay (index.html) hands off.
  const [ready, setReady] = useState(() => !isBooting())
  useEffect(() => (ready ? undefined : afterBoot(() => setReady(true))), [ready])
  const boot = useTypewriter(`systemctl status ${profile.firstName.toLowerCase()}`, { delay: 120, speed: 24, enabled: !reduced, paused: !ready })

  return (
    <div className="font-mono text-[12px] leading-relaxed text-fg-muted sm:text-[13px]" aria-hidden="true">
      <p>
        <span className="text-accent">$</span>
        {/* The gap after "$" is a 1ch margin, not a space character: a trailing space would
            move once text follows it. The caret stays put in layout and is moved with
            `translate` (one monospace ch per typed character). Together, typing never
            registers as a layout shift. */}
        <span className="relative ml-[1ch]">
          {boot.text}
          {!boot.done && (
            <span
              className="absolute left-0 top-0 ml-0.5 h-[1.05em] w-[0.55em] translate-y-[2px] bg-fg-muted animate-blink"
              style={{ translate: `${boot.text.length}ch 0` }}
            />
          )}
        </span>
      </p>
      {/* Always rendered (no layout shift); revealed once the command finishes. */}
      <p className={cn('flex flex-wrap items-center gap-x-2', boot.done ? 'intro intro-rise' : 'opacity-0')}>
        <StatusDot live className="translate-y-px" />
        <span className="text-ok">active (running)</span>
        <span className="hidden text-fg-muted lg:inline">· {profile.availability.toLowerCase()}</span>
      </p>
    </div>
  )
}

function Tagline() {
  let wordIndex = 0
  let statusIndex = 0

  return (
    <p className="mt-6 max-w-[34ch] text-[clamp(1.15rem,0.95rem+0.9vw,1.6rem)] leading-snug text-fg-dim">
      {profile.taglineParts.map((chunk, ci) => {
        const words = chunk.text.split(' ')
        const content = words.map((w, wi) => (
          <span key={wi} className="intro intro-word inline-block" style={at(T.tagline + wordIndex++ * 0.04)}>
            {w}
            {wi < words.length - 1 ? ' ' : ''}
          </span>
        ))
        if (!chunk.status) return <span key={ci}>{content} </span>
        const order = statusIndex++
        return (
          <span key={ci}>
            <span className="relative inline-block whitespace-nowrap text-fg">
              {content}
              <span
                aria-hidden="true"
                className={`intro intro-draw absolute -bottom-0.5 left-0 h-[2px] w-full rounded-full ${UNDERLINE[chunk.status]}`}
                style={at(T.underline + order * 0.22)}
              />
            </span>{' '}
          </span>
        )
      })}
    </p>
  )
}

export function Hero() {
  const reduced = useReducedMotion()
  const { scrollTo } = useSmoothScroll()
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const portraitRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)

  // Scroll-out sequence: copy lifts and fades, portrait lags behind, the live graph dims.
  // Progress runs from the section's top at the viewport top (0) to its bottom there (1).
  useEffect(() => {
    const section = sectionRef.current
    const content = contentRef.current
    const portrait = portraitRef.current
    const bg = bgRef.current
    if (reduced || !section || !content || !portrait || !bg) return
    const stop = scrollLinked(
      section,
      () => {
        const r = section.getBoundingClientRect()
        return -r.top / r.height
      },
      (p) => {
        content.style.transform = p ? `translate(0, ${-18 * p}%)` : ''
        content.style.opacity = p ? String(1 - 0.85 * p) : ''
        portrait.style.transform = p ? `translate(0, ${-8 * p}%)` : ''
        bg.style.opacity = p ? String(1 - 0.75 * p) : ''
      },
      { lag: 0.6 },
    )
    return () => {
      stop()
      for (const el of [content, portrait, bg]) {
        el.style.removeProperty('transform')
        el.style.removeProperty('opacity')
      }
    }
  }, [reduced])

  const jump = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    scrollTo(`#${id}`)
  }

  return (
    <section
      ref={sectionRef}
      id="top"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden pb-16 pt-24 sm:pt-28"
    >
      {/* Background: console grid + live system graph */}
      <div ref={bgRef} aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid mask-fade" />
        <div className="absolute inset-0 mask-fade">
          <SystemBackground />
        </div>
        {/* Keep copy legible over the graph */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_25%_50%,rgb(var(--bg)/0.85),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
      </div>

      <div className="shell grid items-center gap-10 md:grid-cols-[1.2fr_0.8fr]">
        {/* ── Copy ── (data-boot-hold: its intro waits for the first-visit boot overlay, see index.html) */}
        <div ref={contentRef} data-boot-hold className="order-2 md:order-1">
          <BootLog />

          <h1 id="hero-title" className="mt-6 font-display text-display-xl font-bold text-fg">
            <span className="sr-only">
              {profile.name}, {profile.title}
            </span>
            {[profile.firstName, profile.lastName].map((line, i) => (
              <span key={line} aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
                <span className="intro intro-mask block" style={at(T.name + i * 0.12)}>
                  {line}
                  {i === 1 && <span className="text-accent">.</span>}
                </span>
              </span>
            ))}
          </h1>

          <p
            className="intro intro-rise mt-5 flex items-center gap-3 font-mono text-[13px] uppercase tracking-[0.16em] text-fg-dim sm:text-sm"
            style={at(T.title)}
          >
            <span className="h-px w-8 bg-accent" aria-hidden="true" />
            {profile.title}
          </p>

          <Tagline />

          {/* CTAs */}
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <div className="intro intro-rise" style={at(T.ctas)}>
              <Magnetic>
                <a href="#projects" onClick={jump('projects')} className="btn-primary group">
                  View Projects
                  <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </Magnetic>
            </div>
            <div className="intro intro-rise" style={at(T.ctas + 0.08)}>
              <Magnetic>
                <a href={profile.resume} target="_blank" rel="noopener noreferrer" className="btn-ghost group">
                  Resume
                  <ExternalIcon className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </Magnetic>
            </div>
            <div className="intro intro-rise" style={at(T.ctas + 0.16)}>
              <Magnetic>
                <a href="#contact" onClick={jump('contact')} className="btn-ghost">
                  Contact
                </a>
              </Magnetic>
            </div>
          </div>

          <div className="intro intro-rise mt-6 flex items-center gap-3" style={at(T.ctas + 0.3)}>
            <span className="label">connect</span>
            <span className="h-px w-6 bg-line-strong" aria-hidden="true" />
            <SocialLinks className="-ml-2" />
          </div>
        </div>

        {/* ── Portrait ── */}
        <div ref={portraitRef} className="order-1 md:order-2">
          <Portrait delay={T.portrait} />
        </div>
      </div>

      {/* Scroll cue: an event travelling down the wire. */}
      <button
        type="button"
        onClick={() => scrollTo('#about')}
        data-boot-hold
        className="intro intro-fade absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
        style={at(T.ctas + 0.6)}
        aria-label="Scroll to About"
      >
        <span className="label">scroll</span>
        <span className="relative h-10 w-px overflow-hidden bg-line-strong">
          <span className="absolute left-0 top-0 h-3 w-px animate-drip bg-accent motion-reduce:hidden" />
        </span>
      </button>
    </section>
  )
}
