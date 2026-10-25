import { m, useMotionValue, useSpring } from 'framer-motion'
import { useRef, type ReactNode, type PointerEvent } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { FINE_POINTER, useMediaQuery } from '../hooks/useMediaQuery'

interface MagneticProps {
  children: ReactNode
  /** Fraction of pointer offset the element follows. Keep subtle. */
  strength?: number
  className?: string
}

/**
 * Pulls its child a few pixels toward the pointer. Mouse-only, off under reduced motion.
 * Wraps any element, so semantics (a / button) stay with the child.
 */
export function Magnetic({ children, strength = 0.22, className }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const fine = useMediaQuery(FINE_POINTER)
  const enabled = fine && !reduced

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 })

  const onMove = (e: PointerEvent) => {
    const el = ref.current
    if (!enabled || !el) return
    const r = el.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <m.span
      ref={ref}
      className={className ?? 'inline-flex'}
      style={enabled ? { x: sx, y: sy } : undefined}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {children}
    </m.span>
  )
}
