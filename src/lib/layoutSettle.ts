/*
  Components that size themselves after rendering (FlowDiagram measures its
  width, then draws; Home mounts its below-the-fold sections after first paint)
  hold layout until their final size is committed. Programmatic scrolls wait
  for the holds so their targets are computed against final heights, not
  placeholders.
*/

let pending = 0
const waiters = new Set<() => void>()

/** Register a pending size change. Returns the release function. */
export function holdLayout(): () => void {
  pending++
  let released = false
  return () => {
    if (released) return
    released = true
    pending--
    if (pending === 0) {
      const ready = [...waiters]
      waiters.clear()
      ready.forEach((run) => run())
    }
  }
}

/**
 * Run `cb` once nothing is pending, or after `timeout` ms at the latest. A
 * release re-checks on the next frame, because one commit can release a hold
 * and register new ones (sections mounting their own diagrams).
 */
export function afterLayoutSettles(cb: () => void, timeout = 1000): void {
  const deadline = performance.now() + timeout
  const attempt = () => {
    if (pending === 0 || performance.now() >= deadline) {
      cb()
      return
    }
    let timer = 0
    const run = () => {
      window.clearTimeout(timer)
      waiters.delete(run)
      requestAnimationFrame(attempt)
    }
    timer = window.setTimeout(run, Math.max(0, deadline - performance.now()))
    waiters.add(run)
  }
  attempt()
}
