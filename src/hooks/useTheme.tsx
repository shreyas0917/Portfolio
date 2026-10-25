import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readInitial(): Theme {
  // index.html sets data-theme before paint; mirror it so React agrees.
  const attr = document.documentElement.getAttribute('data-theme')
  return attr === 'light' ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitial)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    // Both theme-color metas (light/dark media variants): the site's own theme wins over the OS one.
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', theme === 'dark' ? '#0A0C10' : '#F4F6F9'))
    try {
      localStorage.setItem('theme', theme)
    } catch {
      /* storage unavailable: theme still applies for this session */
    }
  }, [theme])

  const toggle = useCallback(() => {
    const root = document.documentElement
    // Colour-only transition during the swap, removed afterwards so it never slows other animations.
    root.classList.add('theme-transition')
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
    window.setTimeout(() => root.classList.remove('theme-transition'), 400)
  }, [])

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
