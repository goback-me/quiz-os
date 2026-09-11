'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  GripVertical,
  Plus,
  X,
  Ban,
  Smartphone,
  Monitor,
  Trash2,
  CircleDot,
  CheckSquare,
  Type as TypeIcon,
  Contact,
  Mail,
  Phone,
  AlignLeft,
} from 'lucide-react'
import type { QuizSchema, QuizStep, QuizOption } from '@/lib/quiz-logic'
import { DEFAULT_DISQUALIFY_MESSAGE } from '@/lib/quiz-logic'
import { themeToCssVars, mergeTheme, type ClientTheme } from '@/lib/theme'
import QuizRenderer from '@/components/QuizRenderer'
import ConfirmButton from '@/components/admin/ConfirmButton'

let idCounter = 0
function newId(prefix: string) {
  idCounter += 1
  return `${prefix}_${Date.now()}_${idCounter}`
}

// Which step you were last editing, per quiz — so reopening the builder (new page load, or
// coming back after navigating away) picks up where you left off instead of always jumping
// back to step 1.
const lastStepKey = (quizId: string) => `quizos_builder_last_step_${quizId}`

const STEP_TYPES: { type: QuizStep['type']; label: string; icon: typeof CircleDot }[] = [
  { type: 'single_select', label: 'Single Choice', icon: CircleDot },
  { type: 'multi_select', label: 'Multiple Choice', icon: CheckSquare },
  { type: 'text_input', label: 'Text / Email / Phone', icon: TypeIcon },
  { type: 'contact_fields', label: 'Contact Form', icon: Contact },
]

function stepTypeIcon(type: QuizStep['type']) {
  return STEP_TYPES.find((t) => t.type === type)?.icon ?? CircleDot
}

const CONTACT_FIELD_ICONS: Record<string, typeof TypeIcon> = { text: AlignLeft, email: Mail, tel: Phone }

const STEP_TYPE_COLORS: Record<QuizStep['type'], string> = {
  single_select: 'bg-blue-50 text-blue-600',
  multi_select: 'bg-purple-50 text-purple-600',
  text_input: 'bg-amber-50 text-amber-600',
  contact_fields: 'bg-emerald-50 text-emerald-600',
}

