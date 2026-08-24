// No server-only imports here — this file runs in the browser (QuizRenderer) AND
// on the server (submit route), so the disqualify check is enforced in both places.
// Client-side check = instant UX. Server-side check = the one that's actually trusted.

export type QuizOption = { label: string; value: string }

export type QuizStep =
  | { id: string; type: 'single_select'; question: string; options: QuizOption[] }
  | { id: string; type: 'multi_select'; question: string; options: QuizOption[] }
  | {
      id: string
      type: 'text_input'
      question: string
      inputType: 'text' | 'email' | 'tel'
      required?: boolean
    }
  | {
      id: string
      type: 'contact_fields'
      fields: { name: string; label: string; type: 'text' | 'email' | 'tel'; required?: boolean }[]
    }

export type DisqualifyRule = {
  if: { field: string; equals: string } | { field: string; in: string[] }
  message: string
}

export type QuizSchema = {
  headline: string
  subheadline?: string
  /** Whether the headline renders above the card on the public page. Default true if omitted. */
  showHeadline?: boolean
  steps: QuizStep[]
  disqualify?: DisqualifyRule[]
  endScreen: { heading: string; subheading?: string; redirectUrl?: string }
  /** Optional trust line shown below the card, e.g. "160+ NDIS participants supported, grown by referral."
   *  Text before the first comma renders bold in the primary color; the rest renders in plain secondary color. */
  trustLine?: string
}

export type Answers = Record<string, string | string[]>

/**
 * Returns the first matching disqualify rule for the given answers so far, or null if none match.
 * Called after every answer client-side (for instant feedback) and again server-side on submit
 * (never trust the client — someone could tamper with the request before it hits /api/submit).
 */
export function evaluateDisqualify(schema: QuizSchema, answers: Answers): DisqualifyRule | null {
  if (!schema.disqualify) return null
  for (const rule of schema.disqualify) {
    const value = answers[rule.if.field]
    if ('equals' in rule.if) {
      if (value === rule.if.equals) return rule
    } else if ('in' in rule.if) {
      if (typeof value === 'string' && rule.if.in.includes(value)) return rule
    }
  }
  return null
}

// Keys used for the client-side "don't let them submit again after reload" block.
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
