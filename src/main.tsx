import { LazyMotion } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { profile } from './data/profile'
import { SmoothScrollProvider } from './hooks/useLenis'
import { ThemeProvider } from './hooks/useTheme'
// Google Fonts, self-hosted (variable weights, unicode-range subsets).
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './styles/globals.css'

// Motion features load after first paint; `strict` throws if a full `motion.*`
// component sneaks back in and drags every feature into the main bundle.
const loadMotionFeatures = () => import('./lib/motionFeatures').then((mod) => mod.default)

// The app restores scroll itself (Projects section on the way back, top for new pages);
// the browser's automatic restoration would fight it during route transitions.
history.scrollRestoration = 'manual'

// Keyboard users: render every section as soon as Tab is first pressed. Safari doesn't
// scroll focus into sections skipped by content-visibility: auto (.defer-render), so a
// tab stop there could land off screen.
const renderAllOnTab = (e: KeyboardEvent) => {
  if (e.key !== 'Tab') return
  document.documentElement.classList.add('render-all')
  window.removeEventListener('keydown', renderAllOnTab, true)
}
window.addEventListener('keydown', renderAllOnTab, true)

// For whoever opens DevTools.
console.log(
  `%c👋 Looking under the hood? I'm open to roles: ${profile.email}`,
  'font: 500 13px/1.8 ui-monospace, Menlo, Consolas, monospace; color: #3FB950; padding: 4px 0',
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={loadMotionFeatures} strict>
      <BrowserRouter>
        <ThemeProvider>
          <SmoothScrollProvider>
            <App />
          </SmoothScrollProvider>
        </ThemeProvider>
      </BrowserRouter>
    </LazyMotion>
  </StrictMode>,
)
