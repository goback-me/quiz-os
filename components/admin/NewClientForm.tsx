'use client'

import { useState, useTransition } from 'react'

export default function NewClientForm({
  createClient,
}: {
  createClient: (formData: FormData) => Promise<{ error?: string } | void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createClient(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
      <Field label="Client name" name="name" placeholder="Acme Corp" required />
      <Field label="URL slug" name="slug" placeholder="acme-corp" required />
      <Field label="Description" name="description" placeholder="E-commerce Solutions" />
      <Field label="Webhook URL (n8n)" name="webhookUrl" placeholder="https://n8n.example.com/webhook/..." required />
      <Field label="Webhook secret (optional)" name="webhookSecret" placeholder="For HMAC signing" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Primary color" name="primary" placeholder="#3B82F6" defaultValue="#3B82F6" required />
        <Field label="Secondary color" name="secondary" placeholder="#111111" defaultValue="#111111" required />
      </div>
      <Field label="Logo URL (optional)" name="logoUrl" placeholder="https://.../logo.png" />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium w-full hover:bg-gray-800 transition-colors disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Create client'}
      </button>
    </form>
  )
}

function Field({
  label,
  name,
  placeholder,
  required,
  defaultValue,
}: {
  label: string
  name: string
  placeholder?: string
  required?: boolean
  defaultValue?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-black focus:ring-2 focus:ring-gray-100 outline-none"
      />
    </div>
  )
}
