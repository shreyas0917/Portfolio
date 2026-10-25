import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { SectionHeading } from '../components/SectionHeading'
import { StatusDot } from '../components/StatusDot'
import { ExternalIcon, GitHubIcon, LinkedInIcon, MailIcon, ResumeIcon } from '../components/icons'
import { profile } from '../data/profile'
import { cn } from '../lib/cn'
import { endpoint, FIELDS, LIMITS, send, validate, type ContactValues, type Field, type FieldErrors } from '../lib/contactForm'

type Phase = 'idle' | 'sending' | 'success' | 'error'

const EMPTY: ContactValues = { name: '', email: '', subject: '', message: '', _gotcha: '' }
const place = profile.location.split(',').map((s) => s.trim())

/* ── Header ───────────────────────────────────────────────────────────── */

function ContactBar() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-surface/60 px-3 py-2 font-mono text-[12px]">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-2.5 text-fg">
          <StatusDot live />
          <span>
            <span className="text-fg-muted">// </span>open_a_connection
          </span>
        </span>
        <span className="text-ok">[accepting messages]</span>
      </span>
      <span className="text-fg-muted">06</span>
    </div>
  )
}

/* ── Left: direct channels ────────────────────────────────────────────── */

/** Clipboard API first; a hidden-textarea copy for browsers or contexts without it. */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

function CopyEmail() {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    setState((await copyText(profile.email)) ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2200)
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={cn(
          'hit-area shrink-0 rounded border px-2 py-0.5 font-mono text-[11px] transition-colors',
          state === 'copied' ? 'border-ok/60 text-ok' : state === 'failed' ? 'border-fail/60 text-fail' : 'border-line-strong text-fg-dim hover:border-accent hover:text-accent',
        )}
      >
        {state === 'copied' ? 'copied ✓' : state === 'failed' ? 'copy failed' : 'copy'}
        <span className="sr-only"> email address</span>
      </button>
      <span role="status" className="sr-only">
        {state === 'copied' ? 'Email address copied to clipboard.' : state === 'failed' ? 'Copy failed. Select the address to copy it.' : ''}
      </span>
    </>
  )
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-x-3 px-4 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
      <dt className="font-mono text-[11px] text-fg-muted">{k}</dt>
      <dd className="flex min-w-0 items-center justify-between gap-3">{children}</dd>
    </div>
  )
}

function ExternalRow({ k, href, label, icon }: { k: string; href: string; label: string; icon: ReactNode }) {
  return (
    <Row k={k}>
      <a href={href} target="_blank" rel="noopener noreferrer" className="hit-area group flex min-w-0 flex-1 items-center justify-between gap-3 text-fg-dim transition-colors hover:text-accent">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="shrink-0 text-fg-muted transition-colors group-hover:text-accent">
            {icon}
          </span>
          <span className="truncate font-mono text-[13px]">{label}</span>
        </span>
        <ExternalIcon className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </Row>
  )
}

function Channels() {
  const linkedinPath = new URL(profile.linkedin).pathname.replace(/\/$/, '')
  const githubUser = new URL(profile.github).pathname.replace(/^\//, '')
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface/60">
        <p className="border-b border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">channels</p>
        <dl className="divide-y divide-line">
          <Row k="email">
            <a href={`mailto:${profile.email}`} className="hit-area flex min-w-0 items-center gap-2 text-fg transition-colors hover:text-accent">
              <MailIcon aria-hidden="true" className="shrink-0 text-fg-muted" width={16} height={16} />
              <span className="truncate font-mono text-[13px] underline decoration-line-strong underline-offset-4">{profile.email}</span>
            </a>
            <CopyEmail />
          </Row>
          <ExternalRow k="linkedin" href={profile.linkedin} label={linkedinPath} icon={<LinkedInIcon width={16} height={16} />} />
          <ExternalRow k="github" href={profile.github} label={githubUser} icon={<GitHubIcon width={16} height={16} />} />
          <ExternalRow k="resume" href={profile.resume} label="view résumé" icon={<ResumeIcon width={16} height={16} />} />
          <Row k="location">
            <span className="font-mono text-[13px] text-fg-dim">
              {place[0]}, {place[place.length - 1]}
            </span>
          </Row>
          <Row k="status">
            <span className="flex items-center gap-2 font-mono text-[13px] text-ok">
              <StatusDot live /> {profile.contact.status}
            </span>
          </Row>
        </dl>
      </div>
      <p className="mt-4 flex items-center gap-2 font-mono text-[12px] text-fg-muted">
        <span aria-hidden="true">↳</span> {profile.contact.responseTime}
      </p>
    </div>
  )
}

/* ── Right: the form ──────────────────────────────────────────────────── */

