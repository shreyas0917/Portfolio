/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Formspree endpoint for the contact form, e.g. https://formspree.io/f/abcdwxyz. See .env.example. */
  readonly VITE_FORMSPREE_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** ISO timestamp of the production build, injected by vite.config.ts. */
declare const __BUILD_DATE__: string