export default function QuizBuilder({
  quizId,
  clientId,
  initialSchema,
  initialStatus,
  theme,
  publicUrl,
  saveQuiz,
  deleteQuiz,
}: {
  quizId: string
  clientId: string
  initialSchema: QuizSchema
  initialStatus: string
  theme: ClientTheme
  publicUrl: string
  saveQuiz: (formData: FormData) => Promise<void>
  deleteQuiz: () => Promise<void>
}) {
  const [schema, setSchema] = useState<QuizSchema>(initialSchema)
  const [status, setStatus] = useState(initialStatus)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()
  const [savedFlash, setSavedFlash] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile')

  const steps = schema.steps
  const currentStep = steps[selectedIndex]

  // Restore the last-edited step once, on mount, for this quiz.
  useEffect(() => {
    const saved = Number(localStorage.getItem(lastStepKey(quizId)))
    if (Number.isInteger(saved) && saved >= 0 && saved < initialSchema.steps.length) setSelectedIndex(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    localStorage.setItem(lastStepKey(quizId), String(selectedIndex))
  }, [quizId, selectedIndex])

  function updateStep(index: number, updater: (step: QuizStep) => QuizStep) {
    setSchema((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? updater(s) : s)),
    }))
  }

  function updateOption(optIndex: number, patch: Partial<QuizOption>) {
    updateStep(selectedIndex, (s) => {
      if (!('options' in s)) return s
      const nextOptions = [...s.options]
      nextOptions[optIndex] = { ...nextOptions[optIndex], ...patch }
      return { ...s, options: nextOptions }
    })
  }

  function updateThemeOverride(patch: Partial<ClientTheme>) {
    setSchema((prev) => {
      const next: Partial<ClientTheme> = { ...prev.themeOverride, ...patch }
      for (const key of Object.keys(next) as (keyof ClientTheme)[]) {
        if (next[key] === '' || next[key] === undefined) delete next[key]
      }
      return { ...prev, themeOverride: Object.keys(next).length ? next : undefined }
    })
  }

  const effectiveTheme = mergeTheme(theme, schema.themeOverride)

  function addStep(type: QuizStep['type'] = 'single_select') {
    const step: QuizStep =
      type === 'contact_fields'
        ? {
            id: newId('q'),
            type: 'contact_fields',
            fields: [{ name: 'fullName', label: 'Full name', type: 'text', required: true }],
          }
        : type === 'text_input'
        ? { id: newId('q'), type: 'text_input', question: 'New question', inputType: 'text', required: true }
        : { id: newId('q'), type, question: 'New question', options: [{ label: 'Option A', value: 'option_a' }] }
    setSchema((prev) => ({ ...prev, steps: [...prev.steps, step] }))
    setSelectedIndex(steps.length)
  }

  function removeStep(index: number) {
    setSchema((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }))
    setSelectedIndex((i) => Math.max(0, i - (i >= index ? 1 : 0)))
  }

  function reorder(from: number, to: number) {
    setSchema((prev) => {
      const next = [...prev.steps]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return { ...prev, steps: next }
    })
    setSelectedIndex(to)
  }

  function handleSave() {
    const formData = new FormData()
    formData.set('quizId', quizId)
    formData.set('status', status)
    formData.set('schema', JSON.stringify(schema))
    startTransition(async () => {
      await saveQuiz(formData)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -mx-8 -my-8">
      {/* Builder top bar */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/admin/clients/${clientId}`} className="text-gray-400 hover:text-black text-sm shrink-0">
            ← Back
          </Link>
          <input
            value={schema.headline}
            onChange={(e) => setSchema((p) => ({ ...p, headline: e.target.value }))}
            className="font-semibold text-black text-sm border border-transparent hover:border-gray-200 focus:border-black rounded px-2 py-1 outline-none"
            placeholder="Quiz headline"
          />
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-black hover:underline">
            {publicUrl}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          >
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="paused">Paused</option>
          </select>
          <ConfirmButton
            label="Delete"
            message="Delete this quiz permanently? All its submissions are deleted too. This can't be undone."
            action={deleteQuiz}
          />
          <button
            onClick={handleSave}
            disabled={pending}
            className="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {pending ? 'Saving…' : savedFlash ? 'Saved ✓' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: step list */}
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold">Quiz Flow</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {steps.map((step, index) => {
              const StepIcon = stepTypeIcon(step.type)
              return (
                <div
                  key={step.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== index) reorder(dragIndex, index)
                    setDragIndex(null)
                  }}
                  onClick={() => setSelectedIndex(index)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg mb-1.5 cursor-pointer group transition-colors ${
                    selectedIndex === index
                      ? 'bg-gray-50 border border-black'
                      : 'border border-transparent hover:bg-gray-50'
                  }`}
                >
                  <GripVertical size={16} className="text-gray-300 cursor-grab shrink-0" />
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${STEP_TYPE_COLORS[step.type]}`}
                    title={STEP_TYPES.find((t) => t.type === step.type)?.label}
                  >
                    <StepIcon size={14} />
                  </div>
                  <span className={`text-sm flex-1 truncate ${selectedIndex === index ? 'font-medium' : 'text-gray-500'}`}>
                    {step.type === 'contact_fields' ? 'Contact details' : step.question}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeStep(index)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
            <AddStepPicker onAdd={addStep} />
          </div>
        </aside>

        {/* Middle: editor */}
        <section className="flex-1 overflow-y-auto bg-[#fafafa]">
          <div className="p-6 max-w-2xl mx-auto w-full">
            {currentStep && (
              <div className="mb-8">
                <div className="flex justify-between items-end mb-3">
                  <h2 className="text-lg font-semibold">Edit Step</h2>
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-500">ID: {currentStep.id}</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="mb-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Step Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {STEP_TYPES.map(({ type, label, icon: Icon }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            updateStep(selectedIndex, (s) => {
                              if (type === 'contact_fields') {
                                return {
                                  id: s.id,
                                  type: 'contact_fields',
                                  fields: [{ name: 'fullName', label: 'Full name', type: 'text', required: true }],
                                }
                              }
                              if (type === 'text_input') {
                                return {
                                  id: s.id,
                                  type: 'text_input',
                                  question: 'question' in s ? s.question : 'New question',
                                  inputType: 'text',
                                  required: true,
                                }
                              }
                              const question = 'question' in s ? s.question : 'New question'
                              const options = 'options' in s ? s.options : [{ label: 'Option A', value: 'option_a' }]
                              return { id: s.id, type, question, options }
                            })
                          }}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-center transition-colors ${
                            currentStep.type === type
                              ? 'border-black bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center ${STEP_TYPE_COLORS[type]}`}>
                            <Icon size={14} />
                          </span>
                          <span className={`text-xs leading-tight ${currentStep.type === type ? 'font-medium text-black' : 'text-gray-500'}`}>
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {currentStep.type === 'text_input' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Question Text</label>
                        <textarea
                          value={currentStep.question}
                          onChange={(e) =>
                            updateStep(selectedIndex, (s) => (s.type === 'text_input' ? { ...s, question: e.target.value } : s))
                          }
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none resize-none h-20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Input Type</label>
                        <select
                          value={currentStep.inputType}
                          onChange={(e) =>
                            updateStep(selectedIndex, (s) =>
                              s.type === 'text_input' ? { ...s, inputType: e.target.value as any } : s
                            )
                          }
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                        >
                          <option value="text">Text</option>
                          <option value="email">Email (validated)</option>
                          <option value="tel">Phone (validated)</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={currentStep.required ?? false}
                          onChange={(e) =>
                            updateStep(selectedIndex, (s) => (s.type === 'text_input' ? { ...s, required: e.target.checked } : s))
                          }
                        />
                        Required
                      </label>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Button text</label>
                        <input
                          value={currentStep.buttonText ?? ''}
                          onChange={(e) =>
                            updateStep(selectedIndex, (s) => (s.type === 'text_input' ? { ...s, buttonText: e.target.value } : s))
                          }
                          placeholder="Continue"
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {(currentStep.type === 'single_select' || currentStep.type === 'multi_select') && (
                    <>
                      <div className="mb-5">
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Question Text</label>
                        <textarea
                          value={currentStep.question}
                          onChange={(e) =>
                            updateStep(selectedIndex, (s) =>
                              s.type !== 'contact_fields' ? { ...s, question: e.target.value } : s
                            )
                          }
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none resize-none h-20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Options</label>
                        <div className="space-y-2">
                          {currentStep.options.map((opt, optIndex) => (
                            <div
                              key={optIndex}
                              className={`group p-1.5 rounded-lg space-y-1.5 ${opt.disqualify ? 'bg-red-50' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical size={16} className="text-gray-300 shrink-0" />
                                <input
                                  value={opt.icon ?? ''}
                                  onChange={(e) => updateOption(optIndex, { icon: e.target.value || undefined })}
                                  placeholder="🙂"
                                  title="Optional emoji — paste one, leave blank for none"
                                  className="w-10 p-1.5 bg-white border border-gray-200 rounded text-sm text-center focus:border-black outline-none shrink-0"
                                />
                                <input
                                  value={opt.label}
                                  onChange={(e) =>
                                    updateOption(optIndex, {
                                      label: e.target.value,
                                      value: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                                    })
                                  }
                                  className="flex-1 p-1.5 bg-white border border-gray-200 rounded text-sm focus:border-black outline-none"
                                />
                                <label
                                  className={`flex items-center gap-1.5 text-xs shrink-0 cursor-pointer select-none transition-opacity ${
                                    opt.disqualify ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                  }`}
                                  title="Selecting this option disqualifies the visitor"
                                >
                                  <input
                                    type="checkbox"
                                    checked={opt.disqualify ?? false}
                                    onChange={(e) => updateOption(optIndex, { disqualify: e.target.checked })}
                                  />
                                  <Ban size={13} className={opt.disqualify ? 'text-red-500' : 'text-gray-300'} />
                                </label>
                                <button
                                  onClick={() =>
                                    updateStep(selectedIndex, (s) =>
                                      !('options' in s) ? s : { ...s, options: s.options.filter((_, i) => i !== optIndex) }
                                    )
                                  }
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 shrink-0"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              <input
                                value={opt.description ?? ''}
                                onChange={(e) => updateOption(optIndex, { description: e.target.value || undefined })}
                                placeholder="Optional subtitle, e.g. I'm renovating a bathroom"
                                className="ml-[60px] p-1.5 bg-white border border-gray-200 rounded text-xs text-gray-600 focus:border-black outline-none"
                              />
                            </div>
                          ))}
                          <button
                            onClick={() =>
                              updateStep(selectedIndex, (s) =>
                                !('options' in s)
                                  ? s
                                  : {
                                      ...s,
                                      options: [...s.options, { label: 'New option', value: `option_${s.options.length + 1}` }],
                                    }
                              )
                            }
                            className="text-black text-sm hover:underline flex items-center gap-1 mt-1"
                          >
                            <Plus size={14} /> Add Option
                          </button>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-2">
                            <Ban size={12} /> Toggle the icon next to an option to disqualify visitors who pick it
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {currentStep.type === 'contact_fields' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Heading</label>
                        <input
                          value={currentStep.heading ?? ''}
                          onChange={(e) =>
                            updateStep(selectedIndex, (s) =>
                              s.type === 'contact_fields' ? { ...s, heading: e.target.value } : s
                            )
                          }
                          placeholder="Almost done — where should we send this?"
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Fields</label>
                      {currentStep.fields.map((field, fieldIndex) => {
                        const FieldIcon = CONTACT_FIELD_ICONS[field.type] ?? AlignLeft
                        return (
                        <div key={fieldIndex} className="group flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                            <FieldIcon size={13} />
                          </span>
                          <input
                            value={field.label}
                            onChange={(e) =>
                              updateStep(selectedIndex, (s) => {
                                if (s.type !== 'contact_fields') return s
                                const next = [...s.fields]
                                next[fieldIndex] = { ...next[fieldIndex], label: e.target.value }
                                return { ...s, fields: next }
                              })
                            }
                            className="flex-1 p-1.5 bg-white border border-gray-200 rounded text-sm"
                            placeholder="Field label"
                          />
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateStep(selectedIndex, (s) => {
                                if (s.type !== 'contact_fields') return s
                                const next = [...s.fields]
                                next[fieldIndex] = { ...next[fieldIndex], type: e.target.value as any }
                                return { ...s, fields: next }
                              })
                            }
                            className="p-1.5 bg-white border border-gray-200 rounded text-sm"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="tel">Phone</option>
                          </select>
                          <label
                            className="flex items-center gap-1.5 text-xs shrink-0 cursor-pointer select-none text-gray-600"
                            title="Require an answer before the visitor can submit"
                          >
                            <input
                              type="checkbox"
                              checked={field.required ?? false}
                              onChange={(e) =>
                                updateStep(selectedIndex, (s) => {
                                  if (s.type !== 'contact_fields') return s
                                  const next = [...s.fields]
                                  next[fieldIndex] = { ...next[fieldIndex], required: e.target.checked }
                                  return { ...s, fields: next }
                                })
                              }
                            />
                            Required
                          </label>
                          <button
                            onClick={() =>
                              updateStep(selectedIndex, (s) =>
                                s.type !== 'contact_fields'
                                  ? s
                                  : { ...s, fields: s.fields.filter((_, i) => i !== fieldIndex) }
                              )
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )})}
                      <button
                        onClick={() =>
                          updateStep(selectedIndex, (s) =>
                            s.type !== 'contact_fields'
                              ? s
                              : {
                                  ...s,
                                  fields: [
                                    ...s.fields,
                                    { name: `field_${s.fields.length}`, label: 'New field', type: 'text', required: true },
                                  ],
                                }
                          )
                        }
                        className="text-black text-sm hover:underline flex items-center gap-1 mt-1"
                      >
                        <Plus size={14} /> Add field
                      </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Button text</label>
                        <input
                          value={currentStep.buttonText ?? ''}
                          onChange={(e) =>
                            updateStep(selectedIndex, (s) =>
                              s.type === 'contact_fields' ? { ...s, buttonText: e.target.value } : s
                            )
                          }
                          placeholder="Submit"
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Disqualify outcome */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Ban size={18} className="text-red-500" /> When Disqualified
              </h3>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <p className="text-xs text-gray-500">
                  Mark which answers disqualify a visitor directly on each question's options (the{' '}
                  <Ban size={11} className="inline text-red-500" /> icon next to each option, above). This section
                  controls what happens once one of those options is picked — the same outcome applies everywhere in
                  this quiz.
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSchema((prev) => ({ ...prev, disqualifyAction: { mode: 'message', message: '' } }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      (schema.disqualifyAction?.mode ?? 'message') === 'message'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Show a message
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSchema((prev) => ({ ...prev, disqualifyAction: { mode: 'redirect', redirectUrl: '' } }))
                    }
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      schema.disqualifyAction?.mode === 'redirect'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Redirect to a page
                  </button>
                </div>

                {(schema.disqualifyAction?.mode ?? 'message') === 'message' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Message</label>
                    <textarea
                      value={schema.disqualifyAction?.mode === 'message' ? schema.disqualifyAction.message ?? '' : ''}
                      onChange={(e) =>
                        setSchema((prev) => ({ ...prev, disqualifyAction: { mode: 'message', message: e.target.value } }))
                      }
                      placeholder={DEFAULT_DISQUALIFY_MESSAGE}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none resize-none h-20"
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave blank to use the default message shown above as a placeholder.</p>
                  </div>
                )}

                {schema.disqualifyAction?.mode === 'redirect' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Redirect URL</label>
                    <input
                      value={schema.disqualifyAction.redirectUrl ?? ''}
                      onChange={(e) =>
                        setSchema((prev) => ({ ...prev, disqualifyAction: { mode: 'redirect', redirectUrl: e.target.value } }))
                      }
                      placeholder="https://client-site.com/not-eligible"
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Navigates the visitor's whole browser tab, even when this quiz is embedded in an iframe.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Display settings */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Display</h3>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Show headline above card</div>
                    <div className="text-xs text-gray-500">Turn off to remove the "{schema.headline}" heading entirely</div>
                  </div>
                  <button
                    onClick={() => setSchema((prev) => ({ ...prev, showHeadline: prev.showHeadline === false }))}
                    className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ml-4 ${
                      schema.showHeadline !== false ? 'bg-black' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                        schema.showHeadline !== false ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Trust line (optional, shown below the card)
                  </label>
                  <input
                    value={schema.trustLine ?? ''}
                    onChange={(e) => setSchema((prev) => ({ ...prev, trustLine: e.target.value || undefined }))}
                    placeholder="160+ people helped, grown by referral."
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Text before the first comma renders bold in your primary color. Leave blank to hide it.
                  </p>
                </div>
              </div>
            </div>

            {/* Per-quiz color/style overrides — lives in schema.themeOverride (JSON), never a DB
                column, so it's zero-risk to ship: every field left blank just falls back to this
                client's default theme, exactly as before. */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Colors & Style</h3>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">
                <p className="text-xs text-gray-500">
                  Overrides this client's default theme just for this quiz. Leave any field blank to keep using the
                  client default shown as its placeholder.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <OverrideColorField
                    label="Primary (accent)"
                    value={schema.themeOverride?.primary ?? ''}
                    fallback={theme.primary}
                    onChange={(v) => updateThemeOverride({ primary: v })}
                  />
                  <OverrideColorField
                    label="Secondary (headline/text)"
                    value={schema.themeOverride?.secondary ?? ''}
                    fallback={theme.secondary}
                    onChange={(v) => updateThemeOverride({ secondary: v })}
                  />
                  <OverrideColorField
                    label="Question Heading"
                    value={schema.themeOverride?.questionColor ?? ''}
                    fallback={theme.questionColor || theme.textColor || theme.secondary}
                    onChange={(v) => updateThemeOverride({ questionColor: v })}
                  />
                  <OverrideColorField
                    label="Progress Bar"
                    value={schema.themeOverride?.progressColor ?? ''}
                    fallback={theme.progressColor || theme.primary}
                    onChange={(v) => updateThemeOverride({ progressColor: v })}
                  />
                  <OverrideColorField
                    label="Progress Bar Background"
                    value={schema.themeOverride?.progressTrackColor ?? ''}
                    fallback={theme.progressTrackColor || '#f0e8db'}
                    onChange={(v) => updateThemeOverride({ progressTrackColor: v })}
                  />
                  <OverrideColorField
                    label="Page Background"
                    value={schema.themeOverride?.pageBackground ?? ''}
                    fallback={theme.pageBackground || '#fdf3e7'}
                    onChange={(v) => updateThemeOverride({ pageBackground: v })}
                  />
                  <OverrideColorField
                    label="Card Background"
                    value={schema.themeOverride?.cardBackground ?? ''}
                    fallback={theme.cardBackground || '#ffffff'}
                    onChange={(v) => updateThemeOverride({ cardBackground: v })}
                  />
                  <OverrideColorField
                    label="Field Background"
                    value={schema.themeOverride?.fieldBackground ?? ''}
                    fallback={theme.fieldBackground || theme.primary}
                    onChange={(v) => updateThemeOverride({ fieldBackground: v })}
                  />
                  <OverrideColorField
                    label="Button Color"
                    value={schema.themeOverride?.buttonColor ?? ''}
                    fallback={theme.buttonColor || theme.primary}
                    onChange={(v) => updateThemeOverride({ buttonColor: v })}
                  />
                  <OverrideColorField
                    label="Text Color"
                    value={schema.themeOverride?.textColor ?? ''}
                    fallback={theme.textColor || theme.secondary}
                    onChange={(v) => updateThemeOverride({ textColor: v })}
                  />
                  <OverrideColorField
                    label="Field Hover Background"
                    value={schema.themeOverride?.hoverColor ?? ''}
                    fallback={theme.hoverColor || theme.primary}
                    onChange={(v) => updateThemeOverride({ hoverColor: v })}
                  />
                  <OverrideColorField
                    label="Field Hover Text"
                    value={schema.themeOverride?.hoverTextColor ?? ''}
                    fallback={theme.hoverTextColor || theme.textColor || theme.secondary}
                    onChange={(v) => updateThemeOverride({ hoverTextColor: v })}
                  />
                  <OverrideColorField
                    label="Error Text"
                    value={schema.themeOverride?.errorColor ?? ''}
                    fallback={theme.errorColor || '#c0392b'}
                    onChange={(v) => updateThemeOverride({ errorColor: v })}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                  <OverrideNumberField
                    label="Font Size (px)"
                    value={schema.themeOverride?.fontSize ?? ''}
                    fallback={theme.fontSize || '15'}
                    min={12}
                    max={22}
                    onChange={(v) => updateThemeOverride({ fontSize: v })}
                  />
                  <OverrideNumberField
                    label="Corner Radius (px)"
                    value={schema.themeOverride?.radius ?? ''}
                    fallback={theme.radius || '14'}
                    min={0}
                    max={32}
                    onChange={(v) => updateThemeOverride({ radius: v })}
                  />
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <OverrideNumberField
                      label="Field Border (px)"
                      value={schema.themeOverride?.fieldBorderWidth ?? ''}
                      fallback={theme.fieldBorderWidth || '0'}
                      min={0}
                      max={4}
                      onChange={(v) => updateThemeOverride({ fieldBorderWidth: v })}
                    />
                    <OverrideColorField
                      label="Field Border Color"
                      value={schema.themeOverride?.fieldBorderColor ?? ''}
                      fallback={theme.fieldBorderColor || '#e5ddd0'}
                      onChange={(v) => updateThemeOverride({ fieldBorderColor: v })}
                    />
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <OverrideNumberField
                      label="Button Border (px)"
                      value={schema.themeOverride?.buttonBorderWidth ?? ''}
                      fallback={theme.buttonBorderWidth || '0'}
                      min={0}
                      max={4}
                      onChange={(v) => updateThemeOverride({ buttonBorderWidth: v })}
                    />
                    <OverrideColorField
                      label="Button Border Color"
                      value={schema.themeOverride?.buttonBorderColor ?? ''}
                      fallback={theme.buttonBorderColor || '#000000'}
                      onChange={(v) => updateThemeOverride({ buttonBorderColor: v })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Typography</label>
                    <select
                      value={schema.themeOverride?.font ?? ''}
                      onChange={(e) => updateThemeOverride({ font: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                    >
                      <option value="">Use client default ({theme.font ?? 'General Sans'})</option>
                      <option value="General Sans (Default)">General Sans</option>
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Poppins">Poppins</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Logo URL</label>
                    <input
                      value={schema.themeOverride?.logoUrl ?? ''}
                      onChange={(e) => updateThemeOverride({ logoUrl: e.target.value })}
                      placeholder={theme.logoUrl || 'Use client default'}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* End screen */}
            <div>
              <h3 className="text-lg font-semibold mb-3">End Screen</h3>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Heading</label>
                  <input
                    value={schema.endScreen.heading}
                    onChange={(e) =>
                      setSchema((prev) => ({ ...prev, endScreen: { ...prev.endScreen, heading: e.target.value } }))
                    }
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Subheading (optional)</label>
                  <input
                    value={schema.endScreen.subheading ?? ''}
                    onChange={(e) =>
                      setSchema((prev) => ({ ...prev, endScreen: { ...prev.endScreen, subheading: e.target.value } }))
                    }
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-sm font-medium">Redirect URL</div>
                    <div className="text-xs text-gray-500">Send users to a specific page on completion</div>
                  </div>
                  <button
                    onClick={() =>
                      setSchema((prev) => ({
                        ...prev,
                        endScreen: {
                          ...prev.endScreen,
                          redirectUrl: prev.endScreen.redirectUrl !== undefined ? undefined : '',
                        },
                      }))
                    }
                    className={`w-10 h-6 rounded-full relative transition-colors ${
                      schema.endScreen.redirectUrl !== undefined ? 'bg-black' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                        schema.endScreen.redirectUrl !== undefined ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {schema.endScreen.redirectUrl !== undefined && (
                  <input
                    value={schema.endScreen.redirectUrl}
                    onChange={(e) =>
                      setSchema((prev) => ({ ...prev, endScreen: { ...prev.endScreen, redirectUrl: e.target.value } }))
                    }
                    placeholder="https://client-site.com/thank-you"
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right: live preview — the actual QuizRenderer/CSS a visitor gets, not a lookalike,
            so it can never drift from what's really live. Remounts (via key) when you switch
            which step you're editing, jumping the preview straight to that step; otherwise it
            just re-renders live as you type, same as any other controlled input. */}
        <aside className="w-96 bg-white flex flex-col shrink-0 border-l border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">Live Preview</h2>
            <div className="flex gap-2 text-gray-400">
              <button onClick={() => setPreviewDevice('mobile')} className={previewDevice === 'mobile' ? 'text-black' : ''}>
                <Smartphone size={16} />
              </button>
              <button onClick={() => setPreviewDevice('desktop')} className={previewDevice === 'desktop' ? 'text-black' : ''}>
                <Monitor size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div
              className="quiz-page"
              style={{ ...themeToCssVars(effectiveTheme), minHeight: 0, justifyContent: 'flex-start' }}
            >
              <div className={previewDevice === 'mobile' ? 'w-[260px]' : 'w-[380px]'}>
                <QuizRenderer
                  key={selectedIndex}
                  quizId={quizId}
                  schema={schema}
                  logoUrl={effectiveTheme.logoUrl}
                  preview
                  initialStepIndex={selectedIndex}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function OverrideColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string
  value: string
  fallback: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-full cursor-pointer border border-gray-200 shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Default: ${fallback}`}
          className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-mono focus:border-black outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-gray-400 hover:text-red-500 shrink-0"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

function OverrideNumberField({
  label,
  value,
  fallback,
  min,
  max,
  onChange,
}: {
  label: string
  value: string
  fallback: string
  min: number
  max: number
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={fallback}
        className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-black outline-none"
      />
    </div>
  )
}

// Click "+ Add step" -> a small grid of step types to add, each with its own icon — replaces a
// single generic button so it's clear at a glance what a new step can be, before you add it.
function AddStepPicker({ onAdd }: { onAdd: (type: QuizStep['type']) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full mt-1.5 py-2.5 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-black hover:border-black transition-all flex items-center justify-center gap-1.5 text-sm"
      >
        <Plus size={16} /> Add step
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-20 grid grid-cols-2 gap-1.5">
            {STEP_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => {
                  onAdd(type)
                  setOpen(false)
                }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-100 hover:border-black hover:bg-gray-50 transition-colors text-center"
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${STEP_TYPE_COLORS[type]}`}>
                  <Icon size={16} />
                </span>
                <span className="text-xs text-gray-700 leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}