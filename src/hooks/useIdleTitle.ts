import { useEffect } from 'react'

const IDLE_TITLE = '● connection idle…'

/** While the tab is in the background its title reads "● connection idle…"; the page's own title comes back on return. */
export function useIdleTitle() {
  useEffect(() => {
    let saved = document.title
    const onVisibility = () => {
      if (document.hidden) {
        saved = document.title
        document.title = IDLE_TITLE
      } else if (document.title === IDLE_TITLE) {
        // Only if nothing (a route change) set a new title meanwhile.
        document.title = saved
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (document.title === IDLE_TITLE) document.title = saved
    }
  }, [])
}
