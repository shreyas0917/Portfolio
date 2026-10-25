/*
  Scroll-linked effects driven from requestAnimationFrame. The scroll listener
  only wakes the loop; styles are written in the frame, never inside the scroll
  event. (GSAP ScrollTrigger writes them inside the scroll event, which Firefox
  reports in the console as a "scroll-linked positioning effect".)

  Like a scrubbed ScrollTrigger, the rendered progress eases toward the scroll
  position and catches up in about `lag` seconds. The loop sleeps once it has
  caught up. It only runs while `root` is on screen (so nothing is measured
  inside sections skipped by content-visibility), and whenever `root` comes
  into view it renders the current position at once, without easing.
*/

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export function scrollLinked(
  root: Element,
  /** Reads layout and returns the target progress; clamped to 0–1. */
  read: () => number,
  /** Writes styles for a progress value. Called only when the value changes. */
  render: (progress: number) => void,
  { lag = 0.5 }: { lag?: number } = {},
): () => void {
  let current = NaN
  let rendered = NaN
  let raf = 0
  let last = 0
  let onScreen = false

  const tick = (now: number) => {
    raf = 0
    const target = clamp01(read())
    if (Number.isNaN(current)) {
      current = target
    } else {
      const dt = last ? Math.min(now - last, 100) / 1000 : 1 / 60
      current += (target - current) * (1 - Math.exp(-dt / (lag / 4)))
      if (Math.abs(target - current) < 0.0005) current = target
    }
    last = now
    if (current !== rendered) {
      render(current)
      rendered = current
    }
    if (current !== target) raf = requestAnimationFrame(tick)
    else last = 0
  }
  const wake = () => {
    if (onScreen && !raf) raf = requestAnimationFrame(tick)
  }
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting
    if (onScreen) {
      current = NaN
      wake()
    }
  })
  io.observe(root)

  window.addEventListener('scroll', wake, { passive: true })
  window.addEventListener('resize', wake)
  return () => {
    cancelAnimationFrame(raf)
    io.disconnect()
    window.removeEventListener('scroll', wake)
    window.removeEventListener('resize', wake)
  }
}
