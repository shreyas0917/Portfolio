import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { navLinks, profile } from '../data/profile'
import { projects } from '../data/projects'
import { useSmoothScroll } from '../hooks/useLenis'
import { useTheme } from '../hooks/useTheme'
import { cn } from '../lib/cn'
import { fuzzy } from '../lib/fuzzy'
import { rememberHomeScroll } from '../lib/navMemory'

type Action =
  | { kind: 'section'; id: string }
  | { kind: 'project'; slug: string }
  | { kind: 'copy'; text: string }
  | { kind: 'link'; href: string }
  | { kind: 'theme' }

type GroupId = 'go' | 'open' | 'run'

interface Command {
  id: string
  group: GroupId
  title: string
  hint: string
  /** Extra words the search also matches. */
  keywords: string
  action: Action
}

const GROUPS: Record<GroupId, { label: string; glyph: string }> = {
  go: { label: 'go to', glyph: '#' },
  open: { label: 'open project', glyph: '/' },
  run: { label: 'run', glyph: '$' },
}

const strip = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

function buildCommands(theme: 'dark' | 'light'): Command[] {
  const next = theme === 'dark' ? 'light' : 'dark'
  return [
    ...navLinks.map<Command>((l, i) => ({
      id: `go-${l.id}`,
      group: 'go',
      title: l.label.toLowerCase(),
      hint: `section 0${i + 1}`,
      keywords: `go section jump scroll ${l.label}`,
      action: { kind: 'section', id: l.id },
    })),
    ...projects.map<Command>((p) => ({
      id: `open-${p.slug}`,
      group: 'open',
      title: p.title,
      hint: p.category.toLowerCase(),
      keywords: `open project ${p.slug} ${p.subtitle} ${p.category} ${p.stack.join(' ')}`,
      action: { kind: 'project', slug: p.slug },
    })),
    { id: 'run-email', group: 'run', title: 'copy email', hint: profile.email, keywords: 'run copy email mail contact clipboard', action: { kind: 'copy', text: profile.email } },
    { id: 'run-resume', group: 'run', title: 'open resume', hint: 'new tab', keywords: 'run open resume cv pdf', action: { kind: 'link', href: profile.resume } },
    { id: 'run-github', group: 'run', title: 'open GitHub', hint: strip(profile.github), keywords: 'run open github code repos', action: { kind: 'link', href: profile.github } },
    { id: 'run-linkedin', group: 'run', title: 'open LinkedIn', hint: strip(profile.linkedin), keywords: 'run open linkedin profile', action: { kind: 'link', href: profile.linkedin } },
    { id: 'run-theme', group: 'run', title: 'toggle theme', hint: `${theme} to ${next}`, keywords: `run toggle theme dark light mode switch ${next}`, action: { kind: 'theme' } },
  ]
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older browsers / denied permission: the selection-based fallback.
    const area = Object.assign(document.createElement('textarea'), { value: text })
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

/** Title with the fuzzy-matched characters highlighted. */
function Highlight({ text, hits }: { text: string; hits: number[] }) {
  if (hits.length === 0) return <>{text}</>
  const set = new Set(hits)
  const parts: ReactNode[] = []
  for (let i = 0; i < text.length; ) {
    const on = set.has(i)
    let j = i
    while (j < text.length && set.has(j) === on) j++
    const chunk = text.slice(i, j)
    parts.push(on ? <mark key={i} className="bg-transparent text-accent">{chunk}</mark> : chunk)
    i = j
  }
  return <>{parts}</>
}

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Command palette on the native modal <dialog>: the rest of the page is inert
 * while it's open, Esc closes it, and focus returns to where it was. The input
 * is a combobox driving a listbox through aria-activedescendant, so focus never
 * leaves the input while arrowing through results; Tab cycles input ↔ close.
 */
export default function CommandPalette({ open, onClose }: Props) {
  const uid = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const closeTimer = useRef(0)

  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { scrollTo } = useSmoothScroll()
  const { theme, toggle } = useTheme()

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [notice, setNotice] = useState('')

  const commands = useMemo(() => buildCommands(theme), [theme])

  // Matching commands, grouped. With a query, groups and their items are ordered by best match.
  const groups = useMemo(() => {
    const scored = commands
      .map((c) => ({ command: c, match: fuzzy(query, c.title, `${GROUPS[c.group].label} ${c.keywords}`) }))
      .filter((r): r is { command: Command; match: NonNullable<typeof r.match> } => r.match !== null)
    const order: GroupId[] = ['go', 'open', 'run']
    const list = order
      .map((id) => ({ id, items: scored.filter((r) => r.command.group === id) }))
      .filter((g) => g.items.length > 0)
    if (!query.trim()) return list
    // Drop stray matches (letters scattered through some keyword) well below the best one.
    const best = Math.max(...scored.map((r) => r.match.score))
    const strong = list
      .map((g) => ({ ...g, items: g.items.filter((r) => r.match.score >= best * 0.4).sort((a, b) => b.match.score - a.match.score) }))
      .filter((g) => g.items.length > 0)
    return strong.sort((a, b) => b.items[0].match.score - a.items[0].match.score)
  }, [commands, query])
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const optionId = (c: Command) => `${uid}-${c.id}`
  const current = flat[Math.min(active, flat.length - 1)]

  // Open / close the dialog with the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setQuery('')
      setActive(0)
      setNotice('')
      dialog.showModal()
      inputRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  // Keep the active option in view.
  const currentId = current ? optionId(current.command) : undefined
  useEffect(() => {
    if (currentId) document.getElementById(currentId)?.scrollIntoView({ block: 'nearest' })
  }, [currentId])

  const close = () => dialogRef.current?.close()

  const onDialogClose = () => {
    window.clearTimeout(closeTimer.current)
    // Reset here rather than only on open: the reset on open lands a render after the
    // dialog appears, and a keystroke in between would be appended to the old query.
    setQuery('')
    setActive(0)
    setNotice('')
    onClose()
    const el = opener.current
    if (el?.isConnected) el.focus({ preventScroll: true })
  }

  const execute = (command: Command) => {
    const { action } = command
    switch (action.kind) {
      case 'section':
        close()
        if (pathname === '/') scrollTo(`#${action.id}`)
        else navigate(`/#${action.id}`)
        break
      case 'project':
        close()
        if (pathname === '/') rememberHomeScroll()
        navigate(`/projects/${action.slug}`)
        break
      case 'link':
        window.open(action.href, '_blank', 'noopener,noreferrer')
        close()
        break
      case 'theme':
        toggle()
        close()
        break
      case 'copy':
        void copyText(action.text).then((ok) => {
          setNotice(ok ? `copied ${action.text}` : `couldn't copy · ${action.text}`)
          if (ok) closeTimer.current = window.setTimeout(close, 900)
        })
        break
    }
  }

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (flat.length === 0) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (Math.min(i, flat.length - 1) + step + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (current) execute(current.command)
    }
  }

  // Focus trap: Tab and Shift+Tab cycle between the input and the close button.
  const onDialogKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const stops = [inputRef.current, closeRef.current].filter((el): el is HTMLInputElement | HTMLButtonElement => !!el)
    const i = stops.indexOf(document.activeElement as HTMLInputElement | HTMLButtonElement)
    stops[(i + (e.shiftKey ? -1 : 1) + stops.length) % stops.length]?.focus()
  }

  let index = 0
  return (
    <dialog
      ref={dialogRef}
      data-lenis-prevent
      aria-label="Command palette"
      className="palette mx-auto mb-auto mt-[12vh] w-[min(calc(100vw-2rem),36rem)] overflow-hidden rounded-xl border border-line-strong bg-bg-elev p-0 text-fg shadow-[0_40px_100px_-30px_rgb(var(--shadow)/0.8)]"
      onClose={onDialogClose}
      onKeyDown={onDialogKeyDown}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <span aria-hidden="true" className="font-mono text-[14px] text-accent">
          &gt;
        </span>
        <input
          ref={inputRef}
          role="combobox"
          aria-label="Search commands"
          aria-expanded={flat.length > 0}
          aria-controls={flat.length > 0 ? `${uid}-list` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={currentId}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="type a command or search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKeyDown}
          className="h-12 min-w-0 flex-1 bg-transparent font-mono text-[14px] text-fg placeholder:text-fg-muted focus:outline-none"
        />
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close command palette, esc"
          className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          esc
        </button>
      </div>

      {/* A listbox only while there are options (an empty listbox is invalid ARIA). */}
      <div
        id={`${uid}-list`}
        role={flat.length > 0 ? 'listbox' : undefined}
        aria-label={flat.length > 0 ? 'Commands' : undefined}
        className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain p-2"
      >
        {groups.map((group) => (
          <div key={group.id} role="group" aria-labelledby={`${uid}-group-${group.id}`} className="pb-1">
            <div id={`${uid}-group-${group.id}`} role="presentation" className="label px-2 pb-1.5 pt-2.5">
              {GROUPS[group.id].label}
            </div>
            {group.items.map(({ command, match }) => {
              const i = index++
              const selected = current?.command.id === command.id
              return (
                <div
                  key={command.id}
                  id={optionId(command)}
                  role="option"
                  aria-selected={selected}
                  // mousemove, not mouseenter: a pointer resting where the list re-renders shouldn't steal the selection.
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={() => execute(command)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-md px-2.5 py-2 font-mono text-[13px] transition-colors duration-100',
                    selected ? 'bg-surface-2 text-fg' : 'text-fg-dim',
                  )}
                >
                  <span aria-hidden="true" className={cn('absolute inset-y-2 left-0 w-px rounded-full bg-accent transition-opacity', selected ? 'opacity-100' : 'opacity-0')} />
                  <span aria-hidden="true" className={cn('w-3 shrink-0 text-center', selected ? 'text-accent' : 'text-fg-muted')}>
                    {GROUPS[command.group].glyph}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <Highlight text={command.title} hits={match.hits} />
                  </span>
                  {/* fg-muted is under 4.5:1 on the selected row's background, so the hint brightens there. */}
                  <span className={cn('max-w-[48%] shrink-0 truncate text-[11px]', selected ? 'text-fg-dim' : 'text-fg-muted')}>{command.hint}</span>
                </div>
              )
            })}
          </div>
        ))}
        {flat.length === 0 && (
          <p className="px-2 py-8 text-center font-mono text-[12px] text-fg-muted">
            no command matches “{query.trim()}”
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 font-mono text-[11px] text-fg-muted">
        <span aria-hidden="true">↑↓ navigate · enter run · esc close</span>
        <span role="status" className={cn('ml-auto truncate', notice.startsWith('copied') ? 'text-ok' : 'text-warn')}>
          {notice || <span className="sr-only">{flat.length} {flat.length === 1 ? 'command' : 'commands'}</span>}
        </span>
      </div>
    </dialog>
  )
}
