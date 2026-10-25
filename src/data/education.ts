export interface EducationEntry {
  school: string
  degree: string
  period: string
  /** Shown as a monospace badge. */
  score: string
  /** The headline entry; the rest render compact. */
  primary?: boolean
}

// No UI yet: the Education section is built in a later phase.
export const education: EducationEntry[] = [
  {
    school: 'Dr. D. Y. Patil Institute of Technology, Pimpri, Pune',
    degree: 'Bachelor of Engineering, Computer Engineering',
    period: '2022 – 2026',
    score: 'CGPA 8.99 / 10',
    primary: true,
  },
  {
    school: 'Vidya Valley North Point Junior College, Pune',
    degree: 'Higher Secondary Certificate (HSC)',
    period: '2021 – 2022',
    score: '76%',
  },
  {
    school: 'Jnana Prabodhini Navnagar Vidyalaya, Pune',
    degree: 'Secondary School Certificate (SSC)',
    period: '2019 – 2020',
    score: '90.40%',
  },
]
