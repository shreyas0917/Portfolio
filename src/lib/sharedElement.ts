/*
  Shared-element transition from a project card to its page, without a
  layout-animation engine:
  1. On click, the card's title and status chip are cloned into fixed-position
     "ghosts" exactly where they sit, so they stay visible while the home page
     fades out.
  2. When the project page mounts, each ghost flies (FLIP: translate + scale)
     to where the matching header element will be, then cross-fades into it.
  Elements opt in with data-shared="title" / "chip" inside a [data-shared-root].
*/

type Part = 'title' | 'chip'
const PARTS: Part[] = ['title', 'chip']

interface Ghost {
  el: HTMLElement
  rect: DOMRect
}

interface Flight {
  key: string
  ghosts: Partial<Record<Part, Ghost>>
  timer: number
}

const DURATION = 700
const CROSSFADE = 220
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

let flight: Flight | null = null

function clear() {
  if (!flight) return
  window.clearTimeout(flight.timer)
  Object.values(flight.ghosts).forEach((ghost) => ghost?.el.remove())
  flight = null
}

/** Clone the card's shared parts in place. Ghosts expire if no page lands them. */
export function captureShared(key: string, root: Element) {
  clear()
  const ghosts: Flight['ghosts'] = {}
  for (const part of PARTS) {
    const source = root.querySelector<HTMLElement>(`[data-shared="${part}"]`)
    if (!source) continue
    const rect = source.getBoundingClientRect()
    const computed = getComputedStyle(source)
    const el = source.cloneNode(true) as HTMLElement
    el.removeAttribute('id')
    el.removeAttribute('data-shared')
    el.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'))
    el.setAttribute('aria-hidden', 'true')
    Object.assign(el.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      zIndex: '70',
      pointerEvents: 'none',
      transformOrigin: '0 0',
      // Appended to <body>, the clone would lose inherited text styles (the chip
      // gets its mono 11px from the card's meta row), so copy them across.
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      letterSpacing: computed.letterSpacing,
      lineHeight: computed.lineHeight,
      color: computed.color,
    })
    document.body.appendChild(el)
    ghosts[part] = { el, rect }
  }
  flight = { key, ghosts, timer: window.setTimeout(clear, 2500) }
}

/** True while ghosts for `key` are waiting to land. */
export function hasSharedFor(key: string) {
  return flight?.key === key
}

/**
 * Fly the ghosts into the page's header elements. Targets are measured in
 * document coordinates, i.e. where they'll be once the new page sits at the top.
 */
export function landShared(key: string, targets: Partial<Record<Part, HTMLElement | null>>) {
  if (!flight || flight.key !== key) return
  const { ghosts } = flight
  window.clearTimeout(flight.timer)
  flight = null

  for (const part of PARTS) {
    const ghost = ghosts[part]
    const target = targets[part]
    if (!ghost) continue
    if (!target) {
      ghost.el.remove()
      continue
    }
    const to = target.getBoundingClientRect()
    const top = to.top + window.scrollY
    const scale = part === 'title' ? parseFloat(getComputedStyle(target).fontSize) / parseFloat(getComputedStyle(ghost.el).fontSize) : 1

    target.style.opacity = '0'
    const fly = ghost.el.animate(
      [{ transform: 'none' }, { transform: `translate(${to.left - ghost.rect.left}px, ${top - ghost.rect.top}px) scale(${scale})` }],
      { duration: DURATION, easing: EASE, fill: 'forwards' },
    )
    ghost.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CROSSFADE, delay: DURATION - CROSSFADE, fill: 'forwards' })
    const reveal = target.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CROSSFADE, delay: DURATION - CROSSFADE, fill: 'both' })

    const done = () => {
      target.style.opacity = ''
      reveal.cancel()
      ghost.el.remove()
    }
    fly.finished.then(done, done)
  }
}
