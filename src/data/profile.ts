import type { Status } from './projects'

const name = 'Shreyas Wani'
const [firstName, lastName] = name.split(' ')

/** The tagline, split into clauses so the Hero can underline each with its status light. */
const taglineParts: ReadonlyArray<{ text: string; status?: Status }> = [
  { text: 'I build systems that' },
  { text: 'fail loudly,', status: 'fail' },
  { text: 'recover safely,', status: 'warn' },
  { text: 'and' },
  { text: 'never double-charge.', status: 'ok' },
]

export const profile = {
  name,
  firstName,
  lastName,
  /** Console-style handle in the navbar: "shreyas.wani". */
  handle: `${firstName}.${lastName}`.toLowerCase(),
  /** Monogram for the navbar mark and the portrait's node id: "sw". */
  initials: `${firstName[0]}${lastName[0]}`.toLowerCase(),
  title: 'Backend & AI Systems Engineer',
  tagline: taglineParts.map((part) => part.text).join(' '),
  taglineParts,
  /** Role line on the portrait. */
  focus: ['backend', 'distributed', 'ai-reliability'],
  /** About section: the status readout's focus line and the principles cards. */
  about: {
    focus: ['backend', 'distributed systems', 'AI reliability', 'data eng', 'cloud & devops'],
    principles: [
      {
        title: 'Correct under failure',
        text: 'Retries, duplicates and partial failures are the normal case, not the edge case.',
        status: 'warn',
      },
      {
        title: 'Observable by default',
        text: "If a system fails silently, it isn't done. Traces, evidence and dashboards come built in.",
        status: 'fail',
      },
      {
        title: 'Proven, not claimed',
        text: 'Tests, planted failures and honest metrics over adjectives.',
        status: 'ok',
      },
    ],
  },
  /** Contact section and footer copy. */
  contact: {
    pitch: "Hiring for backend, full-stack or AI engineering? Let's talk.",
    status: 'open to roles',
    responseTime: 'Usually replies within 24–48 hours',
  },
  footerNote: 'Built with React, TypeScript & a lot of retries.',
  location: 'Pune, Maharashtra, India',
  availability: 'Open to backend, full-stack & AI roles',
  bio:
    "I'm a Computer Engineering graduate from Dr. D. Y. Patil Institute of Technology, Pune (CGPA 8.99), " +
    'who builds backend systems that stay correct under failure. My work spans idempotent event pipelines, ' +
    'RAG reliability and failure diagnosis, and data engineering pipelines, plus the React dashboards that ' +
    'make those systems observable. I care about the unglamorous parts: retries, duplicate events, silent AI ' +
    'failures, and the tests that prove a system works. Open to backend, full-stack and AI engineering roles.',
  email: 'shreyaswani04@gmail.com',
  github: 'https://github.com/shreyas0917',
  linkedin: 'https://www.linkedin.com/in/shreyas-wani/',
  resume: 'https://drive.google.com/file/d/11ZgQyYR6p0-SU68Q4bx44MOPQYl-Bus2/view?usp=drive_link',
  photo: {
    alt: `Portrait of ${name} in a dark pinstripe suit`,
    // Generated 4:5 crops in /public (see README for regenerating)
    webp: [
      { src: '/shreyas-480.webp', width: 480 },
      { src: '/shreyas-800.webp', width: 800 },
      { src: '/shreyas-1200.webp', width: 1200 },
    ],
    fallback: '/shreyas-800.jpg',
    width: 800,
    height: 1000,
  },
} as const

export const navLinks = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'contact', label: 'Contact' },
] as const
