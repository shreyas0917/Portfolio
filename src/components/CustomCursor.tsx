import { m, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { FINE_POINTER, useMediaQuery } from '../hooks/useMediaQuery'
import { cn } from '../lib/cn'

const INTERACTIVE = 'a, button, select, label, summary, [role="button"], [data-cursor="hover"], .flow-hit'
const TEXT_FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"]'

type Mode = 'default' | 'hover' | 'label' | 'text'

/** What the pointer is over decides the cursor's shape. */
function modeFor(target: Element): { mode: Mode; label?: string } {
  if (target.closest(TEXT_FIELD)) return { mode: 'text' }
  const labelled = target.closest<HTMLElement>('[data-cursor-label]')
  const interactive = target.closest(INTERACTIVE)
  // A card that opens as a whole shows its label, unless the pointer is on one of its own buttons or links.
  if (labelled && (!interactive || interactive === labelled)) return { mode: 'label', label: labelled.dataset.cursorLabel }
  if (interactive) return { mode: 'hover' }
  return { mode: 'default' }
}

const RING: Record<Mode, { width: number; height: number; borderRadius: number; opacity: number }> = {
  default: { width: 26, height: 26, borderRadius: 13, opacity: 0.55 },
  hover: { width: 44, height: 44, borderRadius: 22, opacity: 1 },
  label: { width: 58, height: 58, borderRadius: 29, opacity: 1 },
  // A caret alongside the native I-beam, which stays visible over fields.
  text: { width: 2, height: 22, borderRadius: 1, opacity: 0.9 },
}

/**
 * Desktop-only cursor: a precise dot plus a lagging ring that expands over
 * interactive targets, reads "open" over project cards and narrows to a caret
 * over text fields. Not rendered on touch or under reduced motion.
 *
 * The native cursor is hidden only where this one fully replaces it (globals.css):
 * form fields keep their I-beam, a text-selection drag gets it back, and modal
 * dialogs (in the top layer, above this overlay) use the native cursor throughout.
 */
export function CustomCursor() {
  const fine = useMediaQuery(FINE_POINTER)
  const reduced = useReducedMotion()
  const enabled = fine && !reduced

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const rx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.6 })
  const ry = useSpring(y, { stiffness: 380, damping: 32, mass: 0.6 })
  const [state, setState] = useState<{ mode: Mode; label?: string }>({ mode: 'default' })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.classList.add('has-custom-cursor')
    let selecting = false

    const setSelecting = (on: boolean) => {
      if (on === selecting) return
      selecting = on
      root.classList.toggle('cursor-selecting', on)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x.set(e.clientX)
      y.set(e.clientY)
      const target = e.target instanceof Element ? e.target : null
      // Dragging out a text selection: show the native I-beam instead.
      if (e.buttons === 1 && !selecting && !target?.closest(TEXT_FIELD)) setSelecting(!(window.getSelection()?.isCollapsed ?? true))
      setVisible(!selecting && !!target && !target.closest('dialog[open]'))
      if (!target) return
      const next = modeFor(target)
      setState((s) => (s.mode === next.mode && s.label === next.label ? s : next))
    }
    const onUp = () => setSelecting(false)
    const onLeave = () => setVisible(false)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    document.addEventListener('pointerleave', onLeave)
    return () => {
      root.classList.remove('has-custom-cursor', 'cursor-selecting')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [enabled, x, y])

  if (!enabled) return null
  const { mode, label } = state

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100]" style={{ opacity: visible ? 1 : 0 }}>
      <m.div
        className={cn(
          'absolute left-0 top-0 grid place-items-center overflow-hidden border border-accent/70 transition-colors duration-200',
          // Label mode is a solid disc, so "open" stays legible over the card's text.
          mode === 'text' ? 'bg-accent' : mode === 'label' ? 'bg-bg/90' : 'bg-transparent',
        )}
        style={{ x: rx, y: ry, translateX: '-50%', translateY: '-50%' }}
        initial={false}
        animate={RING[mode]}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        {mode === 'label' && (
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-accent">{label}</span>
        )}
      </m.div>
      <m.div
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-accent"
        style={{ x, y, translateX: '-50%', translateY: '-50%' }}
        initial={false}
        animate={{ opacity: mode === 'label' || mode === 'text' ? 0 : 1 }}
        transition={{ duration: 0.15 }}
      />
    </div>
  )
}