type NodeState = 'idle' | 'active' | 'ok' | 'fail'

const NODE: Record<NodeState, string> = {
  idle: 'border-line-strong bg-bg text-fg-muted',
  active: 'border-accent bg-accent/15 text-fg',
  ok: 'border-ok bg-ok/15 text-ok',
  fail: 'border-fail bg-fail/15 text-fail',
}

function TraceNode({ label, state }: { label: string; state: NodeState }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-[3px] border transition-colors duration-300', NODE[state])} />
      <span className={cn('transition-colors', state === 'idle' ? 'text-fg-muted' : state === 'fail' ? 'text-fail' : state === 'ok' ? 'text-ok' : 'text-fg')}>
        {label}
      </span>
    </span>
  )
}

function TraceHop({ state }: { state: 'idle' | 'flowing' | 'ok' | 'fail' }) {
  return (
    <span className="relative mx-2 h-px min-w-6 flex-1 overflow-hidden bg-line-strong">
      <span className={cn('absolute inset-0 origin-left transition-transform duration-500', state === 'ok' ? 'scale-x-100 bg-ok' : state === 'fail' ? 'scale-x-100 bg-fail' : 'scale-x-0')} />
      {state === 'flowing' && <span className="trace-packet absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent motion-reduce:hidden" />}
    </span>
  )
}

/** The request as a tiny pipeline: client → formspree → inbox. */
function RequestTrace({ phase }: { phase: Phase }) {
  const client: NodeState = phase === 'idle' ? 'idle' : phase === 'sending' ? 'active' : 'ok'
  const relay: NodeState = phase === 'success' ? 'ok' : phase === 'error' ? 'fail' : 'idle'
  const inbox: NodeState = phase === 'success' ? 'ok' : 'idle'
  return (
    <div aria-hidden="true" className="flex items-center font-mono text-[11px]">
      <TraceNode label="client" state={client} />
      <TraceHop state={phase === 'sending' ? 'flowing' : phase === 'success' ? 'ok' : phase === 'error' ? 'fail' : 'idle'} />
      <TraceNode label="formspree" state={relay} />
      <TraceHop state={phase === 'success' ? 'ok' : 'idle'} />
      <TraceNode label="inbox" state={inbox} />
    </div>
  )
}

const inputClass = (invalid: boolean) =>
  cn(
    'w-full rounded-md border bg-bg-elev px-3 py-2.5 text-sm text-fg placeholder:text-fg-muted/70 transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed',
    invalid ? 'border-fail/70 focus:border-fail focus-visible:ring-fail/30' : 'border-line hover:border-line-strong focus:border-accent focus-visible:ring-accent/30',
  )

interface FieldProps {
  name: Field
  label: string
  required?: boolean
  error?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}

