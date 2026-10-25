import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { cn } from '../lib/cn'
import { onIdle } from '../lib/schedule'

/* ──────────────────────────────────────────────────────────────────────────
   "Live system" — a generative service graph.

   • Nodes are services on a jittered grid, each wired to its nearest peers.
   • Events (teal particles) hop node → node, leaving short trails.
   • Incidents are rare and never more than two at once:
       amber  = degraded node; arriving events wait (backoff), then retry and pass.
       red    = failing node; arriving events fall away into a DLQ.
     Every incident ends with a green recovery pulse.
   • The layout is seeded, so it's stable between visits.

   Costs nothing when hidden: paused off-screen (IntersectionObserver) and in
   background tabs; a single static frame under prefers-reduced-motion.
   ────────────────────────────────────────────────────────────────────────── */

type RGB = [number, number, number]
type NodeState = 'ok' | 'warn' | 'fail'

interface Palette {
  edge: RGB
  node: RGB
  event: RGB
  ok: RGB
  warn: RGB
  fail: RGB
}

interface GNode {
  x: number
  y: number
  hub: boolean
  state: NodeState
  until: number
  adj: number[]
}

interface Particle {
  from: number
  to: number
  t: number
  speed: number
  kind: 'event' | 'retry' | 'dead'
  wait: number
  life: number
}

interface Pulse {
  x: number
  y: number
  color: RGB
  age: number
}

const PULSE_LIFE = 0.9
const TRAIL_PX = 18
const MAX_INCIDENTS = 2

function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string) => s.getPropertyValue(`--${n}`).trim().split(/\s+/).map(Number) as RGB
  return { edge: v('fg-muted'), node: v('fg-dim'), event: v('accent'), ok: v('ok'), warn: v('warn'), fail: v('fail') }
}

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

