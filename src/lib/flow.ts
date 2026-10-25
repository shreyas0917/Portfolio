import type { ArchitectureFlow, Status, Tone } from '../data/projects'

/*
  Architecture-flow engine for the project cards.
  1. planFlow    turns a flow's packet scripts into a timeline (seconds).
  2. layoutFlow  places nodes for the measured width: a horizontal pipeline,
                 or a vertical one when the labels wouldn't fit.
  3. createFrameWriter draws time t straight into the SVG (attribute writes,
                 no React renders); createPlayer loops it while a card is active.
*/

// Timing, in seconds.
const HOP = 0.55 // one edge at pace 1
const ABSORB = 0.35 // a packet fading into its last node
const PULSE = 0.55 // ring when a packet reaches a node
const NOTE_IN = 0.25
const TRACE_DELAY = 0.3
const TRACE_DRAW = 0.7
const HOLD = 1.8 // final state held before the loop restarts
const FADE = 0.5 // final state fading out between loops
const TRAIL = 0.12

interface NodeEvent {
  t: number
  tone: Tone
  /** Present when the event sets the node's resting state (a mark or a trace). */
  status?: Status
  note?: string
}
type StateEvent = NodeEvent & { status: Status }

interface PacketPlan {
  start: number
  hop: number
  path: number[]
  end: number
  tones: Array<{ t: number; tone: Tone }>
}

interface TracePlan {
  from: number
  to: number
  t0: number
  t1: number
  status: Status
  note: string
}

export interface FlowPlan {
  packets: PacketPlan[]
  events: NodeEvent[][]
  trace?: TracePlan
  /** Everything has happened: the resting frame. */
  settleAt: number
  fadeStart: number
  cycle: number
}

export function planFlow(flow: ArchitectureFlow): FlowPlan {
  const index = new Map(flow.nodes.map((node, i) => [node.id, i]))
  const at = (id: string) => {
    const i = index.get(id)
    if (i === undefined) throw new Error(`Flow references unknown node "${id}"`)
    return i
  }
  const events: NodeEvent[][] = flow.nodes.map(() => [])
  let settleAt = 0

  const packets = flow.packets.map((packet) => {
    const path = packet.path.map(at)
    if (import.meta.env.DEV && path.some((node, k) => k > 0 && Math.abs(node - path[k - 1]) !== 1)) {
      console.warn(`Flow packet skips a node: ${packet.path.join(' → ')}`)
    }
    const hop = HOP * (packet.pace ?? 1)
    let tone: Tone = packet.tone ?? 'info'
    const tones = [{ t: packet.start, tone }]
    const marked = new Set<number>()

    path.forEach((node, k) => {
      if (k === 0) return
      const t = packet.start + k * hop
      const mark = packet.marks?.[flow.nodes[node].id]
      if (mark && !marked.has(node)) {
        marked.add(node)
        tone = mark.status
        tones.push({ t, tone })
        events[node].push({ t, tone, status: mark.status, note: mark.note })
      } else {
        events[node].push({ t, tone })
      }
    })

    const end = packet.start + (path.length - 1) * hop
    settleAt = Math.max(settleAt, end + ABSORB)
    return { start: packet.start, hop, path, end, tones }
  })

  let trace: TracePlan | undefined
  if (flow.trace) {
    const from = at(flow.trace.from)
    const to = at(flow.trace.to)
    const t0 = Math.max(0, ...events[from].map((e) => e.t)) + TRACE_DELAY
    const t1 = t0 + TRACE_DRAW
    trace = { from, to, t0, t1, status: flow.trace.status, note: flow.trace.note }
    events[to].push({ t: t1, tone: flow.trace.status, status: flow.trace.status })
    settleAt = Math.max(settleAt, t1 + NOTE_IN)
  }

  events.forEach((list) => list.sort((a, b) => a.t - b.t))
  const fadeStart = settleAt + HOLD
  return { packets, events, trace, settleAt, fadeStart, cycle: fadeStart + FADE }
}

/* ── Layout ───────────────────────────────────────────────────────────── */

