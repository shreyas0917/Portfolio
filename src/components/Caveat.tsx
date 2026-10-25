import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { StatusDot } from './StatusDot'

interface CaveatProps {
  children: ReactNode
  /** Read to screen readers before the text, e.g. "cache impact". */
  label?: string
  className?: string
}

/** Honesty caveat: the same dashed amber treatment as unverified figures on the project cards. */
export function Caveat({ children, label, className }: CaveatProps) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg border border-dashed border-warn/50 bg-warn/5 px-3 py-2.5 font-mono text-[11px] leading-snug text-warn',
        className,
      )}
    >
      <StatusDot status="warn" className="mt-1" />
      <span>
        <span className="sr-only">{label ? `Caveat, ${label}: ` : 'Caveat: '}</span>
        {children}
      </span>
    </p>
  )
}
