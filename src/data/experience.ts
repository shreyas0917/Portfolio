export interface ExperienceEntry {
  company: string
  role: string
  period: string
  location: string
  stack: string[]
  highlights: string[]
}

export const experience: ExperienceEntry[] = [
  {
    company: 'ZettaByte Plus',
    role: 'Full Stack Engineer (Intern)',
    period: 'Jul 2025 – Oct 2025',
    location: 'India',
    stack: ['Next.js', 'Supabase', 'PostgreSQL', 'Supabase Auth', 'TypeScript'],
    highlights: [
      'Delivered a multi-role audit management platform serving 3 user types (businesses, auditors, admins) by architecting a Next.js + Supabase application with role-specific workflows on a shared data model.',
      'Secured access across all 3 roles by implementing Supabase Auth with PostgreSQL-backed role-based access control, designed to support 1K+ concurrent sessions.',
      'Replaced manual status coordination between auditors and businesses with a single live view of every audit by building modular role-based dashboards with real-time data sync for scheduling and reporting.',
    ],
  },
]