type Anchor = 'start' | 'middle' | 'end'
interface TextSpot {
  x: number
  y: number
  anchor: Anchor
}

export interface FlowLayout {
  orientation: 'horizontal' | 'vertical'
  /** False when a horizontal pipeline only fits without the small second lines. */
  showDetail: boolean
  width: number
  height: number
  points: Array<{ x: number; y: number }>
  label: TextSpot[]
  detail: TextSpot[]
  note: TextSpot[]
  trace?: { d: string; length: number; note: TextSpot }
}

const LABEL_PX = 10
const DETAIL_PX = 9
const NOTE_PX = 9.5
/** JetBrains Mono advances are exactly 0.6em, so text width is predictable. */
const textWidth = (text: string | undefined, px: number) => (text ? text.length * px * 0.6 : 0)

export function layoutFlow(flow: ArchitectureFlow, width: number): FlowLayout {
  const last = flow.nodes.length - 1
  const labels = flow.nodes.map((node) => textWidth(node.label, LABEL_PX))
  const details = flow.nodes.map((node) => textWidth(node.detail, DETAIL_PX))
  const notes = flow.nodes.map((node) =>
    Math.max(0, ...flow.packets.flatMap((p) => p.marks?.[node.id]?.note ?? []).map((s) => textWidth(s, NOTE_PX))),
  )
  const hasDetail = flow.nodes.some((node) => node.detail)

  // Horizontal if neighbouring labels (and notes, which can show at once) fit
  // side by side: first with the detail lines, then without them.
  for (const showDetail of hasDetail ? [true, false] : [false]) {
    const body = labels.map((w, i) => (showDetail ? Math.max(w, details[i]) : w))
    const padL = Math.max(14, Math.max(body[0], notes[0]) / 2 + 4)
    const padR = Math.max(14, Math.max(body[last], notes[last]) / 2 + 4)
    let need = 0
    for (let i = 0; i < last; i++) {
      need = Math.max(need, (body[i] + body[i + 1]) / 2 + 10, (notes[i] + notes[i + 1]) / 2 + 8)
    }
    const spacing = (width - padL - padR) / Math.max(1, last)
    if (spacing >= need) return horizontalLayout(flow, width, padL, spacing, showDetail)
  }
  return verticalLayout(flow, width, hasDetail)
}

const nodeIndex = (flow: ArchitectureFlow, id: string) => flow.nodes.findIndex((node) => node.id === id)

function horizontalLayout(flow: ArchitectureFlow, width: number, padL: number, spacing: number, showDetail: boolean): FlowLayout {
  const y = flow.trace ? 58 : 32
  const points = flow.nodes.map((_, i) => ({ x: padL + i * spacing, y }))
  const row = (dy: number) => points.map((p) => ({ x: p.x, y: p.y + dy, anchor: 'middle' as const }))
  const layout: FlowLayout = {
    orientation: 'horizontal',
    showDetail,
    width,
    height: y + (showDetail ? 39 : 27),
    points,
    label: row(21),
    detail: row(33),
    note: row(-13),
  }
  if (flow.trace) {
    // Arc over the pipeline from the diagnosing node back to the culprit,
    // with its note above the apex so the line never crosses the text.
    const a = points[nodeIndex(flow, flow.trace.from)]
    const b = points[nodeIndex(flow, flow.trace.to)]
    const y0 = y - 8
    const apex = 26
    const cy = 2 * apex - y0
    const mid = (a.x + b.x) / 2
    layout.trace = {
      d: `M${a.x} ${y0} Q${mid} ${cy} ${b.x} ${y0}`,
      length: quadLength(a.x, y0, mid, cy, b.x, y0),
      note: { x: mid, y: apex - 12, anchor: 'middle' },
    }
  }
  return layout
}

