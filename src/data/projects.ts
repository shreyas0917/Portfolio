/**
 * Single source of truth for project content.
 * Components read from here: edit copy, links, metrics and the animated
 * architecture diagrams without touching UI code.
 *
 * Placeholders to fill in are marked `TODO`. A `null` liveUrl hides the Live
 * button; a `null` githubUrl shows GitHub as "not yet published".
 */

/** Status-light semantics used across the site. */
export type Status = 'ok' | 'warn' | 'fail'
/** Colour of a packet in a flow diagram: a status, or neutral in-flight traffic. */
export type Tone = Status | 'info'

export interface Metric {
  /** Display value. A leading number counts up on scroll: "12/12", "98+", "6h". */
  value: string
  label: string
  status: Status
  /** Not yet measured: shown verbatim as a caveat, never as a headline number. */
  unverified?: boolean
}

/** A component in a project's architecture diagram. Nodes are listed in pipeline order. */
export interface FlowNode {
  id: string
  label: string
  /** Small second line, e.g. "HMAC check". */
  detail?: string
  /** One line shown when the node is hovered or tapped on the project page. */
  explain?: string
}

/** What a node does to a packet the first time the packet reaches it. */
export interface FlowMark {
  status: Status
  /** Short callout shown at the node. Keep it under ~20 characters. */
  note?: string
}

/** One request or event moving through the diagram. */
export interface FlowPacket {
  /** Node ids in visiting order. Each step goes to a neighbouring node; packets may turn back. */
  path: string[]
  /** Seconds after the run starts. */
  start: number
  /** Starting colour (default: neutral in-flight). Takes a mark's status after passing it. */
  tone?: Tone
  /** Node id → effect on arrival. The last node in `path` absorbs the packet. */
  marks?: Record<string, FlowMark>
  /** Hop time multiplier: above 1 is slower (a slow path). Default 1. */
  pace?: number
}

export interface ArchitectureFlow {
  nodes: FlowNode[]
  packets: FlowPacket[]
  /** Drawn after the packets finish: a line from one node back to another, which is highlighted. */
  trace?: { from: string; to: string; status: Status; note: string }
  /** One line under the diagram saying what the run shows. */
  caption: string
}

/** An engineering decision, written like a design-review entry. */
export interface Decision {
  choice: string
  why: string
  tradeoff: string
}

export interface Screenshot {
  src: string
  caption: string
}

export interface Project {
  slug: string
  title: string
  subtitle: string
  /** One-line summary for detail pages. */
  summary: string
  category: 'AI Reliability' | 'Distributed Systems' | 'Data Engineering' | 'Backend' | 'Full Stack'
  year: string
  /** Colour of the card's story (hover glow): fail = diagnosis, warn = duplicates/retries, ok = healthy path. */
  signal: Status
  /** Large card at the top of the Projects section. */
  spotlight: boolean
  /** Listed in the Projects section. */
  featured: boolean
  stack: string[]
  /** Most important first. Cards show the first 3 (large) or 2 (compact); detail pages show all. */
  highlights: string[]
  metrics: Metric[]
  flow: ArchitectureFlow
  githubUrl: string | null
  liveUrl: string | null
  image: {
    src: string | null
    alt: string
  }

  // Project page. All optional; "[to fill]" marks facts still to be supplied
  // and renders as a visible placeholder, never as invented content.
  /** What breaks without this system, in 2–3 sentences. */
  problem?: string
  /** How it works end to end, in order (3–5 steps). */
  approach?: string[]
  decisions?: Decision[]
  /** How it was verified. Caveats render in the dashed "unverified" style. */
  testing?: { checks: string[]; caveats?: string[] }
  learnings?: string[]
  next?: string[]
  screenshots?: Screenshot[]
}

