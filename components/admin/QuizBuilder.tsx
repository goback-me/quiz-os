'use client'

import { useState, useTransition } from 'react'
import {
  GripVertical,
  Plus,
  X,
  Ban,
  Smartphone,
  Monitor,
  Trash2,
} from 'lucide-react'
import type { QuizSchema, QuizStep } from '@/lib/quiz-logic'
import { DEFAULT_DISQUALIFY_MESSAGE } from '@/lib/quiz-logic'

let idCounter = 0
function newId(prefix: string) {
  idCounter += 1
  return `${prefix}_${Date.now()}_${idCounter}`
}

export default function QuizBuilder({
  quizId,
  initialSchema,
  initialStatus,
  theme,
  publicUrl,
  saveQuiz,
}: {
  quizId: string
  initialSchema: QuizSchema
  initialStatus: string
  theme: { primary: string; secondary: string; pageBackground?: string }
  publicUrl: string
  saveQuiz: (formData: FormData) => Promise<void>
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

  function updateStep(index: number, updater: (step: QuizStep) => QuizStep) {
    setSchema((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? updater(s) : s)),
    }))
  }

  function addStep() {
    const step: QuizStep = {
      id: newId('q'),
      type: 'single_select',
      question: 'New question',
      options: [{ label: 'Option A', value: 'option_a' }],
    }
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
          <input
            value={schema.headline}
            onChange={(e) => setSchema((p) => ({ ...p, headline: e.target.value }))}
            className="font-semibold text-black text-sm border border-transparent hover:border-gray-200 focus:border-black rounded px-2 py-1 outline-none"
            placeholder="Quiz headline"
          />
          <span className="text-xs text-gray-400">{publicUrl}</span>
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
            {steps.map((step, index) => (
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
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">
                  {index + 1}
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
            ))}
            <button
              onClick={addStep}
              className="w-full mt-1.5 py-2.5 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-black hover:border-black transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <Plus size={16} /> Add step
            </button>
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
                    <select
                      value={currentStep.type}
                      onChange={(e) => {
                        const type = e.target.value as QuizStep['type']
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
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black outline-none"
                    >
                      <option value="single_select">Single Choice</option>
                      <option value="multi_select">Multiple Choice</option>
                      <option value="text_input">Text / Email / Phone</option>
                      <option value="contact_fields">Contact Form (multiple fields)</option>
                    </select>
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
                              className={`flex items-center gap-2 p-1.5 rounded-lg ${opt.disqualify ? 'bg-red-50' : ''}`}
                            >
                              <GripVertical size={16} className="text-gray-300 shrink-0" />
                              <input
                                value={opt.label}
                                onChange={(e) =>
                                  updateStep(selectedIndex, (s) => {
                                    if (!('options' in s)) return s
                                    const nextOptions = [...s.options]
                                    nextOptions[optIndex] = {
                                      ...nextOptions[optIndex],
                                      label: e.target.value,
                                      value: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                                    }
                                    return { ...s, options: nextOptions }
                                  })
                                }
                                className="flex-1 p-1.5 bg-white border border-gray-200 rounded text-sm focus:border-black outline-none"
                              />
                              <label
                                className="flex items-center gap-1.5 text-xs shrink-0 cursor-pointer select-none"
                                title="Selecting this option disqualifies the visitor"
                              >
                                <input
                                  type="checkbox"
                                  checked={opt.disqualify ?? false}
                                  onChange={(e) =>
                                    updateStep(selectedIndex, (s) => {
                                      if (!('options' in s)) return s
                                      const nextOptions = [...s.options]
                                      nextOptions[optIndex] = { ...nextOptions[optIndex], disqualify: e.target.checked }
                                      return { ...s, options: nextOptions }
                                    })
                                  }
                                />
                                <Ban size={13} className={opt.disqualify ? 'text-red-500' : 'text-gray-300'} />
                              </label>
                              <button
                                onClick={() =>
                                  updateStep(selectedIndex, (s) =>
                                    !('options' in s) ? s : { ...s, options: s.options.filter((_, i) => i !== optIndex) }
                                  )
                                }
                                className="text-gray-400 hover:text-red-500 shrink-0"
                              >
                                <X size={16} />
                              </button>
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
                      {currentStep.fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="flex items-center gap-2">
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
                          <button
                            onClick={() =>
                              updateStep(selectedIndex, (s) =>
                                s.type !== 'contact_fields'
                                  ? s
                                  : { ...s, fields: s.fields.filter((_, i) => i !== fieldIndex) }
                              )
                            }
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          updateStep(selectedIndex, (s) =>
                            s.type !== 'contact_fields'
                              ? s
                              : { ...s, fields: [...s.fields, { name: `field_${s.fields.length}`, label: 'New field', type: 'text' }] }
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

        {/* Right: live preview */}
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
          <div
            className="flex-1 p-6 flex items-center justify-center overflow-y-auto"
            style={{ background: theme.pageBackground ?? '#fdf3e7' }}
          >
            <div className={previewDevice === 'mobile' ? 'w-[260px]' : 'w-[380px]'}>
              {schema.showHeadline !== false && (
                <h2
                  className="text-center font-bold mb-4"
                  style={{ color: theme.secondary, fontSize: previewDevice === 'mobile' ? 16 : 20 }}
                >
                  {schema.headline}
                </h2>
              )}

              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div
                  className="h-2 rounded-full mb-4 overflow-hidden"
                  style={{ background: theme.primary + '1f' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${((selectedIndex + 1) / steps.length) * 100}%`,
                      background: `linear-gradient(90deg, ${theme.primary}, ${theme.primary}66)`,
                    }}
                  />
                </div>

                {currentStep && currentStep.type !== 'contact_fields' && (
                  <p
                    className="text-[11px] font-bold uppercase tracking-wide mb-2"
                    style={{ color: theme.primary }}
                  >
                    Question {selectedIndex + 1}
                  </p>
                )}

                {currentStep && (currentStep.type === 'single_select' || currentStep.type === 'multi_select') && (
                  <>
                    <h3 className="font-bold text-sm mb-4" style={{ color: theme.secondary }}>
                      {currentStep.question}
                    </h3>
                    <div className="space-y-2">
                      {currentStep.options.map((opt) => (
                        <div
                          key={opt.value}
                          className="w-full p-3 rounded-xl text-sm flex items-center gap-2"
                          style={{ background: theme.primary + '14', color: theme.secondary }}
                        >
                          {currentStep.type === 'multi_select' && (
                            <span
                              className="w-4 h-4 rounded border inline-block shrink-0"
                              style={{ borderColor: theme.primary + '66' }}
                            />
                          )}
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {currentStep && currentStep.type === 'text_input' && (
                  <>
                    <h3 className="font-bold text-sm mb-4" style={{ color: theme.secondary }}>
                      {currentStep.question}
                    </h3>
                    <div className="p-3 rounded-xl text-sm text-gray-400 border border-gray-200 mb-2 bg-[#fbf7f0]">
                      {currentStep.inputType === 'email'
                        ? 'you@example.com'
                        : currentStep.inputType === 'tel'
                        ? 'Phone number'
                        : 'Type here...'}
                    </div>
                    <div
                      className="w-full p-3 rounded-xl text-sm font-medium text-white text-center"
                      style={{ backgroundColor: theme.primary }}
                    >
                      Continue
                    </div>
                  </>
                )}

                {currentStep && currentStep.type === 'contact_fields' && (
                  <>
                    <h3 className="font-bold text-sm mb-4" style={{ color: theme.secondary }}>
                      Almost done — where should we send this?
                    </h3>
                    <div className="space-y-2">
                      {currentStep.fields.map((f) => (
                        <div
                          key={f.name}
                          className="p-3 rounded-xl text-sm text-gray-400 border border-gray-200 bg-[#fbf7f0]"
                        >
                          {f.label}
                        </div>
                      ))}
                      <div
                        className="w-full p-3 rounded-xl text-sm font-medium text-white text-center mt-2"
                        style={{ backgroundColor: theme.primary }}
                      >
                        Submit
                      </div>
                    </div>
                  </>
                )}
              </div>

              {schema.trustLine && (
                <p className="text-center text-xs mt-4" style={{ color: theme.secondary }}>
                  <strong style={{ color: theme.primary }}>{schema.trustLine.split(',')[0]}</strong>
                  {schema.trustLine.includes(',') ? ',' + schema.trustLine.split(',').slice(1).join(',') : ''}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}