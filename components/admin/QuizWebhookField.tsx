'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Webhook } from 'lucide-react'

// Same write-only pattern as the client-level WebhookField — the decrypted URL is never sent to
// the browser, only ever replaced. Adds a "use client's default" reset that the client-level
// field doesn't need, since this one is an optional override rather than the only copy.
// updateQuizWebhook/removeQuizWebhookOverride arrive pre-bound to this quiz's id (and the
// revalidatePath target) by the parent page, so they only need a FormData carrying `webhookUrl`.
export default function QuizWebhookField({
  hasOverride,
  updateQuizWebhook,
  removeQuizWebhookOverride,
}: {
  hasOverride: boolean
  updateQuizWebhook: (formData: FormData) => Promise<void>
  removeQuizWebhookOverride: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateQuizWebhook(formData)
      setEditing(false)
    })
  }

  function handleRemove() {
    startTransition(removeQuizWebhookOverride)
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
        <Webhook size={16} className="text-gray-400" /> Webhook Override
      </h3>

      {hasOverride ? (
        <div className="bg-green-50 text-green-800 rounded-lg p-2.5 flex items-center gap-2 mb-3 text-sm">
          <CheckCircle2 size={16} />
          This quiz forwards to its own webhook, not the client's default
        </div>
      ) : (
        <p className="text-xs text-gray-500 mb-3">
          Currently forwarding to this client's default webhook. Set one here to send just this quiz's leads
          somewhere else.
        </p>
      )}

      {!editing ? (
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="flex-1 bg-white border border-gray-200 text-black py-1.5 px-4 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            {hasOverride ? 'Replace webhook URL' : 'Set a webhook for this quiz'}
          </button>
          {hasOverride && (
            <button
              onClick={handleRemove}
              disabled={pending}
              className="flex-1 border border-gray-200 text-gray-600 py-1.5 px-4 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {pending ? 'Removing…' : "Use client's default"}
            </button>
          )}
        </div>
      ) : (
        <form action={handleSubmit} className="flex flex-col gap-2">
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
