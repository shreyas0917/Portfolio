import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

/** Leading number of a metric, with whatever surrounds it: "12/12" → ["", "12", "/12"]. */
const NUMBER = /^(\D*?)(\d+(?:\.\d+)?)(.*)$/

interface CountUpProps {
  value: string
  /** Seconds. */
  duration?: number
}

/**
 * Counts a metric's leading number up from 0 the first time it's on screen
 * ("98+", "250+", "6h", "12/12"). Values without a number, or 0, render as-is.
 * Screen readers always get the final value; reduced motion shows it at once.
 */
export function CountUp({ value, duration = 1.4 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const match = NUMBER.exec(value)
  const animate = !reduced && match !== null && Number(match[2]) > 0

  useEffect(() => {
    const el = ref.current
    // Update React's own text node in place rather than replacing it via textContent.
    const text = el?.firstChild
    const parts = NUMBER.exec(value)
    if (!el || !(text instanceof Text) || !animate || !parts) return
    const [, prefix, digits, suffix] = parts
    const target = Number(digits)
    const decimals = digits.split('.')[1]?.length ?? 0
    const format = (v: number) => `${prefix}${decimals ? v.toFixed(decimals) : Math.round(v)}${suffix}`

    let raf = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const k = Math.min(1, (now - start) / (duration * 1000))
          text.nodeValue = format(k === 1 ? target : target * (1 - Math.pow(2, -10 * k)))
          if (k < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [animate, value, duration])

  const initial = animate && match ? `${match[1]}0${match[3]}` : value
  return (
    <>
      {/* The final value sits invisibly in the same grid cell, so the box is its
          final size from the start: counting up never shifts or re-wraps layout. */}
      <span aria-hidden="true" className="inline-grid">
        <span className="invisible col-start-1 row-start-1">{value}</span>
        <span ref={ref} className="col-start-1 row-start-1">
          {initial}
        </span>
      </span>
      <span className="sr-only">{value}</span>
    </>
  )
}