export const projects: Project[] = [
  {
    slug: 'retrace',
    title: 'Retrace',
    subtitle: 'RAG Reliability & Failure Diagnosis System',
    summary:
      'Pinpoints where a RAG answer went wrong (retrieval, grounding, generation, or abstention) using a deterministic rule engine instead of another LLM guess.',
    category: 'AI Reliability',
    year: '2025', // TODO: confirm year
    signal: 'fail',
    spotlight: true,
    featured: true,
    stack: ['Python', 'FastAPI', 'ChromaDB', 'Sentence Transformers', 'PostgreSQL', 'Ollama', 'React', 'TypeScript', 'Docker Compose'],
    highlights: [
      '15-rule deterministic diagnosis engine spanning retrieval, grounding, generation and abstention.',
      '12/12 planted-failure scenarios correctly localized to the stage that caused them.',
      '98+ automated tests covering rules, pipeline stages and API contracts.',
      'Fully local stack: Ollama for inference, ChromaDB for vector search, orchestrated with Docker Compose.',
    ],
    metrics: [
      { value: '12/12', label: 'scenarios localized', status: 'ok' },
      { value: '15', label: 'diagnosis rules', status: 'ok' },
      { value: '98+', label: 'automated tests', status: 'ok' },
    ],
    flow: {
      nodes: [
        { id: 'query', label: 'Query', explain: 'A question entering the RAG pipeline.' },
        { id: 'retrieve', label: 'Retrieve', detail: 'ChromaDB', explain: 'Vector search over the chunks stored in ChromaDB.' },
        { id: 'ground', label: 'Ground', explain: 'Checks whether the answer is supported by the retrieved evidence.' },
        { id: 'generate', label: 'Generate', detail: 'Ollama', explain: 'Produces the answer with a local model through Ollama, fully offline.' },
        { id: 'judge', label: 'Judge', explain: 'Evaluates the answer before diagnosis: [to fill]' },
        {
          id: 'diagnose',
          label: 'Diagnose',
          detail: '15 rules',
          explain: '15 deterministic rules localize the failing stage; every finding cites the rule ID that fired.',
        },
      ],
      packets: [
        {
          path: ['query', 'retrieve', 'ground', 'generate', 'judge', 'diagnose'],
          start: 0,
          // Fails silently: the answer keeps flowing, carrying the fault downstream.
          marks: { ground: { status: 'fail' } },
        },
      ],
      trace: { from: 'diagnose', to: 'ground', status: 'fail', note: 'root cause: grounding' },
      caption: 'A planted grounding failure flows through silently; the rule engine traces it back to its stage.',
    },
    githubUrl: null, // TODO: https://github.com/shreyas0917/retrace
    liveUrl: null, // TODO
    image: { src: null, alt: 'Retrace diagnosis dashboard' }, // TODO: /projects/retrace.webp

    problem:
      'A RAG answer can read fluently and still be wrong: retrieval missed the right chunks, the answer was not grounded in the evidence, generation drifted, or the system should have abstained. Without diagnosis you see a bad answer, not the stage that caused it. Asking another LLM to judge gives verdicts that are neither reproducible nor explainable.',
    approach: [
      'Retrieve: the query is matched against chunks stored in ChromaDB.',
      'Ground: the answer is checked against the retrieved evidence.',
      'Generate: a local model answers through Ollama, fully offline.',
      'Judge: [to fill]',
      'Diagnose: 15 deterministic rules localize the failure to retrieval, grounding, generation or abstention, and each finding carries the ID of the rule that fired.',
    ],
    decisions: [
      {
        choice: 'A deterministic rule engine for diagnosis, not an LLM judging itself',
        why: 'The same input always produces the same diagnosis, and every finding is explainable by the ID of the rule that fired. An LLM grading its own output is neither reproducible nor explainable.',
        tradeoff: 'Rules only catch failure patterns someone has written down; a new kind of failure needs a new rule.',
      },
      {
        choice: 'Local inference with Ollama',
        why: 'Runs fully offline, so evaluation runs are reproducible and do not depend on an external API.',
        tradeoff: 'Local models are smaller than hosted ones, and run times depend on local hardware.',
      },
      {
        choice: 'A planted-failure suite as the regression baseline',
        why: 'Each scenario has a known cause, so "12/12 localized" is a concrete bar every rule change has to keep passing.',
        tradeoff: 'Planted failures are curated; failures in the wild can look different from the suite.',
      },
    ],
    testing: {
      checks: [
        '12 planted-failure scenarios, each localized to the stage that caused it (12/12).',
        '98+ automated tests.',
      ],
      caveats: ['Localization accuracy is measured on the 12 planted scenarios with known causes.'],
    },
    learnings: ['[to fill]'],
    next: ['[to fill]'],
    screenshots: [],
  },
  {
    slug: 'eventguard',
    title: 'EventGuard',
    subtitle: 'Idempotent Distributed Event Processing Platform',
    summary:
      'Payment-grade event processing where duplicate webhooks, retries, and crashes never turn into duplicate balance changes.',
    category: 'Distributed Systems',
    year: '2025', // TODO: confirm year
    signal: 'warn',
    spotlight: true,
    featured: true,
    stack: ['Node.js', 'TypeScript', 'Kafka', 'PostgreSQL', 'Redis', 'Prisma', 'React', 'Docker', 'Razorpay'],
    highlights: [
      '0 duplicate balance changes across 100 duplicate deliveries of the same event.',
      'Transactional Outbox with exponential-backoff retries and a dead-letter queue (DLQ).',
      'Raw-body HMAC-SHA256 verification for Razorpay webhooks.',
      'Admin dashboard for inspecting events, retries and DLQ entries.',
    ],
    metrics: [
      { value: '0', label: 'duplicate balance changes', status: 'ok' },
      { value: '100', label: 'duplicate deliveries', status: 'warn' },
    ],
    flow: {
      nodes: [
        { id: 'razorpay', label: 'Razorpay', explain: 'Payment provider. Webhooks arrive at least once, so duplicates are expected.' },
        { id: 'webhook', label: 'Webhook', detail: 'HMAC check', explain: 'Verifies the HMAC-SHA256 signature on the raw body before parsing anything.' },
        { id: 'kafka', label: 'Kafka', explain: 'Carries events from ingestion to processing.' },
        {
          id: 'lock',
          label: 'Redis Lock',
          detail: 'idempotency',
          explain: 'Redis distributed lock on the event: a duplicate finds it held and is stopped.',
        },
        { id: 'postgres', label: 'Postgres', detail: 'ledger', explain: 'The balance change commits inside a PostgreSQL transaction.' },
      ],
      packets: [
        {
          path: ['razorpay', 'webhook', 'kafka', 'lock', 'postgres'],
          start: 0,
          marks: { webhook: { status: 'ok' }, postgres: { status: 'ok', note: 'balance +1' } },
        },
        {
          // The same event, delivered again.
          path: ['razorpay', 'webhook', 'kafka', 'lock'],
          start: 1.5,
          marks: { webhook: { status: 'ok' }, lock: { status: 'warn', note: 'duplicate · blocked' } },
        },
      ],
      caption: 'The same payment event arrives twice. The replay is stopped at the lock, so the balance changes once.',
    },
    githubUrl: null, // TODO: https://github.com/shreyas0917/eventguard
    liveUrl: null, // TODO
    image: { src: null, alt: 'EventGuard admin dashboard' }, // TODO

    problem:
      'Razorpay delivers webhooks at least once, so the same payment event can arrive more than once. Without idempotency, every redelivery or retry becomes another balance change. And if the database write and the event publish can drift apart, events are lost or applied twice.',
    approach: [
      'Razorpay sends a webhook; its HMAC-SHA256 signature is verified on the raw body, before any parsing.',
      'The database write and the event to publish are committed together through a Transactional Outbox.',
      'Events flow through Kafka to processing.',
      'A Redis distributed lock on the event lets one delivery through; a duplicate finds the lock held and is stopped.',
      'The balance changes inside a PostgreSQL transaction. Failures retry with exponential backoff and end in a dead-letter queue (DLQ) for safe replay.',
    ],
    decisions: [
      {
        choice: 'Redis distributed lock + PostgreSQL transaction',
        why: 'Delivery is at-least-once, so duplicates are a given. The lock stops a duplicate from being processed twice, and the transaction makes the balance change all-or-nothing: at-least-once delivery becomes exactly-once business effects.',
        tradeoff: 'Redis becomes part of the processing path, one more dependency that has to be available.',
      },
      {
        choice: 'Transactional Outbox',
        why: 'The state change and the event to publish commit in the same database transaction, so they cannot drift apart: no event without its write, no write without its event.',
        tradeoff: 'Events are published after the commit, so they go out slightly later, and a relay has to run alongside the app.',
      },
      {
        choice: 'Exponential backoff and a dead-letter queue',
        why: 'Transient failures retry with growing delays instead of hammering a struggling dependency; events that keep failing are parked in the DLQ for safe replay instead of blocking the stream.',
        tradeoff: 'Parked events need someone to inspect and replay them, and retries add latency.',
      },
      {
        choice: 'HMAC-SHA256 verification on the raw body, before parsing',
        why: 'The signature covers the exact bytes Razorpay sent. Checking them before parsing means re-serialized JSON cannot break verification, and unverified payloads are never processed.',
        tradeoff: 'The webhook route has to keep the raw body, so it bypasses the usual JSON body parsing.',
      },
    ],
    testing: {
      checks: [
        '100 duplicate deliveries of the same event: 0 duplicate balance changes.',
        'How the duplicate deliveries were produced, and in which environment: [to fill]',
        'Automated tests: [to fill]',
      ],
      caveats: ['Scope of the 0-duplicates result: 100 duplicate deliveries of one event.'],
    },
    learnings: ['[to fill]'],
    next: ['[to fill]'],
    screenshots: [],
  },
  {
    slug: 'google-jobs-pipeline',
    title: 'Live Google Jobs Aggregator',
    subtitle: 'Data Engineering Pipeline',
    summary:
      'A scheduled lakehouse pipeline that pulls live job listings, cleans them through a Medallion architecture, and alerts on failure.',
    category: 'Data Engineering',
    year: '2024', // TODO: confirm year
    signal: 'ok',
    spotlight: false,
    featured: true,
    stack: ['Python', 'PySpark', 'Delta Lake', 'Databricks', 'SerpAPI', 'SQL', 'Matplotlib'],
    highlights: [
      'Medallion architecture: raw Bronze ingestion, cleaned Silver tables, analytics-ready Gold aggregates.',
      'Scheduled every 6 hours on Databricks, with email alerts when a run fails.',
      '250+ records ingested per batch from SerpAPI Google Jobs results.',
      'Delta Lake tables for ACID writes and time travel across batches.',
    ],
    metrics: [
      { value: '250+', label: 'records per batch', status: 'ok' },
      { value: '6h', label: 'run schedule', status: 'ok' },
    ],
    flow: {
      nodes: [
        { id: 'serpapi', label: 'SerpAPI', detail: 'every 6h', explain: 'Source of live Google Jobs results, pulled every 6 hours.' },
        { id: 'bronze', label: 'Bronze', detail: 'raw', explain: 'Raw records, kept exactly as they arrived, so nothing is lost.' },
        { id: 'silver', label: 'Silver', detail: 'clean', explain: 'Cleaned records, re-runnable from Bronze when the cleaning logic changes.' },
        { id: 'gold', label: 'Gold', detail: 'aggregate', explain: 'Analytics-ready aggregates built from Silver.' },
        { id: 'analytics', label: 'Analytics', detail: 'charts', explain: 'Charts built with Matplotlib from the Gold layer.' },
      ],
      packets: [
        { path: ['serpapi', 'bronze', 'silver', 'gold', 'analytics'], start: 0 },
        { path: ['serpapi', 'bronze', 'silver', 'gold', 'analytics'], start: 0.32 },
        { path: ['serpapi', 'bronze', 'silver', 'gold', 'analytics'], start: 0.64 },
        {
          path: ['serpapi', 'bronze', 'silver', 'gold', 'analytics'],
          start: 0.96,
          marks: { analytics: { status: 'ok', note: 'batch landed' } },
        },
      ],
      caption: 'Each batch is refined layer by layer, from raw Bronze to analytics-ready Gold.',
    },
    githubUrl: null, // TODO
    liveUrl: null, // TODO
    image: { src: null, alt: 'Jobs pipeline Gold-layer charts' }, // TODO

    problem:
      'Job listings change all the time, so a one-off scrape goes stale. Without layered storage, one bad cleaning step can destroy the raw data it came from, and a scheduled job that fails silently simply stops producing data.',
    approach: [
      'Every 6 hours, a Databricks run pulls live Google Jobs results from SerpAPI: 250+ records per batch.',
      'Bronze keeps the raw records exactly as they arrived.',
      'Silver holds the cleaned records, rebuilt from Bronze with PySpark whenever the cleaning changes.',
      'Gold holds analytics-ready aggregates, queried with SQL and charted with Matplotlib.',
      'If a run fails, an email alert goes out.',
    ],
    decisions: [
      {
        choice: 'Medallion layers: Bronze → Silver → Gold',
        why: 'Raw data is never lost, and cleaning can be re-run from Bronze whenever the logic changes.',
        tradeoff: 'The same data is stored several times, and each layer is one more step to maintain.',
      },
      {
        choice: 'Delta Lake tables',
        why: 'Reliable, transactional writes: a failed run does not leave half-written tables behind.',
        tradeoff: 'Ties storage to the Delta format and a Spark runtime such as Databricks.',
      },
      {
        choice: 'Scheduled runs with email alerts on failure',
        why: 'Data refreshes every 6 hours without anyone running it, and a failure is loud instead of a silent gap.',
        tradeoff: 'Between runs, the data can be up to 6 hours old.',
      },
    ],
    testing: {
      checks: [
        'Runs on a 6-hour schedule, with an email alert when a run fails.',
        '250+ records ingested per batch.',
        'Data-quality checks or tests: [to fill]',
      ],
      caveats: ['250+ is the batch size per run, not a throughput benchmark.'],
    },
    learnings: ['[to fill]'],
    next: ['[to fill]'],
    screenshots: [],
  },
  {
    slug: 'url-shortener',
    title: 'Production-Ready URL Shortener',
    subtitle: 'Cached, Rate-Limited Short-Link Service',
    summary:
      'A short-link service built the way production services are: Base62 IDs, a Redis cache in front of Postgres, rate limiting, and an Nginx front door on EC2.',
    category: 'Backend',
    year: '2024', // TODO: confirm year
    signal: 'ok',
    spotlight: false,
    featured: true,
    stack: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'React', 'Docker', 'Nginx', 'AWS EC2'],
    // Honesty rule: scale is a design goal only. No traffic numbers until measured.
    highlights: [
      'Designed for high-concurrency traffic.',
      'Redis caching on the redirect path, with per-client rate limiting.',
      'Base62 short codes served through 4 REST APIs.',
      'Containerised with Docker behind Nginx, deployed on AWS EC2.',
    ],
    metrics: [
      { value: '4', label: 'REST APIs', status: 'ok' },
      // Placeholder until benchmarked. Rendered verbatim as a caveat.
      { value: '[~70% DB load reduction — to confirm]', label: 'cache impact', status: 'warn', unverified: true },
    ],
    flow: {
      nodes: [
        { id: 'request', label: 'Request', detail: 'GET /:code', explain: 'A visit to a short link.' },
        { id: 'nginx', label: 'Nginx', explain: 'Nginx, part of the Docker deployment on AWS EC2.' },
        // Rate limiting lives at the API layer, not in Nginx.
        { id: 'api', label: 'API', detail: 'Express', explain: 'Express service with the 4 REST APIs; applies rate limiting.' },
        { id: 'redis', label: 'Redis', detail: 'cache', explain: 'Cache-aside: a hit returns at once; a miss falls through to PostgreSQL.' },
        { id: 'postgres', label: 'Postgres', explain: 'Stores the links; read only on a cache miss.' },
      ],
      packets: [
        {
          // Cold cache: miss, fall through to Postgres, fill the cache on the way back.
          path: ['request', 'nginx', 'api', 'redis', 'postgres', 'redis', 'api', 'nginx', 'request'],
          start: 0,
          pace: 1.15,
          marks: { redis: { status: 'warn', note: 'miss' }, postgres: { status: 'warn', note: 'slow path' } },
        },
        {
          // Warm cache: served from Redis and straight back.
          path: ['request', 'nginx', 'api', 'redis', 'api', 'nginx', 'request'],
          start: 2.6,
          marks: { redis: { status: 'ok', note: 'hit' }, request: { status: 'ok', note: 'fast path' } },
        },
      ],
      caption: 'A cache miss falls through to Postgres (slow path); the next request is served from Redis (fast path).',
    },
    githubUrl: null, // TODO
    liveUrl: null, // TODO
    image: { src: null, alt: 'URL shortener dashboard' }, // TODO

    problem:
      'Short links are read far more often than they are created: every click is a lookup. Without a cache, every redirect hits the database, and without rate limiting, a single client can flood the API.',
    approach: [
      'Creating a link stores it in PostgreSQL and returns a Base62 short code.',
      'A visit goes through Nginx to the Express API, which applies rate limiting.',
      'Cache-aside: Redis is checked first, and a hit redirects straight away (the fast path).',
      'On a miss, the link is read from PostgreSQL and written to Redis for the next request (the slow path).',
      'Everything runs in Docker on AWS EC2. The React front end: [to fill]',
    ],
    decisions: [
      {
        choice: 'Base62 short codes',
        why: 'Codes stay short and URL-safe: letters and digits only, nothing to escape.',
        tradeoff: 'Encoding is not secrecy: how guessable codes are depends on how the underlying IDs are generated.',
      },
      {
        choice: 'Redis cache-aside on the redirect path',
        why: 'Redirects are read-heavy, so repeat lookups are served from memory instead of the database.',
        tradeoff: 'Cached entries can go stale when a link changes or is deleted, so writes have to invalidate them.',
      },
      {
        choice: 'Rate limiting at the API layer',
        why: 'Stops a single client from flooding the service, and protects the database behind it.',
        tradeoff: 'Limits need tuning: too strict throttles legitimate bursts, too loose lets abuse through.',
      },
    ],
    testing: {
      checks: ['Automated tests: [to fill]', 'Load testing: [to fill]'],
      caveats: ['High-concurrency traffic is a design goal, not a measured result.'],
    },
    learnings: ['[to fill]'],
    next: ['[to fill]'],
    screenshots: [],
  },
  {
    slug: 'nextlevel-food',
    title: 'NextLevel Food',
    subtitle: 'Recipe-Sharing Platform',
    summary:
      'A full-stack recipe community: browse, share, and upload meals with images, backed by Supabase Postgres and Storage.',
    category: 'Full Stack',
    year: '2024', // TODO: confirm year
    signal: 'ok',
    spotlight: false,
    featured: true,
    stack: ['Next.js', 'Supabase', 'PostgreSQL', 'Supabase Storage'],
    highlights: [
      'Next.js app with server-rendered recipe pages.',
      'Supabase Postgres for recipes and community data; image uploads in Supabase Storage.',
    ],
    metrics: [],
    flow: {
      nodes: [
        { id: 'user', label: 'User', explain: 'A visitor browsing or sharing recipes.' },
        { id: 'next', label: 'Next.js', detail: 'SSR', explain: 'The Next.js app: reusable components with loading and error states.' },
        { id: 'supabase', label: 'Supabase', detail: 'DB + Storage', explain: 'Postgres for recipes and community data; Storage for meal photos.' },
      ],
      packets: [
        { path: ['user', 'next', 'supabase'], start: 0, marks: { supabase: { status: 'ok', note: 'recipe → DB' } } },
        { path: ['user', 'next', 'supabase'], start: 1.2, marks: { supabase: { status: 'ok', note: 'photo → Storage' } } },
      ],
      caption: 'Recipes are saved to Postgres and photos to Storage, both through Supabase.',
    },
    githubUrl: null, // TODO
    liveUrl: null, // TODO
    image: { src: null, alt: 'NextLevel Food recipe grid' }, // TODO

    problem:
      'A recipe-sharing app needs a database for recipes and community data, and somewhere to keep uploaded photos. Building and running that backend from scratch would slow down shipping the product itself.',
    approach: [
      'Visitors browse and share recipes in the Next.js app.',
      'Recipes and community data are stored in Supabase Postgres.',
      'Meal photos are uploaded to Supabase Storage.',
      'Pages are built from reusable components with loading and error states.',
    ],
    decisions: [
      {
        choice: 'Supabase for the database and file storage',
        why: 'One managed backend for Postgres and image storage, so the time goes into the product instead of infrastructure.',
        tradeoff: "Ties the app to Supabase's platform and its limits.",
      },
      {
        choice: 'Reusable components with loading and error states',
        why: 'Every view handles slow and failed requests the same way, and new pages reuse proven pieces.',
        tradeoff: 'More upfront work on components before features ship.',
      },
    ],
    testing: {
      checks: ['How it was tested: [to fill]'],
    },
    learnings: ['[to fill]'],
    next: ['[to fill]'],
    screenshots: [],
  },
]

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}
