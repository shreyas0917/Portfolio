import { profile } from '../data/profile'
import { cn } from '../lib/cn'
import { GitHubIcon, LinkedInIcon, MailIcon } from './icons'

const links = [
  { label: 'GitHub', href: profile.github, Icon: GitHubIcon, external: true },
  { label: 'LinkedIn', href: profile.linkedin, Icon: LinkedInIcon, external: true },
  { label: 'Email', href: `mailto:${profile.email}`, Icon: MailIcon, external: false },
]

export function SocialLinks({ className }: { className?: string }) {
  return (
    <ul className={cn('flex items-center gap-1', className)}>
      {links.map(({ label, href, Icon, external }) => (
        <li key={label}>
          <a
            href={href}
            aria-label={label}
            title={label}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="hit-area grid h-10 w-10 place-items-center rounded-md text-fg-muted transition-[color,transform] duration-200 hover:-translate-y-0.5 hover:text-accent"
          >
            <Icon />
          </a>
        </li>
      ))}
    </ul>
  )
}
