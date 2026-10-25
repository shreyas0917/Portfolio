import { useEffect, useState } from 'react'

interface Options {
  /** Delay before typing starts, ms. */
  delay?: number
  /** Per-character interval, ms. */
  speed?: number
  /** When false, the full text is returned immediately (reduced motion). */
  enabled?: boolean
  /** While true, nothing is typed yet; `delay` counts from when it turns false. */
  paused?: boolean
}

/** Types `text` out character by character. Returns the visible slice and a done flag. */
export function useTypewriter(text: string, { delay = 0, speed = 28, enabled = true, paused = false }: Options = {}) {
  const [count, setCount] = useState(enabled ? 0 : text.length)

  useEffect(() => {
    if (!enabled) {
      setCount(text.length)
      return
    }
    setCount(0)
    if (paused) return
    let interval = 0
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setCount((c) => {
          if (c >= text.length) {
            window.clearInterval(interval)
            return c
          }
          return c + 1
        })
      }, speed)
    }, delay)
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [text, delay, speed, enabled, paused])

  return { text: text.slice(0, count), done: count >= text.length }
}
