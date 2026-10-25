/** @type {import('tailwindcss').Config} */
// Every color resolves to a CSS variable defined in src/styles/globals.css,
// so the light/dark toggle only swaps tokens — no component changes.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        'bg-elev': token('bg-elev'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('line'),
        'line-strong': token('line-strong'),
        fg: token('fg'),
        'fg-dim': token('fg-dim'),
        'fg-muted': token('fg-muted'),
        accent: token('accent'),
        ok: token('ok'),
        warn: token('warn'),
        fail: token('fail'),
      },
      fontFamily: {
        // Each web font is followed by a metric-matched local fallback (globals.css), so the swap doesn't shift layout.
        display: ['"Space Grotesk Variable"', '"Space Grotesk Fallback"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono Fallback"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Fluid display scale: 360px → 1440px
        'display-xl': ['clamp(2.75rem, 1.6rem + 5.2vw, 6rem)', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
        'display-md': ['clamp(1.875rem, 1.4rem + 2vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
      },
      maxWidth: {
        shell: '76rem',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        spin: { to: { transform: 'rotate(360deg)' } },
        blink: { '50%': { opacity: '0' } },
        pulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.85)' },
        },
        // An event travelling down a wire (scroll cue).
        drip: {
          '0%': { transform: 'translateY(-12px)' },
          '80%, 100%': { transform: 'translateY(40px)' },
        },
      },
      animation: {
        'ring-spin': 'spin 6s linear infinite',
        blink: 'blink 1s steps(1) infinite',
        heartbeat: 'pulse 2.4s ease-in-out infinite',
        drip: 'drip 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
