import type { Status } from '../data/projects'
import { cn } from '../lib/cn'

const COLOR: Record<Status, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  fail: 'bg-fail',
}

interface StatusDotProps {
  status?: Status
  /** Adds a soft heartbeat pulse + halo. Use for "live" indicators only. */
  live?: boolean
  className?: string
}

/** The site's recurring motif: a status light. Green healthy, amber retry, red failure. */
export function StatusDot({ status = 'ok', live = false, className }: StatusDotProps) {
  return (
    <span className={cn('relative inline-flex h-2 w-2 shrink-0', className)} aria-hidden="true">
      {live && <span className={cn('absolute inset-0 rounded-full opacity-60 animate-heartbeat blur-[3px]', COLOR[status])} />}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', COLOR[status])} />
    </span>
  )
}
