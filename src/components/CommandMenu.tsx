import { lazy, Suspense, useEffect, useState } from 'react'
import { isPaletteShortcut, loadPalette, onOpenPalette } from '../lib/palette'

const CommandPalette = lazy(loadPalette)

/**
 * Ctrl/⌘ K anywhere (or the navbar hint) opens the command palette; the same
 * shortcut closes it. The palette's code loads the first time it's asked for.
 */
export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isPaletteShortcut(e)) return
      e.preventDefault()
      setMounted(true)
      setOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    const off = onOpenPalette(() => {
      setMounted(true)
      setOpen(true)
    })
    return () => {
      window.removeEventListener('keydown', onKey)
      off()
    }
  }, [])

  if (!mounted) return null
  return (
    <Suspense fallback={null}>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </Suspense>
  )
}