function verticalLayout(flow: ArchitectureFlow, width: number, hasDetail: boolean): FlowLayout {
  // One node per row, labels to the right, notes right-aligned.
  const last = flow.nodes.length - 1
  const left = flow.trace ? 44 : 16
  const top = 14
  const rowH = 40
  const points = flow.nodes.map((_, i) => ({ x: left, y: top + i * rowH }))
  const layout: FlowLayout = {
    orientation: 'vertical',
    showDetail: true,
    width,
    height: top + last * rowH + (hasDetail ? 24 : 14),
    points,
    label: points.map((p) => ({ x: left + 16, y: p.y + 3.5, anchor: 'start' })),
    detail: points.map((p) => ({ x: left + 16, y: p.y + 15.5, anchor: 'start' })),
    note: points.map((p) => ({ x: width - 2, y: p.y + 3.5, anchor: 'end' })),
  }
  if (flow.trace) {
    const a = points[nodeIndex(flow, flow.trace.from)]
    const b = points[nodeIndex(flow, flow.trace.to)]
    const x0 = left - 8
    const apex = 10
    const cx = 2 * apex - x0
    layout.trace = {
      d: `M${x0} ${a.y} Q${cx} ${(a.y + b.y) / 2} ${x0} ${b.y}`,
      length: quadLength(x0, a.y, cx, (a.y + b.y) / 2, x0, b.y),
      note: { x: width - 2, y: b.y + 3.5, anchor: 'end' },
    }
  }
  return layout
}

/** Arc length of a quadratic Bézier, by sampling (avoids getTotalLength's forced layout). */
function quadLength(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) {
  let length = 0
  let px = x0
  let py = y0
  for (let i = 1; i <= 24; i++) {
    const t = i / 24
    const u = 1 - t
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1
    length += Math.hypot(x - px, y - py)
    px = x
    py = y
  }
  return length
}

/* ── Drawing ──────────────────────────────────────────────────────────── */

export type FrameWriter = (t: number, settled?: boolean) => void

