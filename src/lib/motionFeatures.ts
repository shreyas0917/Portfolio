// Framer Motion's animation + gesture features (animate, variants, exit, hover,
// tap, inView). Loaded asynchronously by <LazyMotion> in main.tsx so this code
// stays off the critical path; `m.*` components render statically until it lands.
// Layout animations (`layout`, `layoutId`) are deliberately not included.
export { domAnimation as default } from 'framer-motion'
