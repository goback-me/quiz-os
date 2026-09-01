// No server-only imports here — this file runs in the browser (QuizRenderer) AND
// on the server (submit route), so the disqualify check is enforced in both places.
// Client-side check = instant UX. Server-side check = the one that's actually trusted.

export type QuizOption = {
  label: string
  value: string
  /** When true, selecting this specific option disqualifies the visitor. Lives directly on the
   *  option — no separate rule list to keep in sync, no dropdown to pick "which question". */
  disqualify?: boolean
}

export type QuizStep =
  | { id: string; type: 'single_select'; question: string; options: QuizOption[] }
  | { id: string; type: 'multi_select'; question: string; options: QuizOption[]; buttonText?: string }
  | {
      id: string
      type: 'text_input'
      question: string
      inputType: 'text' | 'email' | 'tel'
      required?: boolean
      buttonText?: string
    }
  | {
      id: string
      type: 'contact_fields'
      heading?: string
      buttonText?: string
      fields: { name: string; label: string; type: 'text' | 'email' | 'tel'; required?: boolean }[]
    }

/** What happens when a disqualifying option gets selected — the same outcome applies to every
 *  disqualifying option across the whole quiz, set once here rather than per-option. */
export type DisqualifyAction =
  | { mode: 'message'; message?: string } // blank message falls back to DEFAULT_DISQUALIFY_MESSAGE
  | { mode: 'redirect'; redirectUrl: string }

export const DEFAULT_DISQUALIFY_MESSAGE =
  "Thanks for your interest. Based on your answers, we're not able to help with this at this time."

export type QuizSchema = {
  headline: string
  subheadline?: string
  /** Whether the headline renders above the card on the public page. Default true if omitted. */
  showHeadline?: boolean
  steps: QuizStep[]
  disqualifyAction?: DisqualifyAction
  endScreen: { heading: string; subheading?: string; redirectUrl?: string }
  /** Optional trust line shown below the card, e.g. "160+ NDIS participants supported, grown by referral."
   *  Text before the first comma renders bold in the primary color; the rest renders in plain secondary color. */
  trustLine?: string
}

export type Answers = Record<string, string | string[]>

export type DisqualifyResult = { mode: 'message'; message: string } | { mode: 'redirect'; redirectUrl: string }

/**
 * Scans every single/multi-select step's answered value(s) for one flagged with `disqualify: true`.
 * Called after every answer client-side (for instant feedback) and again server-side on submit
 * (never trust the client — someone could tamper with the request before it hits /api/submit).
 */
export function evaluateDisqualify(schema: QuizSchema, answers: Answers): DisqualifyResult | null {
  for (const step of schema.steps) {
    if (step.type !== 'single_select' && step.type !== 'multi_select') continue
    const value = answers[step.id]
    const selected = Array.isArray(value) ? value : value !== undefined ? [value] : []
    const hit = step.options.some((o) => o.disqualify && selected.includes(o.value))
    if (!hit) continue

    const action = schema.disqualifyAction
    if (action?.mode === 'redirect' && action.redirectUrl) {
      return { mode: 'redirect', redirectUrl: action.redirectUrl }
    }
    return { mode: 'message', message: (action?.mode === 'message' && action.message) || DEFAULT_DISQUALIFY_MESSAGE }
  }
  return null
}

/**
 * Turns raw internal answers (e.g. { q1: 'credit_cards', q2: 'centrelink' }) into a readable
 * list of { question, answer } pairs using the actual question text and option labels — this is
 * what goes to the client's webhook, so whoever's looking at it in n8n/their CRM can tell what
 * each answer means without cross-referencing the quiz schema by field ID.
 */
export type FormattedAnswer = { question: string; answer: string }

export function formatAnswersForWebhook(schema: QuizSchema, answers: Answers): FormattedAnswer[] {
  const formatted: FormattedAnswer[] = []

  for (const step of schema.steps) {
    if (step.type === 'single_select') {
      const value = answers[step.id]
      const label = step.options.find((o) => o.value === value)?.label ?? (typeof value === 'string' ? value : '')
      formatted.push({ question: step.question, answer: label })
    } else if (step.type === 'multi_select') {
      const values = answers[step.id]
      const labels = Array.isArray(values)
        ? values.map((v) => step.options.find((o) => o.value === v)?.label ?? v).join(', ')
        : ''
      formatted.push({ question: step.question, answer: labels })
    } else if (step.type === 'text_input') {
      const value = answers[step.id]
      formatted.push({ question: step.question, answer: typeof value === 'string' ? value : '' })
    } else if (step.type === 'contact_fields') {
      for (const field of step.fields) {
        const value = answers[field.name]
        formatted.push({ question: field.label, answer: typeof value === 'string' ? value : '' })
      }
    }
  }

  return formatted
}
// Scoped per quizId so blocking one quiz never affects another.
export const disqualifyStorageKey = (quizId: string) => `quizos_dq_${quizId}`
export const disqualifyCookieName = (quizId: string) => `quizos_dq_${quizId}`

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Loose on purpose — accepts spaces, dashes, parens, optional +country code. We're validating
// "looks like a phone number a human typed", not enforcing a specific country's format.
const PHONE_RE = /^[\d\s()+-]{7,20}$/

export function validateFieldValue(
  type: 'text' | 'email' | 'tel',
  value: string | undefined,
  required: boolean | undefined
): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return required ? 'This field is required' : null
  if (type === 'email' && !EMAIL_RE.test(trimmed)) return 'Enter a valid email address'
  if (type === 'tel' && !PHONE_RE.test(trimmed)) return 'Enter a valid phone number'
  return null
}

/**
 * Validates a full answer set against the schema — required fields present, email/phone formats
 * correct. Used server-side in the submit route as the one check that actually counts; the client
 * runs the same logic for instant inline error messages.
 */
export function validateAnswers(schema: QuizSchema, answers: Answers): string[] {
  const errors: string[] = []
  for (const step of schema.steps) {
    if (step.type === 'text_input') {
      const value = answers[step.id]
      const err = validateFieldValue(step.inputType, typeof value === 'string' ? value : '', step.required)
      if (err) errors.push(`${step.question}: ${err}`)
    }
    if (step.type === 'contact_fields') {
      for (const field of step.fields) {
        const value = answers[field.name]
        const err = validateFieldValue(field.type, typeof value === 'string' ? value : '', field.required)
        if (err) errors.push(`${field.label}: ${err}`)
      }
    }
  }
  return errors
}