/** Small deterministic PRNG so the graph layout is stable. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildGraph(w: number, h: number, rand: () => number): GNode[] {
  const count = Math.max(12, Math.min(42, Math.round((w * h) / 26000)))
  const cols = Math.max(3, Math.round(Math.sqrt((count * w) / h)))
  const rows = Math.max(3, Math.ceil(count / cols))
  const cw = w / cols
  const ch = h / rows

  const nodes: GNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.12) continue // leave gaps so it doesn't read as a lattice
      nodes.push({
        x: (c + 0.5 + (rand() - 0.5) * 0.7) * cw,
        y: (r + 0.5 + (rand() - 0.5) * 0.7) * ch,
        hub: false,
        state: 'ok',
        until: 0,
        adj: [],
      })
    }
  }

  const link = (a: number, b: number) => {
    if (a === b || nodes[a].adj.includes(b)) return
    nodes[a].adj.push(b)
    nodes[b].adj.push(a)
  }
  const maxDist = Math.hypot(cw, ch) * 1.25
  nodes.forEach((n, i) => {
    const nearest = nodes
      .map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
    nearest.slice(0, 2).forEach((o, k) => {
      // Always keep the first link so no node is isolated.
      if (k === 0 || o.d < maxDist) link(i, o.j)
    })
  })
  nodes.forEach((n) => (n.hub = n.adj.length >= 4))
  return nodes
}

interface SystemBackgroundProps {
  className?: string
  seed?: number
}

export function SystemBackground({ className, seed = 917 }: SystemBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let w = 0
    let h = 0
    let nodes: GNode[] = []
    let particles: Particle[] = []
    let pulses: Pulse[] = []
    let palette = readPalette()
    let rand = mulberry32(seed)
    let time = 0
    let spawnAcc = 0
    let incidentTimer = 1.5
    let pointer: { x: number; y: number } | null = null

    let raf = 0
    let last = 0
    let running = false
    let inView = true

    const len = (p: Particle) => {
      const a = nodes[p.from]
      const b = nodes[p.to]
      return Math.hypot(b.x - a.x, b.y - a.y) || 1
    }

    const spawn = (randomT = false) => {
      const from = Math.floor(rand() * nodes.length)
      const adj = nodes[from].adj
      if (!adj.length) return
      particles.push({
        from,
        to: adj[Math.floor(rand() * adj.length)],
        t: randomT ? rand() : 0,
        speed: 45 + rand() * 55,
        kind: 'event',
        wait: 0,
        life: 1,
      })
    }

    const pulse = (n: GNode, color: RGB) => pulses.push({ x: n.x, y: n.y, color, age: 0 })

    const forward = (p: Particle) => {
      const n = nodes[p.to]
      const options = n.adj.length > 1 ? n.adj.filter((j) => j !== p.from) : n.adj
      p.from = p.to
      p.to = options[Math.floor(rand() * options.length)]
      p.t = 0
    }

    /** Returns false when the particle should be removed. */
    const arrive = (p: Particle): boolean => {
      const n = nodes[p.to]
      p.t = 1
      if (n.state === 'fail') {
        p.kind = 'dead'
        p.life = 1
        return true
      }
      if (n.state === 'warn' && p.kind !== 'retry') {
        p.kind = 'retry'
        p.wait = 0.35 + rand() * 0.6 // backoff, then retry
        return true
      }
      if (p.kind === 'retry') p.kind = 'event' // retry succeeded
      if (rand() < 0.75) {
        forward(p)
        return true
      }
      return false // consumed
    }

    const setup = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      rand = mulberry32(seed)
      nodes = buildGraph(w, h, rand)
      particles = []
      pulses = []
      const initial = Math.round(nodes.length * 0.9)
      for (let i = 0; i < initial; i++) spawn(true)

      if (reduced) {
        // A single, calm still: one amber node so the motif still reads.
        const hub = nodes.find((n) => n.hub) ?? nodes[0]
        if (hub) hub.state = 'warn'
      }
    }

    const step = (dt: number) => {
      time += dt

      // Incidents: resolve expired, occasionally start a new one.
      let active = 0
      for (const n of nodes) {
        if (n.state !== 'ok' && time > n.until) {
          n.state = 'ok'
          pulse(n, palette.ok)
        }
        if (n.state !== 'ok') active++
      }
      incidentTimer -= dt
      if (incidentTimer <= 0 && active < MAX_INCIDENTS) {
        const candidates = nodes.filter((n) => n.state === 'ok' && n.adj.length >= 2)
        const n = candidates[Math.floor(rand() * candidates.length)]
        if (n) {
          const fail = rand() < 0.3
          n.state = fail ? 'fail' : 'warn'
          n.until = time + (fail ? 1.8 : 2.8)
          pulse(n, fail ? palette.fail : palette.warn)
        }
        incidentTimer = 2.2 + rand() * 3
      }

      // Steady event traffic.
      const maxParticles = Math.round(nodes.length * 1.6)
      spawnAcc += dt * nodes.length * 0.12
      while (spawnAcc >= 1) {
        spawnAcc -= 1
        if (particles.length < maxParticles) spawn()
      }

      // Move particles; compact the array in place.
      let k = 0
      for (const p of particles) {
        let keep = true
        if (p.kind === 'dead') {
          p.life -= dt * 1.4
          keep = p.life > 0
        } else if (p.wait > 0) {
          p.wait -= dt
          if (p.wait <= 0) forward(p)
        } else {
          p.t += (p.speed * dt) / len(p)
          if (p.t >= 1) keep = arrive(p)
        }
        if (keep) particles[k++] = p
      }
      particles.length = k

      for (const pl of pulses) pl.age += dt
      pulses = pulses.filter((pl) => pl.age < PULSE_LIFE)
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      ctx.lineWidth = 1

      // Edges
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (const j of a.adj) {
          if (j < i) continue
          const b = nodes[j]
          let alpha = 0.13
          if (pointer) {
            const d = Math.hypot((a.x + b.x) / 2 - pointer.x, (a.y + b.y) / 2 - pointer.y)
            if (d < 180) alpha += 0.22 * (1 - d / 180)
          }
          ctx.strokeStyle = rgba(palette.edge, alpha)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // Recovery / incident pulses
      for (const pl of pulses) {
        const k = pl.age / PULSE_LIFE
        ctx.strokeStyle = rgba(pl.color, 0.55 * (1 - k))
        ctx.beginPath()
        ctx.arc(pl.x, pl.y, 4 + k * 30, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Particles + trails
      for (const p of particles) {
        const a = nodes[p.from]
        const b = nodes[p.to]
        const x = a.x + (b.x - a.x) * p.t
        const y = a.y + (b.y - a.y) * p.t

        if (p.kind === 'dead') {
          // Falls away into the DLQ.
          const drop = (1 - p.life) * 14
          ctx.fillStyle = rgba(palette.fail, 0.85 * p.life)
          ctx.beginPath()
          ctx.arc(x, y + drop, 1.8, 0, Math.PI * 2)
          ctx.fill()
          continue
        }

        const color = p.kind === 'retry' ? palette.warn : palette.event
        if (p.wait <= 0) {
          const tt = Math.max(0, p.t - TRAIL_PX / len(p))
          ctx.strokeStyle = rgba(color, 0.35)
          ctx.beginPath()
          ctx.moveTo(a.x + (b.x - a.x) * tt, a.y + (b.y - a.y) * tt)
          ctx.lineTo(x, y)
          ctx.stroke()
        }
        // Waiting (backoff) events blink.
        const blink = p.wait > 0 ? 0.45 + 0.55 * Math.abs(Math.sin(time * 9)) : 0.9
        ctx.fillStyle = rgba(color, blink)
        ctx.beginPath()
        ctx.arc(x, y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }

      // Nodes, drawn last so they sit on top of traffic.
      ctx.font = '500 10px "JetBrains Mono Variable", ui-monospace, monospace'
      for (const n of nodes) {
        const s = n.hub ? 5 : 3.5
        if (n.state === 'ok') {
          ctx.fillStyle = rgba(palette.node, n.hub ? 0.55 : 0.35)
          ctx.fillRect(n.x - s / 2, n.y - s / 2, s, s)
          if (n.hub) {
            ctx.strokeStyle = rgba(palette.node, 0.22)
            ctx.strokeRect(n.x - s / 2 - 3, n.y - s / 2 - 3, s + 6, s + 6)
          }
          continue
        }
        const c = n.state === 'warn' ? palette.warn : palette.fail
        ctx.fillStyle = rgba(c, 0.14)
        ctx.beginPath()
        ctx.arc(n.x, n.y, 11, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = rgba(c, 0.95)
        ctx.fillRect(n.x - s / 2, n.y - s / 2, s, s)
        ctx.fillStyle = rgba(c, 0.8)
        ctx.fillText(n.state === 'warn' ? 'retry' : '→ dlq', n.x + 10, n.y - 8)
      }
    }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      step(dt)
      draw()
      raf = requestAnimationFrame(frame)
    }

    const sync = () => {
      const shouldRun = !reduced && inView && !document.hidden
      if (shouldRun && !running) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(frame)
      } else if (!shouldRun && running) {
        running = false
        cancelAnimationFrame(raf)
      }
    }

    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect()
      if (r.width === w && r.height === h) return
      setup()
      draw()
    })

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      sync()
    })

    const mo = new MutationObserver(() => {
      palette = readPalette()
      if (!running) draw()
    })

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = canvas.getBoundingClientRect()
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onPointerOut = () => (pointer = null)

    // Decorative, so it waits until the browser is idle: the intro text and
    // portrait get the main thread first, then the graph fades in.
    const boot = () => {
      setup()
      draw()
      sync()
      canvas.style.opacity = '1'
      ro.observe(canvas)
      io.observe(canvas)
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      window.addEventListener('pointermove', onPointer, { passive: true })
      document.addEventListener('pointerleave', onPointerOut)
      document.addEventListener('visibilitychange', sync)
      // Repaint once web fonts land so node labels use JetBrains Mono.
      document.fonts?.ready.then(() => !running && draw())
    }
    const cancelBoot = onIdle(boot, 1200)

    return () => {
      cancelBoot()
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('pointerleave', onPointerOut)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [reduced, seed])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none block h-full w-full opacity-0 transition-opacity duration-[1400ms] ease-out', className)}
    />
  )
}
