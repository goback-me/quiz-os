'use client'

import { useState, useTransition } from 'react'
import { ImageIcon } from 'lucide-react'

const PRIMARY_PRESETS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#000000']
const SECONDARY_PRESETS = ['#F3F4F6', '#E5E7EB', '#D1D5DB']

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-black mb-2">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-full cursor-pointer border border-gray-200 shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-mono focus:border-black outline-none"
        />
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function BrandSettingsForm({
  clientId,
  initialTheme,
  updateBranding,
}: {
  clientId: string
  initialTheme: {
    primary: string
    secondary: string
    font?: string
    logoUrl?: string
    pageBackground?: string
    cardBackground?: string
    fieldBackground?: string
    buttonColor?: string
    textColor?: string
  }
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
  const [pending, startTransition] = useTransition()

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
    startTransition(() => updateBranding(formData))
  }

  // Effective values used by the live preview — fall back to primary/secondary exactly like the
  // actual public quiz page's CSS does, so what you see here matches what ships.
  const effectiveButton = buttonColor || primary
  const effectiveField = fieldBackground || `${primary}14`
  const effectiveText = textColor || secondary

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-black mb-4">Brand Settings</h2>
      <form action={handleSubmit}>
        <input type="hidden" name="clientId" value={clientId} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-black mb-2">Primary Color</label>
              <div className="flex gap-2">
                {PRIMARY_PRESETS.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setPrimary(color)}
                    className="w-8 h-8 rounded-full cursor-pointer transition-all"
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
                  className="w-8 h-8 rounded-full cursor-pointer border border-gray-200"
                  title="Custom color"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Accent — eyebrow label, progress bar, default button/field tint</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-black mb-2">Secondary Color</label>
              <div className="flex gap-2">
                {SECONDARY_PRESETS.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setSecondary(color)}
                    className="w-8 h-8 rounded-full cursor-pointer transition-all"
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
                  className="w-8 h-8 rounded-full cursor-pointer border border-gray-200"
                  title="Custom color"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Default headline/question text color</p>
            </div>

            <div className="pt-2 border-t border-gray-100 grid grid-cols-1 gap-4">
              <ColorField
                label="Form Background"
                hint="The white card itself"
                value={cardBackground}
                onChange={setCardBackground}
              />
              <ColorField
                label="Field Background"
                hint="Answer option pills — leave blank to auto-tint from Primary"
                value={fieldBackground}
                onChange={setFieldBackground}
              />
              <ColorField
                label="Button Color"
                hint="Continue/Submit buttons — leave blank to match Primary"
                value={buttonColor}
                onChange={setButtonColor}
              />
              <ColorField
                label="Text Color"
                hint="Question/body text — leave blank to match Secondary"
                value={textColor}
                onChange={setTextColor}
              />
            </div>

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
              <label className="block text-xs font-medium text-black mb-2">Page Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={pageBackground}
                  onChange={(e) => setPageBackground(e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer border border-gray-200"
                />
                <span className="text-xs text-gray-500">Behind the white card — warm cream by default</span>
              </div>
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

            <button
              type="submit"
              disabled={pending}
              className="mt-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          {/* Live Preview */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute top-2 left-2 text-[11px] text-gray-400 font-mono">Preview</div>
            <div
              className="w-full max-w-[280px] rounded-xl shadow-md p-4 mt-4"
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
      </form>
    </div>
  )
}
