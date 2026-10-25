import { m, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface SectionHeadingProps {
  /** Console-style index, e.g. "02". */
  index: string
  /** Mono route label shown above the title, e.g. "projects". */
  kicker: string
  title: string
  id?: string
  /** Replaces the "02 ── ~/kicker" line, e.g. with a console status bar. */
  bar?: ReactNode
}

const EASE = [0.16, 1, 0.3, 1] as const

const kickerVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } },
}

const titleVariants: Variants = {
  hidden: { y: '105%' },
  show: { y: '0%', transition: { duration: 0.8, ease: EASE, delay: 0.08 } },
}

export function SectionHeading({ index, kicker, title, id, bar }: SectionHeadingProps) {
  const reduced = useReducedMotion()
  return (
    // The header is the in-view trigger, not the title: the title starts fully
    // clipped by its overflow-hidden mask, and IntersectionObserver never reports
    // a clipped-away element as visible.
    <m.header
      className="mb-10 sm:mb-14"
      initial={reduced ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, margin: '-15% 0px' }}
    >
      {bar ? (
        <m.div variants={kickerVariants}>{bar}</m.div>
      ) : (
        <m.p className="label flex items-center gap-3" variants={kickerVariants}>
          <span className="text-accent">{index}</span>
          <span className="h-px w-8 bg-line-strong" />
          <span>~/{kicker}</span>
        </m.p>
      )}
      <div className="overflow-hidden">
        <m.h2 id={id} className="mt-4 font-display text-display-md font-semibold text-fg" variants={titleVariants}>
          {title}
        </m.h2>
      </div>
    </m.header>
  )
}
