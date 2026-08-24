'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Webhook } from 'lucide-react'

export default function WebhookField({
  clientId,
  updateWebhook,
}: {
  clientId: string
  updateWebhook: (formData: FormData) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateWebhook(formData)
      setEditing(false)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
        <Webhook size={20} /> Integration
      </h2>
      <div className="bg-green-50 text-green-800 rounded-lg p-2.5 flex items-center gap-2 mb-4 text-sm">
        <CheckCircle2 size={18} />
        Connected — leads forward on submit
      </div>

      {!editing ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-black">Endpoint URL</label>
          <input
            readOnly
            type="password"
            value="••••••••••••••••••••••••••"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-500 cursor-not-allowed"
          />
          <button
            onClick={() => setEditing(true)}
            className="mt-2 bg-white border border-gray-200 text-black py-1.5 px-4 rounded-lg text-sm hover:bg-gray-50 transition-colors w-full"
          >
            Replace webhook URL
          </button>
        </div>
      ) : (
        <form action={handleSubmit} className="flex flex-col gap-2">
          <input type="hidden" name="clientId" value={clientId} />
          <label className="text-xs font-medium text-black">New endpoint URL</label>
          <input
            name="webhookUrl"
            type="text"
            autoFocus
            placeholder="https://n8n.example.com/webhook/..."
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-black focus:ring-2 focus:ring-gray-100 outline-none"
            required
          />
          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 bg-black text-white py-1.5 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 border border-gray-200 py-1.5 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
