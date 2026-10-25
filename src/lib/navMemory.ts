/*
  Where the visitor was in the Projects section when they opened a project,
  so coming back (the "all systems" link or the browser's back button) returns
  them to the same spot instead of the top of the page. Stored relative to the
  section's top, so it survives layout differences above it.
*/

let projectsOffset: number | null = null

export function rememberHomeScroll() {
  const section = document.getElementById('projects')
  if (section) projectsOffset = -section.getBoundingClientRect().top
}

/** Offset of the viewport top from the Projects section's top, or null if none saved. */
export function getHomeScroll() {
  return projectsOffset
}