function FormField({ name, label, required, error, children }: FieldProps) {
  const id = `contact-${name}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted">
        <span>
          {label}
          {required && <span className="text-accent"> *</span>}
        </span>
        {!required && <span className="normal-case tracking-normal text-fg-muted">optional</span>}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined })}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-fail">
          <span aria-hidden="true">✗</span> {error}
        </p>
      )}
    </div>
  )
}

function ContactForm() {
  const offline = endpoint === null
  const [values, setValues] = useState<ContactValues>(EMPTY)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [phase, setPhase] = useState<Phase>('idle')
  const [reason, setReason] = useState('')
  // A ref, not state: a second click in the same frame still sees the lock.
  const inFlight = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)

  // Client checks first; a server error (e.g. Formspree rejecting the email) wins only while it exists.
  const errors: FieldErrors = validate(values)
  for (const f of FIELDS) if (serverErrors[f]) errors[f] = serverErrors[f]
  const shown = (f: Field) => (submitted || touched[f] ? errors[f] : undefined)

  const update = (f: keyof ContactValues) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [f]: e.target.value }))
    if (f !== '_gotcha') setServerErrors((s) => ({ ...s, [f]: undefined }))
  }
  const blur = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }))

  const submit = async () => {
    if (!endpoint || inFlight.current) return
    setSubmitted(true)
    const invalid = FIELDS.filter((f) => validate(values)[f])
    if (invalid.length) {
      formRef.current?.querySelector<HTMLElement>(`#contact-${invalid[0]}`)?.focus()
      return
    }
    // Bots fill the hidden field: pretend it worked, send nothing.
    if (values._gotcha) {
      setPhase('success')
      return
    }
    inFlight.current = true
    setPhase('sending')
    const result = await send(endpoint, values)
    inFlight.current = false
    if (result.ok) {
      setPhase('success')
      setValues(EMPTY)
      setTouched({})
      setSubmitted(false)
    } else {
      setReason(result.reason)
      setServerErrors(result.fieldErrors ?? {})
      setPhase('error')
    }
    statusRef.current?.focus()
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submit()
  }

  const sending = phase === 'sending'
  const locked = offline || sending

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-describedby="contact-status" className="overflow-hidden rounded-xl border border-line bg-surface/60">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
        <span>post /contact</span>
        <span className="flex items-center gap-1.5">
          {offline ? (
            <>
              <StatusDot status="warn" /> offline
            </>
          ) : sending ? (
            <>
              <StatusDot live status="ok" /> in flight
            </>
          ) : phase === 'success' ? (
            <>
              <StatusDot status="ok" /> 200
            </>
          ) : phase === 'error' ? (
            <>
              <StatusDot status="fail" /> failed
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full border border-fg-muted" aria-hidden="true" /> idle
            </>
          )}
        </span>
      </div>

      <fieldset disabled={locked} aria-busy={sending} className={cn('space-y-4 p-4 sm:p-6', offline && 'opacity-60')}>
        <legend className="sr-only">Send a message</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField name="name" label="name" required error={shown('name')}>
            {(a) => <input {...a} name="name" autoComplete="name" maxLength={LIMITS.name + 20} value={values.name} onChange={update('name')} onBlur={blur('name')} className={inputClass(!!shown('name'))} />}
          </FormField>
          <FormField name="email" label="email" required error={shown('email')}>
            {(a) => (
              <input {...a} type="email" name="email" autoComplete="email" inputMode="email" value={values.email} onChange={update('email')} onBlur={blur('email')} className={inputClass(!!shown('email'))} />
            )}
          </FormField>
        </div>
        <FormField name="subject" label="subject" error={shown('subject')}>
          {(a) => <input {...a} name="subject" maxLength={LIMITS.subject + 20} value={values.subject} onChange={update('subject')} onBlur={blur('subject')} className={inputClass(!!shown('subject'))} />}
        </FormField>
        <FormField name="message" label="message" required error={shown('message')}>
          {(a) => (
            <textarea
              {...a}
              name="message"
              rows={5}
              value={values.message}
              onChange={update('message')}
              onBlur={blur('message')}
              className={cn(inputClass(!!shown('message')), 'min-h-[8rem] resize-y')}
            />
          )}
        </FormField>

        {/* Honeypot: off-screen, out of the tab order and hidden from assistive tech. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="contact-gotcha">Leave this field empty</label>
          <input id="contact-gotcha" name="_gotcha" tabIndex={-1} autoComplete="off" value={values._gotcha} onChange={update('_gotcha')} />
        </div>
      </fieldset>

      <div className="space-y-4 border-t border-line px-4 py-4 sm:px-6">
        <RequestTrace phase={offline ? 'idle' : phase} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p id="contact-status" ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className="min-w-0 font-mono text-[12px] focus:outline-none">
            {offline ? (
              <span className="text-warn">
                form offline · email me directly at{' '}
                <a href={`mailto:${profile.email}`} className="underline decoration-warn/50 underline-offset-4">
                  {profile.email}
                </a>
              </span>
            ) : sending ? (
              <span className="text-fg-dim">sending…</span>
            ) : phase === 'success' ? (
              <span className="text-ok">200 OK · message delivered</span>
            ) : phase === 'error' ? (
              <span className="text-fail">request failed · retry{reason && <span> ({reason})</span>}</span>
            ) : (
              <span className="text-fg-muted">ready</span>
            )}
          </p>

          {phase === 'success' ? (
            <button type="button" onClick={() => setPhase('idle')} className="btn-ghost btn-sm">
              send another
            </button>
          ) : (
            <button type={phase === 'error' ? 'button' : 'submit'} onClick={phase === 'error' ? () => void submit() : undefined} disabled={locked} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
              {sending ? 'sending…' : phase === 'error' ? 'retry' : 'send message'}
              {!sending && <span aria-hidden="true">→</span>}
            </button>
          )}
        </div>

        {phase === 'error' && (
          <p className="font-mono text-[12px] text-fg-muted">
            or email me directly:{' '}
            <a href={`mailto:${profile.email}`} className="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent">
              {profile.email}
            </a>
          </p>
        )}
      </div>
    </form>
  )
}

export function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="shell defer-render scroll-mt-20 py-24 sm:py-32 [contain-intrinsic-size:auto_1100px]">
      <SectionHeading index="06" kicker="contact" title="Open a connection." id="contact-title" bar={<ContactBar />} />
      <p className="-mt-4 mb-10 max-w-prose text-lg text-fg-dim sm:-mt-6 sm:mb-12">{profile.contact.pitch}</p>
      <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
        <Channels />
        <ContactForm />
      </div>
    </section>
  )
}
