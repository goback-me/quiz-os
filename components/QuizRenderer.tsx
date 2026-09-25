'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Answers,
  QuizSchema,
  QuizOption,
  evaluateDisqualify,
  disqualifyStorageKey,
  disqualifyCookieName,
  validateFieldValue,
  DEFAULT_DISQUALIFY_MESSAGE,
  buildRedirectUrl,
} from '@/lib/quiz-logic'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function captureUtm(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  // Capture EVERY query param on the URL — not just utm_* — so custom tracking params like
  // lead_source, campaign, adset, ad_name, utm_adset, utm_ad, etc. all pass through automatically.
  // Just append them to the embed/quiz URL and they land in the webhook payload untouched.
  const captured: Record<string, string> = {}
  params.forEach((value, key) => {
    captured[key] = value
  })
  return captured
}

export default function QuizRenderer({
  quizId,
  schema,
  logoUrl,
  preview = false,
  initialStepIndex = 0,
}: {
  quizId: string
  schema: QuizSchema
  logoUrl?: string
  /** True when rendered inside the admin builder's live preview — skips real submissions,
   *  localStorage/cookie disqualify persistence, and top-level navigation, none of which should
   *  ever fire just because someone is editing a quiz. */
  preview?: boolean
  initialStepIndex?: number
}) {
  const [stepIndex, setStepIndex] = useState(initialStepIndex)
  const [answers, setAnswers] = useState<Answers>({})
  const [contact, setContact] = useState<Record<string, string>>({})
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({})
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [disqualifyMessage, setDisqualifyMessage] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [checkedStorage, setCheckedStorage] = useState(preview)
  const [capturedParams, setCapturedParams] = useState<Record<string, string>>({})
  const [isEmbedded, setIsEmbedded] = useState(false)

  // Detect embed context on mount — when true, we drop the outer padding/max-width/background so
  // the form fills the iframe edge-to-edge instead of looking like a boxed widget sitting inside
  // whatever container the host page already has around it.
  useEffect(() => {
    try {
      const embedded = window.self !== window.top
      setIsEmbedded(embedded)
      if (embedded) {
        // body has a fixed gray background (app/globals.css) for the standalone case — clear it
        // here so no gray strip shows below the card while the iframe height catches up via
        // ResizeObserver, or if the card is simply shorter than the iframe's fallback min-height.
        document.body.style.background = 'transparent'
      }
    } catch {
      setIsEmbedded(true) // cross-origin access itself throwing means we're definitely in an iframe
      document.body.style.background = 'transparent'
    }
  }, [])
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  function reportHeight(node: HTMLElement) {
    // node.scrollHeight (not offsetHeight alone) so content that overflows the wrapper's own box
    // still gets measured correctly — but never document.documentElement/body.scrollHeight. Those
    // can never report smaller than the iframe's CURRENT viewport height, so once the iframe grew
    // to any size it could never shrink back down: every later measurement would be floored at
    // whatever height the iframe last was, even after content became shorter. That's what was
    // pinning every embed's minimum height at whatever it happened to render on the very first
    // paint, leaving a large blank gap under short quizzes.
    const height = Math.max(node.offsetHeight, node.scrollHeight)
    window.parent.postMessage({ type: 'quizos:resize', height }, '*')
  }

  // Report our own height to whatever parent window is embedding us (embed.js listens for this).
  // Harmless no-op if we're not actually in an iframe — posting to window.parent === window is fine.
  // A callback ref (not useEffect) because this component swaps between three different root
  // elements (disqualified / end screen / quiz) and each swap needs the observer reattached.
  const wrapperRef = useCallback((node: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect()
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => reportHeight(node))
    observer.observe(node)
    resizeObserverRef.current = observer
    reportHeight(node) // report immediately too, don't wait for the first resize event
  }, [])

  // Capture every query param on the URL once, as soon as the quiz loads — this way it doesn't
  // matter which step the person is on when they finally submit, the tracking data is already saved.
  useEffect(() => {
    setCapturedParams(captureUtm())
  }, [])

  // Detect back/forward-cache restoration (hitting the browser's Back button after being
  // redirected away often restores the page from cache instead of a real reload — React never
  // remounts, so the disqualify check above never re-runs, and the frozen pre-redirect quiz state
  // just reappears). Force a real reload when that happens so the check actually runs again.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        window.location.reload()
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  // On mount: if this browser already got disqualified on this quiz, block it permanently —
  // survives reload even though this is a public, unauthenticated form. Handles both outcome
  // modes: a stored "message" shows the block screen again; a stored "redirect" re-navigates
  // immediately, since the visitor shouldn't be able to get back to the quiz by hitting back.
  useEffect(() => {
    if (preview) return
    const stored =
      localStorage.getItem(disqualifyStorageKey(quizId)) ?? getCookie(disqualifyCookieName(quizId))
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { mode: 'message' | 'redirect'; message?: string; redirectUrl?: string }
        if (parsed.mode === 'redirect' && parsed.redirectUrl) {
          try {
            window.top!.location.href = parsed.redirectUrl
          } catch {
            window.location.href = parsed.redirectUrl
          }
          return // don't setCheckedStorage — we're navigating away, nothing left to render
        }
        setDisqualifyMessage(parsed.message ?? DEFAULT_DISQUALIFY_MESSAGE)
      } catch {
        // Pre-upgrade data from before this was stored as JSON — it's a plain message string.
        setDisqualifyMessage(stored)
      }
    }
    setCheckedStorage(true)
  }, [quizId, preview])

  const steps = schema.steps
  const currentStep = steps[stepIndex]
  const progressPct = ((stepIndex + 1) / steps.length) * 100

  // Shared by the instant client-side check (selectOption/continueMultiSelect) and the
  // server-confirmed result from handleSubmit — both hit the same two outcome modes. In preview
  // mode this only ever updates local state: no localStorage/cookie writes (would leak into the
  // real public quiz's disqualify state for this quizId) and no top-level navigation away from
  // the builder.
  function applyDisqualifyOutcome(data: { mode: 'message' | 'redirect'; message?: string; redirectUrl?: string }) {
    if (preview) {
      setDisqualifyMessage(
        data.mode === 'redirect' ? `Redirects visitor to: ${data.redirectUrl}` : data.message ?? DEFAULT_DISQUALIFY_MESSAGE
      )
      return
    }
    const serialized = JSON.stringify(data)
    localStorage.setItem(disqualifyStorageKey(quizId), serialized)
    setCookie(disqualifyCookieName(quizId), serialized)
    if (data.mode === 'redirect') {
      try {
        window.top!.location.href = data.redirectUrl!
      } catch {
        window.location.href = data.redirectUrl!
      }
      return
    }
    setDisqualifyMessage(data.message ?? DEFAULT_DISQUALIFY_MESSAGE)
  }

  function goNext() {
    setFieldError(null)
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1)
  }

  function goBack() {
    setFieldError(null)
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  function selectOption(fieldId: string, value: string) {
    const nextAnswers = { ...answers, [fieldId]: value }
    setAnswers(nextAnswers)

    // Instant client-side check for UX — the real enforcement happens again server-side on submit.
    const result = evaluateDisqualify(schema, nextAnswers)
    if (result) {
      applyDisqualifyOutcome(result)
      return
    }
    goNext()
  }

  function toggleMultiOption(fieldId: string, value: string) {
    const current = answers[fieldId]
    const arr = Array.isArray(current) ? current : []
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
    setAnswers({ ...answers, [fieldId]: next })
  }

  function continueMultiSelect() {
    const current = answers[currentStep.id]
    if (!Array.isArray(current) || current.length === 0) {
      setFieldError('Select at least one option')
      return
    }
    const result = evaluateDisqualify(schema, answers)
    if (result) {
      applyDisqualifyOutcome(result)
      return
    }
    goNext()
  }

  function continueTextInput() {
    if (currentStep.type !== 'text_input') return
    const value = answers[currentStep.id]
    const error = validateFieldValue(currentStep.inputType, typeof value === 'string' ? value : '', currentStep.required)
    if (error) {
      setFieldError(error)
      return
    }
    goNext()
  }

  function validateContactField(field: { name: string; type: 'text' | 'email' | 'tel'; required?: boolean }, value: string) {
    const error = validateFieldValue(field.type, value, field.required)
    setContactErrors((prev) => {
      const next = { ...prev }
      if (error) next[field.name] = error
      else delete next[field.name]
      return next
    })
  }

  async function handleSubmit() {
    if (currentStep.type === 'contact_fields') {
      const errors: Record<string, string> = {}
      for (const field of currentStep.fields) {
        const error = validateFieldValue(field.type, contact[field.name], field.required)
        if (error) errors[field.name] = error
      }
      setContactErrors(errors)
      if (Object.keys(errors).length > 0) return
    }
    setFieldError(null)

    if (preview) {
      // No network call in preview — never send a fake lead to the client's real webhook.
      // Disqualify is re-checked locally against the same logic the server would run.
      const result = evaluateDisqualify(schema, { ...answers, ...contact })
      if (result) applyDisqualifyOutcome(result)
      else setSubmitted(true)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/submit/${quizId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: { ...answers, ...contact },
          utm: capturedParams,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFieldError(data.error ?? 'Something went wrong — please check your details and try again.')
        return
      }
      if (data.disqualified) {
        applyDisqualifyOutcome(
          data.disqualifyMode === 'redirect' && data.redirectUrl
            ? { mode: 'redirect', redirectUrl: data.redirectUrl }
            : { mode: 'message', message: data.message }
        )
      } else if (schema.endScreen.redirectUrl) {
        // {{fieldKey}} placeholders get the visitor's answers; answers win over same-named query params.
        const url = buildRedirectUrl(schema.endScreen.redirectUrl, schema.endScreen.redirectParams, {
          ...capturedParams,
          ...answers,
          ...contact,
        })
        // window.top (not window) — navigates the whole browser tab, not just this iframe.
        // Falls back to window.location if top-navigation is ever blocked (rare, only happens
        // if the embedding site explicitly sandboxes the iframe without allow-top-navigation).
        try {
          window.top!.location.href = url
        } catch {
          window.location.href = url
        }
      } else {
        setSubmitted(true)
      }
    } catch {
      setFieldError('Could not submit — check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!checkedStorage) return null // avoid a flash of the quiz before the storage check runs

  if (disqualifyMessage) {
    return (
      <div className={`quiz-card quiz-disqualified ${isEmbedded ? 'quiz-embedded' : ''}`} ref={wrapperRef}>
        {logoUrl && <img src={logoUrl} alt="" className="quiz-logo" />}
        <p>{disqualifyMessage}</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className={`quiz-card quiz-end ${isEmbedded ? 'quiz-embedded' : ''}`} ref={wrapperRef}>
        {logoUrl && <img src={logoUrl} alt="" className="quiz-logo" />}
        <h2>{schema.endScreen.heading}</h2>
        {schema.endScreen.subheading && <p>{schema.endScreen.subheading}</p>}
      </div>
    )
  }

  return (
    <div className={`quiz-page-wrapper ${isEmbedded ? 'quiz-embedded' : ''}`} ref={wrapperRef}>
      {logoUrl && <img src={logoUrl} alt="" className="quiz-logo" />}
      {schema.showHeadline !== false && <h1 className="quiz-page-headline">{schema.headline}</h1>}
      <div className="quiz-card">
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        {currentStep.type !== 'contact_fields' && (
          <p className="quiz-eyebrow">Question {stepIndex + 1}</p>
        )}

        {currentStep.type === 'single_select' && (
          <fieldset>
            <legend>{currentStep.question}</legend>
            {currentStep.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="quiz-option"
                onClick={() => selectOption(currentStep.id, opt.value)}
              >
                <OptionContent option={opt} />
              </button>
            ))}
            <BackButton visible={stepIndex > 0} onClick={goBack} />
          </fieldset>
        )}

        {currentStep.type === 'multi_select' && (
          <fieldset>
            <legend>{currentStep.question}</legend>
            {currentStep.options.map((opt) => {
              const selected =
                Array.isArray(answers[currentStep.id]) && (answers[currentStep.id] as string[]).includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`quiz-option quiz-option-multi ${selected ? 'quiz-option-selected' : ''}`}
                  onClick={() => toggleMultiOption(currentStep.id, opt.value)}
                >
                  <span className="quiz-checkbox">{selected ? '✓' : ''}</span>
                  <OptionContent option={opt} />
                </button>
              )
            })}
            {fieldError && <p className="quiz-error">{fieldError}</p>}
            <button type="button" className="quiz-submit" onClick={continueMultiSelect}>
              {currentStep.buttonText || 'Continue'}
            </button>
            <BackButton visible={stepIndex > 0} onClick={goBack} />
          </fieldset>
        )}

        {currentStep.type === 'text_input' && (
          <div>
            <legend>{currentStep.question}</legend>
            <input
              type={currentStep.inputType}
              placeholder={
                currentStep.inputType === 'email' ? 'you@example.com' : currentStep.inputType === 'tel' ? 'Phone number' : ''
              }
              value={typeof answers[currentStep.id] === 'string' ? (answers[currentStep.id] as string) : ''}
              onChange={(e) => setAnswers({ ...answers, [currentStep.id]: e.target.value })}
              className="quiz-input"
            />
            {fieldError && <p className="quiz-error">{fieldError}</p>}
            <button type="button" className="quiz-submit" onClick={continueTextInput}>
              {currentStep.buttonText || 'Continue'}
            </button>
            <BackButton visible={stepIndex > 0} onClick={goBack} />
          </div>
        )}

        {currentStep.type === 'contact_fields' && (
          <div>
            <legend>{currentStep.heading || 'Almost done — where should we send this?'}</legend>
            {currentStep.fields.map((field) => (
              <div key={field.name}>
                <input
                  type={field.type}
                  placeholder={field.label}
                  required={field.required}
                  value={contact[field.name] ?? ''}
                  onChange={(e) => {
                    setContact({ ...contact, [field.name]: e.target.value })
                    if (contactErrors[field.name]) validateContactField(field, e.target.value)
                  }}
                  onBlur={(e) => validateContactField(field, e.target.value)}
                  className={`quiz-input ${contactErrors[field.name] ? 'quiz-input-error' : ''}`}
                />
                {contactErrors[field.name] && <p className="quiz-error">{contactErrors[field.name]}</p>}
              </div>
            ))}
            {fieldError && <p className="quiz-error">{fieldError}</p>}
            <button type="button" className="quiz-submit" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Sending…' : currentStep.buttonText || 'Submit'}
            </button>
            <BackButton visible={stepIndex > 0} onClick={goBack} />
          </div>
        )}
      </div>

      {schema.trustLine && <TrustLine text={schema.trustLine} />}
    </div>
  )
}

function OptionContent({ option }: { option: QuizOption }) {
  return (
    <span className="quiz-option-body">
      {option.icon && <span className="quiz-option-icon">{option.icon}</span>}
      <span className="quiz-option-text">
        <span className="quiz-option-label">{option.label}</span>
        {option.description && <span className="quiz-option-description">{option.description}</span>}
      </span>
    </span>
  )
}

function BackButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  if (!visible) return null
  return (
    <button type="button" className="quiz-back" onClick={onClick}>
      ← Back
    </button>
  )
}

function TrustLine({ text }: { text: string }) {
  const [bold, ...rest] = text.split(',')
  const remainder = rest.join(',')
  return (
    <p className="quiz-trust-line">
      <strong>{bold}</strong>
      {remainder ? `,${remainder}` : ''}
    </p>
  )
}