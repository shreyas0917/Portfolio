/*
  Contact form logic, kept apart from the UI: validation, the configured
  endpoint, and the Formspree request (fetch with a timeout).
*/

export interface ContactValues {
  name: string
  email: string
  subject: string
  message: string
  /** Honeypot: hidden from people, filled by bots. Formspree also ignores it by name. */
  _gotcha: string
}

export type Field = 'name' | 'email' | 'subject' | 'message'
export type FieldErrors = Partial<Record<Field, string>>

export const FIELDS: Field[] = ['name', 'email', 'subject', 'message']
export const LIMITS = { name: 100, subject: 150, message: 5000 } as const
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validate(v: ContactValues): FieldErrors {
  const errors: FieldErrors = {}
  const name = v.name.trim()
  const email = v.email.trim()
  const message = v.message.trim()
  if (name.length < 2) errors.name = 'Please enter your name.'
  else if (name.length > LIMITS.name) errors.name = `Keep your name under ${LIMITS.name} characters.`
  if (!email) errors.email = 'Please enter your email so I can reply.'
  else if (!EMAIL.test(email)) errors.email = "That email address doesn't look right."
  if (v.subject.trim().length > LIMITS.subject) errors.subject = `Keep the subject under ${LIMITS.subject} characters.`
  if (message.length < 10) errors.message = 'Add a little more detail (at least 10 characters).'
  else if (message.length > LIMITS.message) errors.message = `Keep the message under ${LIMITS.message.toLocaleString()} characters.`
  return errors
}

/** The configured Formspree endpoint, or null if missing or still the .env.example placeholder. */
export const endpoint: string | null = (() => {
  const raw = import.meta.env.VITE_FORMSPREE_ENDPOINT?.trim()
  if (!raw || !raw.startsWith('https://') || raw.includes('your-form-id')) return null
  return raw
})()

export type SendResult = { ok: true } | { ok: false; reason: string; fieldErrors?: FieldErrors }

const TIMEOUT_MS = 15000

/** POST to Formspree. Resolves (never throws) with ok, or a short reason for the console line. */
export async function send(url: string, v: ContactValues): Promise<SendResult> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    // FormData + Accept keeps this a "simple" CORS request: no preflight round trip.
    const form = new FormData()
    form.append('name', v.name.trim())
    form.append('email', v.email.trim())
    form.append('_subject', v.subject.trim() || `Portfolio message from ${v.name.trim()}`)
    form.append('message', v.message.trim())
    const res = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' }, body: form, signal: controller.signal })
    if (res.ok) return { ok: true }
    // Formspree explains rejections as { errors: [{ field, message }] }.
    const reply = (await res.json().catch(() => null)) as { errors?: Array<{ field?: string; message?: string }> } | null
    const fieldErrors: FieldErrors = {}
    for (const e of reply?.errors ?? []) {
      const field = e.field === '_subject' ? 'subject' : e.field
      if (field && (FIELDS as string[]).includes(field)) fieldErrors[field as Field] = e.message ?? 'Please check this field.'
    }
    return { ok: false, reason: `HTTP ${res.status}`, fieldErrors }
  } catch {
    return { ok: false, reason: controller.signal.aborted ? 'timed out' : 'network error' }
  } finally {
    window.clearTimeout(timer)
  }
}
