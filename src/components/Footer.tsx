import type { MouseEvent, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { navLinks, profile } from '../data/profile'
import { projects } from '../data/projects'
import { useSmoothScroll } from '../hooks/useLenis'
import { GitHubIcon, LinkedInIcon, MailIcon, ResumeIcon } from './icons'
import { StatusDot } from './StatusDot'

// Injected at build time (vite.config.ts); shown as the deploy date.
const BUILT = new Date(__BUILD_DATE__)
const SOCIAL: Array<{ label: string; href: string; icon: ReactNode; external: boolean }> = [
  { label: 'GitHub', href: profile.github, icon: <GitHubIcon />, external: true },
  { label: 'LinkedIn', href: profile.linkedin, icon: <LinkedInIcon />, external: true },
  { label: 'Email', href: `mailto:${profile.email}`, icon: <MailIcon />, external: false },
  { label: 'Résumé', href: profile.resume, icon: <ResumeIcon />, external: true },
]

const linkClass = 'font-mono text-[12px] text-fg-dim transition-colors hover:text-accent'

export function Footer() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { scrollTo } = useSmoothScroll()

  // On the home page, jump in place; elsewhere, go home and land on the section.
  const goToSection = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    if (pathname === '/') scrollTo(`#${id}`)
    else navigate(`/#${id}`)
  }
  // Smooth with Lenis; instant under reduced motion. Focus follows for keyboard users.
  const backToTop = () => {
    scrollTo(0)
    document.querySelector<HTMLElement>('header a')?.focus({ preventScroll: true })
  }

  return (
    <footer className="defer-render border-t border-line [contain-intrinsic-size:auto_440px]">
      <div className="shell py-12 sm:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.4fr_0.8fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <p className="flex items-center gap-3">
              <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-md border border-line-strong bg-surface font-mono text-[13px] font-semibold text-fg">
                {profile.initials}
              </span>
              <span>
                <span className="block font-display text-lg font-semibold tracking-tight text-fg">{profile.name}</span>
                <span className="block font-mono text-[11px] text-fg-muted">{profile.title}</span>
              </span>
            </p>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-fg-dim">{profile.footerNote}</p>
            <ul className="-ml-2 mt-5 flex items-center gap-1">
              {SOCIAL.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    aria-label={s.external ? `${s.label} (opens in a new tab)` : s.label}
                    title={s.label}
                    {...(s.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="hit-area grid h-10 w-10 place-items-center rounded-md text-fg-muted transition-[color,transform] duration-200 hover:-translate-y-0.5 hover:text-accent"
                  >
                    {s.icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Sections">
            <p className="label">sections</p>
            <ul className="mt-4 space-y-2">
              {navLinks.map((l, i) => (
                <li key={l.id}>
                  <a href={`/#${l.id}`} onClick={goToSection(l.id)} className={linkClass}>
                    <span className="mr-2 text-fg-muted">{String(i + 1).padStart(2, '0')}</span>
                    {l.label.toLowerCase()}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Projects">
            <p className="label">projects</p>
            <ul className="mt-4 space-y-2">
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link to={`/projects/${p.slug}`} className={linkClass}>
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 font-mono text-[11px] text-fg-muted lg:flex-row lg:items-center lg:justify-between">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusDot live />
            <span>all systems operational</span>
            <span aria-hidden="true">·</span>
            <span>
              last deployed <time dateTime={BUILT.toISOString()}>{BUILT.toISOString().slice(0, 10)}</time>
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <p>
              © {new Date().getFullYear()} {profile.name}
            </p>
            <button type="button" onClick={backToTop} className="hit-area group inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-fg-dim transition-colors hover:border-accent hover:text-accent">
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5">
                ↑
              </span>
              back to top
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
