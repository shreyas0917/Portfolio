import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { ArchitectureFlow } from '../data/projects'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { createFrameWriter, createPlayer, layoutFlow, planFlow, type FlowLayout, type FlowPlayer } from '../lib/flow'
import { holdLayout } from '../lib/layoutSettle'

interface FlowDiagramProps {
  flow: ArchitectureFlow
  /**
   * 'hover': loop while `active`, finish the run when deactivated (desktop cards).
   * 'view': loop while `active`, stop at once when deactivated (touch cards).
   * 'once': play a single run each time `run` changes (project pages).
   */
  mode: 'hover' | 'view' | 'once'
  active?: boolean
  run?: number
  /** 'lg' draws the diagram larger, for project pages. */
  size?: 'card' | 'lg'
  /** Project pages: hovering, focusing or tapping a node selects it. */
  selected?: number | null
  onSelect?: (index: number) => void
}

/** Generous hit area per node: its column (horizontal) or row (vertical). */
function hitBox(layout: FlowLayout, i: number) {
  // Each node owns the span between the midpoints to its neighbours, clamped to the
  // diagram, so neighbouring hit boxes meet without overlapping.
  const p = layout.points[i]
  if (layout.orientation === 'horizontal') {
    const step = layout.points.length > 1 ? layout.points[1].x - layout.points[0].x : layout.width
    const x = Math.max(0, p.x - step / 2)
    return { x, y: 0, width: Math.min(layout.width, p.x + step / 2) - x, height: layout.height }
  }
  const step = layout.points.length > 1 ? layout.points[1].y - layout.points[0].y : layout.height
  const y = Math.max(0, p.y - step / 2)
  return { x: 0, y, width: layout.width, height: Math.min(layout.height, p.y + step / 2) - y }
}

/**
 * A project's architecture as a live SVG pipeline. React renders the static
 * structure once; lib/flow writes each animation frame straight to the DOM.
 * At rest (and under reduced motion) it shows the run's final state, so the
 * outcome reads even when nothing is moving.
 */
export function FlowDiagram({ flow, mode, active = false, run = 0, size = 'card', selected = null, onSelect }: FlowDiagramProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const playerRef = useRef<FlowPlayer | null>(null)
  const playedRun = useRef(0)
  const reduced = useReducedMotion()
  const [width, setWidth] = useState(0)

  // Larger diagrams lay out in fewer units and scale up, so text grows with them.
  const scale = size === 'lg' ? (width >= 560 ? 1.4 : 1.12) : 1
  const plan = useMemo(() => planFlow(flow), [flow])
  const layout = useMemo(() => (width > 0 ? layoutFlow(flow, width / scale) : null), [flow, width, scale])

  // Width drives the layout. ResizeObserver also waits for content-visibility
  // to render the section, so nothing is measured while it's skipped.
  // Zero widths (a skipped or hidden subtree) keep the last real layout.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width)
      if (w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Project pages: take the first width before paint. The diagram can sit in the first
  // viewport there, and a height arriving a frame late would push the text below it
  // down (a layout shift). Cards keep waiting for the ResizeObserver: they live in
  // content-visibility sections on the home page, where measuring early would force
  // rendering of skipped content.
  useLayoutEffect(() => {
    if (size !== 'lg') return
    const w = Math.floor(wrapRef.current?.getBoundingClientRect().width ?? 0)
    if (w > 0) setWidth(w)
  }, [size])

  // Until measured, this diagram's height is a placeholder: hold programmatic
  // scrolls (see lib/layoutSettle) until the real layout is committed.
  useLayoutEffect(() => {
    if (layout) return
    return holdLayout()
  }, [layout])

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg || !layout) return
    const player = createPlayer(createFrameWriter(svg, plan, layout), plan)
    playerRef.current = player
    player.rest()
    return () => {
      player.dispose()
      playerRef.current = null
    }
  }, [plan, layout])

  // Looping modes (cards).
  useEffect(() => {
    const player = playerRef.current
    if (!player || reduced || mode === 'once') return
    if (active) player.play()
    else if (mode === 'hover') player.settle()
    else player.rest()
  }, [active, mode, reduced, layout])

  // Single runs (project pages): once per change of `run`, never again on resize.
  useEffect(() => {
    const player = playerRef.current
    if (!player || reduced || mode !== 'once' || run === playedRun.current) return
    playedRun.current = run
    player.play()
    player.settle()
  }, [run, mode, reduced, layout])

  const description = `${flow.nodes.map((node) => node.label).join(' → ')}. ${flow.caption}`
  const onKey = (i: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(i)
    }
  }

  return (
    <div ref={wrapRef} className="w-full" style={layout ? undefined : { minHeight: 72 }}>
      {layout && (
        <svg
          ref={svgRef}
          className="flow block overflow-visible font-mono"
          width={width}
          height={layout.height * scale}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role={onSelect ? 'group' : 'img'}
          aria-label={description}
        >
          {layout.points.slice(1).map((p, i) => (
            <line key={i} className="flow-edge" x1={layout.points[i].x} y1={layout.points[i].y} x2={p.x} y2={p.y} />
          ))}

          {layout.trace && plan.trace && (
            <>
              <path data-trace className="flow-trace" data-tone={plan.trace.status} d={layout.trace.d} opacity={0} />
              <text
                data-trace-note
                className="flow-note"
                data-tone={plan.trace.status}
                x={layout.trace.note.x}
                y={layout.trace.note.y}
                textAnchor={layout.trace.note.anchor}
                opacity={0}
              >
                {plan.trace.note}
              </text>
            </>
          )}

          {flow.nodes.map((node, i) => {
            const p = layout.points[i]
            const label = layout.label[i]
            const detail = layout.detail[i]
            const note = layout.note[i]
            return (
              <g key={node.id} data-node={i} className="flow-node" data-status="idle" data-selected={selected === i ? 'true' : undefined}>
                {onSelect && <circle className="flow-select" cx={p.x} cy={p.y} r={11} />}
                <circle data-pulse className="flow-pulse" cx={p.x} cy={p.y} r={5} opacity={0} />
                <rect x={p.x - 4.5} y={p.y - 4.5} width={9} height={9} rx={2} />
                <text className="flow-label" x={label.x} y={label.y} textAnchor={label.anchor}>
                  {node.label}
                </text>
                {layout.showDetail && node.detail && (
                  <text className="flow-detail" x={detail.x} y={detail.y} textAnchor={detail.anchor}>
                    {node.detail}
                  </text>
                )}
                <text data-note className="flow-note" x={note.x} y={note.y} textAnchor={note.anchor} opacity={0} />
              </g>
            )
          })}

          {plan.packets.map((_, i) => (
            <g key={i} data-packet={i} data-tone="info" opacity={0}>
              <line className="flow-trail" />
              <circle className="flow-packet" r={3.2} />
            </g>
          ))}

          {onSelect &&
            flow.nodes.map((node, i) => {
              const box = hitBox(layout, i)
              return (
                <rect
                  key={node.id}
                  className="flow-hit"
                  {...box}
                  rx={6}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selected === i}
                  aria-label={node.label}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && onSelect(i)}
                  onFocus={() => onSelect(i)}
                  onClick={() => onSelect(i)}
                  onKeyDown={onKey(i)}
                />
              )
            })}
        </svg>
      )}
    </div>
  )
}
