'use client'

import { useState, useTransition } from 'react'
import { ImageIcon, Palette, SlidersHorizontal, LayoutTemplate, Image as ImageSectionIcon } from 'lucide-react'
import type { ClientTheme } from '@/lib/theme'

const PRIMARY_PRESETS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#000000']
const SECONDARY_PRESETS = ['#F3F4F6', '#E5E7EB', '#D1D5DB']

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Palette
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-black mb-5 flex items-center gap-2">
        <Icon size={16} className="text-gray-400" /> {title}
      </h3>
      {children}
    </div>
  )
}

function ColorField({
  label,
  hint,
  value,
  fallback,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  fallback?: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-black mb-2">{label}</label>
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          value={value || fallback || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-full cursor-pointer border border-gray-200 shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback ? `Auto: ${fallback}` : undefined}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-black outline-none"
        />
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  )
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  min: number
  max: number
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-black mb-2">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-black outline-none"
      />
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  )
}

export default function BrandSettingsForm({
  clientId,
  initialTheme,
  updateBranding,
}: {
  clientId: string
  initialTheme: ClientTheme
  updateBranding: (formData: FormData) => Promise<void>
}) {
  const [primary, setPrimary] = useState(initialTheme.primary)
  const [secondary, setSecondary] = useState(initialTheme.secondary)
  const [font, setFont] = useState(initialTheme.font ?? 'General Sans (Default)')
  const [logoUrl, setLogoUrl] = useState(initialTheme.logoUrl ?? '')
  const [pageBackground, setPageBackground] = useState(initialTheme.pageBackground ?? '#fdf3e7')
  const [cardBackground, setCardBackground] = useState(initialTheme.cardBackground ?? '#ffffff')
  const [fieldBackground, setFieldBackground] = useState(initialTheme.fieldBackground ?? '')
  const [buttonColor, setButtonColor] = useState(initialTheme.buttonColor ?? '')
  const [textColor, setTextColor] = useState(initialTheme.textColor ?? '')
  const [fontSize, setFontSize] = useState(initialTheme.fontSize ?? '15')
  const [fieldBorderColor, setFieldBorderColor] = useState(initialTheme.fieldBorderColor ?? '')
  const [fieldBorderWidth, setFieldBorderWidth] = useState(initialTheme.fieldBorderWidth ?? '0')
  const [buttonBorderColor, setButtonBorderColor] = useState(initialTheme.buttonBorderColor ?? '')
  const [buttonBorderWidth, setButtonBorderWidth] = useState(initialTheme.buttonBorderWidth ?? '0')
  const [hoverColor, setHoverColor] = useState(initialTheme.hoverColor ?? '')
  const [radius, setRadius] = useState(initialTheme.radius ?? '14')
  const [progressColor, setProgressColor] = useState(initialTheme.progressColor ?? '')
  const [progressTrackColor, setProgressTrackColor] = useState(initialTheme.progressTrackColor ?? '')
  const [questionColor, setQuestionColor] = useState(initialTheme.questionColor ?? '')
  const [errorColor, setErrorColor] = useState(initialTheme.errorColor ?? '')
  const [pending, startTransition] = useTransition()
  const [savedFlash, setSavedFlash] = useState(false)

  function handleSubmit(formData: FormData) {
    formData.set('primary', primary)
    formData.set('secondary', secondary)
    formData.set('font', font)
    formData.set('logoUrl', logoUrl)
    formData.set('pageBackground', pageBackground)
    formData.set('cardBackground', cardBackground)
    formData.set('fieldBackground', fieldBackground)
    formData.set('buttonColor', buttonColor)
    formData.set('textColor', textColor)
    formData.set('fontSize', fontSize)
    formData.set('fieldBorderColor', fieldBorderColor)
    formData.set('fieldBorderWidth', fieldBorderWidth)
    formData.set('buttonBorderColor', buttonBorderColor)
    formData.set('buttonBorderWidth', buttonBorderWidth)
    formData.set('hoverColor', hoverColor)
    formData.set('radius', radius)
    formData.set('progressColor', progressColor)
    formData.set('progressTrackColor', progressTrackColor)
    formData.set('questionColor', questionColor)
    formData.set('errorColor', errorColor)
    startTransition(async () => {
      await updateBranding(formData)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    })
  }

  // Effective values used by the live preview — fall back to primary/secondary exactly like the
  // actual public quiz page's CSS does, so what you see here matches what ships.
  const effectiveButton = buttonColor || primary
  const effectiveField = fieldBackground || `${primary}14`
  const effectiveText = textColor || secondary

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Section icon={Palette} title="Brand Colors">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-black mb-2">Primary</label>
                <div className="flex gap-2">
                  {PRIMARY_PRESETS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setPrimary(color)}
                      className="w-9 h-9 rounded-full cursor-pointer transition-all"
                      style={{
                        backgroundColor: color,
                        boxShadow:
                          primary === color
                            ? `0 0 0 2px white, 0 0 0 4px ${color}`
                            : 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                      }}
                      aria-label={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    className="w-9 h-9 rounded-full cursor-pointer border border-gray-200"
                    title="Custom color"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Eyebrow label, progress bar, default button/field tint</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-2">Secondary</label>
                <div className="flex gap-2">
                  {SECONDARY_PRESETS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setSecondary(color)}
                      className="w-9 h-9 rounded-full cursor-pointer transition-all"
                      style={{
                        backgroundColor: color,
                        boxShadow:
                          secondary === color
                            ? `0 0 0 2px white, 0 0 0 4px ${color}`
                            : 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                      }}
                      aria-label={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={secondary}
                    onChange={(e) => setSecondary(e.target.value)}
                    className="w-9 h-9 rounded-full cursor-pointer border border-gray-200"
                    title="Custom color"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Default headline/question text color</p>
              </div>

              <ColorField
                label="Question Heading"
                hint="The question/step heading text — blank matches Text Color"
                value={questionColor}
                fallback={textColor || secondary}
                onChange={setQuestionColor}
              />
              <ColorField label="Progress Bar" value={progressColor} fallback={primary} onChange={setProgressColor} />
              <ColorField
                label="Progress Bar Background"
                hint="The track behind the fill"
                value={progressTrackColor}
                fallback="#f0e8db"
                onChange={setProgressTrackColor}
              />
              <ColorField
                label="Field Hover"
                hint="Shown while hovering an option"
                value={hoverColor}
                fallback={primary}
                onChange={setHoverColor}
              />
            </div>
          </Section>

          <Section icon={LayoutTemplate} title="Card & Fields">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ColorField label="Form Background" hint="The white card itself" value={cardBackground} onChange={setCardBackground} />
              <ColorField
                label="Field Background"
                hint="Answer option pills — blank auto-tints from Primary"
                value={fieldBackground}
                fallback={primary}
                onChange={setFieldBackground}
              />
              <ColorField label="Button Color" hint="Continue/Submit buttons" value={buttonColor} fallback={primary} onChange={setButtonColor} />
              <ColorField label="Text Color" hint="Question/body text" value={textColor} fallback={secondary} onChange={setTextColor} />
              <ColorField label="Page Background" hint="Behind the white card" value={pageBackground} onChange={setPageBackground} />
              <ColorField
                label="Error Text"
                hint="Validation messages, e.g. Enter a valid email"
                value={errorColor}
                fallback="#c0392b"
                onChange={setErrorColor}
              />
            </div>
          </Section>

          <Section icon={SlidersHorizontal} title="Borders">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-black mb-2">Field Border</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={fieldBorderWidth}
                    onChange={(e) => setFieldBorderWidth(e.target.value)}
                    className="w-16 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-black outline-none"
                    title="Width in px, 0 = no border"
                  />
                  <input
                    type="color"
                    value={fieldBorderColor || '#e5ddd0'}
                    onChange={(e) => setFieldBorderColor(e.target.value)}
                    className="w-10 h-10 rounded-full cursor-pointer border border-gray-200 shrink-0"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Width in px, 0 = none</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-black mb-2">Button Border</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={buttonBorderWidth}
                    onChange={(e) => setButtonBorderWidth(e.target.value)}
                    className="w-16 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-black outline-none"
                    title="Width in px, 0 = no border"
                  />
                  <input
                    type="color"
                    value={buttonBorderColor || '#000000'}
                    onChange={(e) => setButtonBorderColor(e.target.value)}
                    className="w-10 h-10 rounded-full cursor-pointer border border-gray-200 shrink-0"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Width in px, 0 = none</p>
              </div>
            </div>
          </Section>

          <Section icon={ImageSectionIcon} title="Typography & Logo">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <NumberField label="Base Font Size (px)" value={fontSize} min={12} max={22} onChange={setFontSize} />
              <NumberField
                label="Corner Radius (px)"
                hint="Applies to the card, fields, and button"
                value={radius}
                min={0}
                max={32}
                onChange={setRadius}
              />
              <div>
                <label className="block text-xs font-medium text-black mb-2">Typography</label>
                <select
                  value={font}
                  onChange={(e) => setFont(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-black focus:ring-2 focus:ring-gray-100 outline-none"
                >
                  <option>General Sans (Default)</option>
                  <option>Inter</option>
                  <option>Roboto</option>
                  <option>Open Sans</option>
                  <option>Poppins</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-black mb-2">Logo URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://client.com/logo.png"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-black focus:ring-2 focus:ring-gray-100 outline-none"
                />
              </div>
            </div>
          </Section>

          <button
            type="submit"
            disabled={pending}
            className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60 self-start"
          >
            {pending ? 'Saving…' : savedFlash ? 'Saved ✓' : 'Save changes'}
          </button>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-3 left-3 text-[11px] text-gray-400 font-mono uppercase tracking-wide">Preview</div>
            <div
              className="w-full max-w-[280px] rounded-xl shadow-md p-4 mt-8"
              style={{ backgroundColor: cardBackground }}
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={18} className="text-gray-400" />
                )}
              </div>
              <h3 className="text-center font-semibold mb-3" style={{ color: effectiveText }}>
                Which product fits your needs?
              </h3>
              <div className="flex flex-col gap-2 mt-3">
                <button
                  className="w-full py-2 px-3 rounded-lg text-sm text-left"
                  style={{ backgroundColor: effectiveField, color: effectiveText }}
                  type="button"
                >
                  Enterprise Suite
                </button>
                <button
                  className="w-full py-2 px-3 rounded-lg text-sm text-left"
                  style={{ backgroundColor: effectiveField, color: effectiveText }}
                  type="button"
                >
                  Starter Pack
                </button>
              </div>
              <button
                className="w-full mt-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: effectiveButton }}
                type="button"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
