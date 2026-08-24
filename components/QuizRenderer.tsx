'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Answers,
  QuizSchema,
  evaluateDisqualify,
  disqualifyStorageKey,
  disqualifyCookieName,
  validateFieldValue,
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
}: {
  quizId: string
  schema: QuizSchema
  logoUrl?: string
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [contact, setContact] = useState<Record<string, string>>({})
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [disqualifyMessage, setDisqualifyMessage] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [checkedStorage, setCheckedStorage] = useState(false)
  const [capturedParams, setCapturedParams] = useState<Record<string, string>>({})
  const [isEmbedded, setIsEmbedded] = useState(false)

  // Detect embed context on mount — when true, we drop the outer padding/max-width/background so
  // the form fills the iframe edge-to-edge instead of looking like a boxed widget sitting inside
  // whatever container the host page already has around it.
  useEffect(() => {
    try {
      setIsEmbedded(window.self !== window.top)
    } catch {
      setIsEmbedded(true) // cross-origin access itself throwing means we're definitely in an iframe
    }
  }, [])
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Report our own height to whatever parent window is embedding us (embed.js listens for this).
  // Harmless no-op if we're not actually in an iframe — posting to window.parent === window is fine.
  // A callback ref (not useEffect) because this component swaps between three different root
  // elements (disqualified / end screen / quiz) and each swap needs the observer reattached.
  const wrapperRef = useCallback((node: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect()
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      window.parent.postMessage({ type: 'quizos:resize', height: node.offsetHeight }, '*')
    })
    observer.observe(node)
    resizeObserverRef.current = observer
  }, [])

  // Capture every query param on the URL once, as soon as the quiz loads — this way it doesn't
  // matter which step the person is on when they finally submit, the tracking data is already saved.
  useEffect(() => {
    setCapturedParams(captureUtm())
  }, [])

  // On mount: if this browser already got disqualified on this quiz, block it permanently —
  // survives reload even though this is a public, unauthenticated form.
  useEffect(() => {
    const stored =
      localStorage.getItem(disqualifyStorageKey(quizId)) ?? getCookie(disqualifyCookieName(quizId))
    if (stored) setDisqualifyMessage(stored)
    setCheckedStorage(true)
  }, [quizId])

  const steps = schema.steps
  const currentStep = steps[stepIndex]
  const progressPct = ((stepIndex + 1) / steps.length) * 100

  function persistDisqualify(message: string) {
    localStorage.setItem(disqualifyStorageKey(quizId), message)
    setCookie(disqualifyCookieName(quizId), message)
    setDisqualifyMessage(message)
  }

  function goNext() {
    setFieldError(null)
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1)
  }

  function selectOption(fieldId: string, value: string) {
    const nextAnswers = { ...answers, [fieldId]: value }
    setAnswers(nextAnswers)

    // Instant client-side check for UX — the real enforcement happens again server-side on submit.
    const rule = evaluateDisqualify(schema, nextAnswers)
    if (rule) {
      persistDisqualify(rule.message)
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

  async function handleSubmit() {
    if (currentStep.type === 'contact_fields') {
      for (const field of currentStep.fields) {
        const error = validateFieldValue(field.type, contact[field.name], field.required)
        if (error) {
          setFieldError(`${field.label}: ${error}`)
          return
        }
      }
    }
    setFieldError(null)
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
        persistDisqualify(data.message)
      } else if (schema.endScreen.redirectUrl) {
        // window.top (not window) — navigates the whole browser tab, not just this iframe.
        // Falls back to window.location if top-navigation is ever blocked (rare, only happens
        // if the embedding site explicitly sandboxes the iframe without allow-top-navigation).
        try {
          window.top!.location.href = schema.endScreen.redirectUrl
        } catch {
          window.location.href = schema.endScreen.redirectUrl
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
                {opt.label}
              </button>
            ))}
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
                  {opt.label}
                </button>
              )
            })}
            {fieldError && <p className="quiz-error">{fieldError}</p>}
            <button type="button" className="quiz-submit" onClick={continueMultiSelect}>
              Continue
            </button>
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
              Continue
            </button>
          </div>
        )}

        {currentStep.type === 'contact_fields' && (
          <div>
            <legend>Almost done — where should we send this?</legend>
            {currentStep.fields.map((field) => (
              <input
                key={field.name}
                type={field.type}
                placeholder={field.label}
                required={field.required}
                value={contact[field.name] ?? ''}
                onChange={(e) => setContact({ ...contact, [field.name]: e.target.value })}
                className="quiz-input"
              />
            ))}
            {fieldError && <p className="quiz-error">{fieldError}</p>}
            <button type="button" className="quiz-submit" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Sending…' : 'Submit'}
            </button>
          </div>
        )}
      </div>

      {schema.trustLine && <TrustLine text={schema.trustLine} />}
    </div>
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