/** Draws time `t` into the SVG rendered by FlowDiagram. `settled` = the resting final state. */
export function createFrameWriter(svg: SVGSVGElement, plan: FlowPlan, layout: FlowLayout): FrameWriter {
  const all = <T extends Element>(selector: string) => Array.from(svg.querySelectorAll<T>(selector))
  const nodes = all<SVGGElement>('[data-node]')
  const pulses = nodes.map((g) => g.querySelector<SVGCircleElement>('[data-pulse]')!)
  const notes = nodes.map((g) => g.querySelector<SVGTextElement>('[data-note]')!)
  const packets = all<SVGGElement>('[data-packet]')
  const dots = packets.map((g) => g.querySelector('circle')!)
  const trails = packets.map((g) => g.querySelector('line')!)
  const trace = svg.querySelector<SVGPathElement>('[data-trace]')
  const traceNote = svg.querySelector<SVGTextElement>('[data-trace-note]')
  const traceLength = layout.trace?.length ?? 0
  trace?.setAttribute('stroke-dasharray', `${traceLength} ${traceLength}`)
  const horizontal = layout.orientation === 'horizontal'

  const set = (el: Element, name: string, value: string | number) => {
    const v = typeof value === 'number' ? String(Math.round(value * 100) / 100) : value
    if (el.getAttribute(name) !== v) el.setAttribute(name, v)
  }
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

  const position = (from: number, to: number, u: number) => {
    const a = layout.points[from]
    const b = layout.points[to]
    const e = (1 - Math.cos(Math.PI * clamp01(u))) / 2 // ease in-out: packets settle into each node
    let x = a.x + (b.x - a.x) * e
    let y = a.y + (b.y - a.y) * e
    if (to < from) {
      // Return trips bow off the line, so responses read as their own lane.
      const off = 6 * Math.sin(Math.PI * e)
      if (horizontal) y += off
      else x -= off
    }
    return { x, y }
  }

  return (t, settled = false) => {
    const fade = settled || t <= plan.fadeStart ? 1 : clamp01(1 - (t - plan.fadeStart) / (plan.cycle - plan.fadeStart))

    plan.events.forEach((list, i) => {
      let latest: NodeEvent | undefined
      let state: StateEvent | undefined
      for (const e of list) {
        if (e.t > t) break
        latest = e
        if (e.status) state = e as StateEvent
      }
      set(nodes[i], 'data-status', state && fade > 0.5 ? state.status : 'idle')

      const note = notes[i]
      if (state?.note) {
        if (note.textContent !== state.note) note.textContent = state.note
        set(note, 'data-tone', state.status)
        set(note, 'opacity', (settled ? 1 : clamp01((t - state.t) / NOTE_IN)) * fade)
      } else {
        set(note, 'opacity', 0)
      }

      const pulse = pulses[i]
      const age = latest ? t - latest.t : Infinity
      if (!settled && latest && age < PULSE) {
        const k = age / PULSE
        set(pulse, 'r', 5 + 11 * k)
        set(pulse, 'opacity', 0.85 * (1 - k))
        set(pulse, 'data-tone', latest.tone)
      } else {
        set(pulse, 'opacity', 0)
      }
    })

    plan.packets.forEach((p, i) => {
      const g = packets[i]
      if (settled || t < p.start || t > p.end + ABSORB) {
        set(g, 'opacity', 0)
        return
      }
      let tone = p.tones[0].tone
      for (const step of p.tones) if (step.t <= t) tone = step.tone
      set(g, 'data-tone', tone)

      if (t >= p.end) {
        const end = layout.points[p.path[p.path.length - 1]]
        set(dots[i], 'cx', end.x)
        set(dots[i], 'cy', end.y)
        set(trails[i], 'opacity', 0)
        set(g, 'opacity', 1 - (t - p.end) / ABSORB)
        return
      }
      const k = Math.min(p.path.length - 2, Math.floor((t - p.start) / p.hop))
      const segStart = p.start + k * p.hop
      const head = position(p.path[k], p.path[k + 1], (t - segStart) / p.hop)
      const tail = position(p.path[k], p.path[k + 1], (t - TRAIL - segStart) / p.hop)
      set(dots[i], 'cx', head.x)
      set(dots[i], 'cy', head.y)
      set(trails[i], 'x1', tail.x)
      set(trails[i], 'y1', tail.y)
      set(trails[i], 'x2', head.x)
      set(trails[i], 'y2', head.y)
      set(trails[i], 'opacity', 1)
      set(g, 'opacity', 1)
    })

    if (trace && plan.trace) {
      const tr = plan.trace
      const drawn = settled ? 1 : clamp01((t - tr.t0) / (tr.t1 - tr.t0))
      set(trace, 'stroke-dashoffset', traceLength * (1 - drawn))
      set(trace, 'opacity', settled || t >= tr.t0 ? fade : 0)
      if (traceNote) set(traceNote, 'opacity', (settled ? 1 : clamp01((t - tr.t1) / NOTE_IN)) * fade)
    }
  }
}

/* ── Playback ─────────────────────────────────────────────────────────── */

export interface FlowPlayer {
  /** Start (or keep) looping. */
  play(): void
  /** Finish the current run, then rest on the final state. */
  settle(): void
  /** Stop now and show the final state. */
  rest(): void
  dispose(): void
}

export function createPlayer(draw: FrameWriter, plan: FlowPlan): FlowPlayer {
  let raf = 0
  let origin = 0
  let running = false
  let settling = false

  const tick = (now: number) => {
    let t = (now - origin) / 1000
    if (t >= plan.cycle) {
      origin = now
      t = 0
    }
    if (settling && t >= plan.settleAt && t < plan.fadeStart) {
      running = false
      settling = false
      draw(plan.settleAt, true)
      return
    }
    draw(t)
    raf = requestAnimationFrame(tick)
  }

  return {
    play() {
      settling = false
      if (running) return
      running = true
      // Enter at the fade-out phase so the resting state dissolves before the run restarts.
      origin = performance.now() - plan.fadeStart * 1000
      raf = requestAnimationFrame(tick)
    },
    settle() {
      if (running) settling = true
    },
    rest() {
      cancelAnimationFrame(raf)
      running = false
      settling = false
      draw(plan.settleAt, true)
    },
    dispose() {
      cancelAnimationFrame(raf)
      running = false
    },
  }
}
