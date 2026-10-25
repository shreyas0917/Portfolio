import { m, useMotionValue, useSpring } from 'framer-motion'
import { useEffect } from 'react'
import type { Status } from '../data/projects'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { cn } from '../lib/cn'

const BAR: Record<Status, string> = { ok: 'bg-ok', warn: 'bg-warn', fail: 'bg-fail' }

/** Reading progress along the top edge, in the project's status colour. */
export function ScrollProgress({ status }: { status: Status }) {
  const reduced = useReducedMotion()
  const progress = useMotionValue(0)
  const smooth = useSpring(progress, { stiffness: 220, damping: 32, restDelta: 0.001 })

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      progress.set(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [progress])

  return (
    <m.div
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left', BAR[status])}
      style={{ scaleX: reduced ? progress : smooth }}
    />
  )
}
