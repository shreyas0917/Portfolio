/**
 * Skills, grouped, each with how it's backed (its "evidence"):
 * - used in projects: derived, never set here. lib/skillUsage searches
 *   projects.ts and experience.ts for the skill, so a skill is linked to a
 *   project only when that project actually mentions it, and the two can never
 *   disagree. A mention always wins over the `evidence` below.
 * - 'site': used to build or ship this portfolio.
 * - 'practice': learned and practised hands-on, not yet in a featured project.
 */
export type Evidence = 'projects' | 'site' | 'practice'

export interface Skill {
  name: string
  /**
   * Terms to look for in project and experience text (case-insensitive, whole
   * words). Defaults to the name. A trailing "*" matches a word prefix:
   * "idempoten*" finds "idempotent" and "idempotency".
   */
  match?: string[]
  /** For skills no project or role mentions: built this site, or hands-on practice. */
  evidence?: Exclude<Evidence, 'projects'>
  /** Shown when the chip is selected, instead of the default text for its evidence. */
  note?: string
}

const CI_NOTE = 'CI pipeline for this portfolio: typecheck + build on every push'

export interface SkillGroup {
  id: string
  title: string
  skills: Skill[]
  /** Spans both columns of the two-column (tablet) grid, keeping its rows even. */
  wide?: boolean
}

export const skillGroups: SkillGroup[] = [
  {
    id: 'backend',
    title: 'Backend',
    skills: [
      { name: 'Node.js' },
      { name: 'Express.js', match: ['Express'] },
      { name: 'FastAPI' },
      { name: 'Python' },
      { name: 'TypeScript' },
      { name: 'REST APIs', match: ['REST API*'] },
      { name: 'Prisma' },
    ],
  },
  {
    id: 'distributed',
    title: 'Distributed Systems',
    skills: [
      { name: 'Apache Kafka', match: ['Kafka'] },
      { name: 'Redis (caching, distributed locks)', match: ['Redis'] },
      { name: 'idempotency', match: ['idempoten*'] },
      { name: 'Transactional Outbox' },
      { name: 'DLQ & retries', match: ['DLQ', 'dead-letter', 'retries'] },
    ],
  },
  {
    id: 'ai',
    title: 'AI / RAG',
    skills: [
      { name: 'RAG pipelines', match: ['RAG'] },
      { name: 'ChromaDB' },
      { name: 'Sentence Transformers' },
      { name: 'Ollama' },
      { name: 'LLM evaluation (relevance, faithfulness, contradiction)', match: ['evaluat*'] },
    ],
  },
  {
    id: 'data',
    title: 'Data Engineering',
    skills: [
      { name: 'PySpark' },
      { name: 'Databricks' },
      { name: 'Delta Lake' },
      { name: 'Medallion Architecture', match: ['Medallion'] },
      { name: 'SQL' },
      { name: 'ETL scheduling', match: ['every 6 hours', '6-hour'] },
    ],
  },
  {
    id: 'databases',
    title: 'Databases',
    skills: [{ name: 'PostgreSQL', match: ['PostgreSQL', 'Postgres'] }, { name: 'Redis' }, { name: 'Supabase' }],
  },
  {
    id: 'frontend',
    title: 'Frontend',
    skills: [
      { name: 'React' },
      { name: 'Next.js' },
      { name: 'TypeScript' },
      // Not in any project's data; this site itself is built with it.
      { name: 'Tailwind CSS', evidence: 'site', note: 'Used to build this site.' },
    ],
  },
  {
    id: 'cloud-devops',
    title: 'Cloud & DevOps',
    wide: true,
    skills: [
      { name: 'Linux', evidence: 'practice' },
      { name: 'Shell Scripting (Bash)', match: ['Bash', 'shell script*'], evidence: 'practice' },
      { name: 'Docker' },
      { name: 'Docker Compose' },
      { name: 'Kubernetes', match: ['Kubernetes', 'k8s'], evidence: 'practice' },
      { name: 'Terraform', evidence: 'practice' },
      { name: 'Ansible', evidence: 'practice' },
      { name: 'Jenkins', evidence: 'practice' },
      // .github/workflows/ci.yml
      { name: 'GitHub Actions', evidence: 'site', note: CI_NOTE },
      { name: 'CI/CD Pipelines', match: ['CI/CD', 'CI pipeline*'], evidence: 'site', note: CI_NOTE },
      { name: 'Nginx' },
      // TODO: add the other AWS services you've used (e.g. S3, IAM, VPC); only EC2 is confirmed (URL Shortener).
      { name: 'AWS EC2', match: ['EC2'] },
    ],
  },
  {
    id: 'observability',
    title: 'Observability',
    skills: [
      { name: 'Prometheus', evidence: 'practice' },
      { name: 'Grafana', evidence: 'practice' },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations & Security',
    skills: [
      { name: 'Razorpay' },
      { name: 'HMAC-SHA256 webhook verification', match: ['HMAC'] },
      { name: 'Supabase Auth' },
      { name: 'role-based access control' },
    ],
  },
]
