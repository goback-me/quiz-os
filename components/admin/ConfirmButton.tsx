'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'

// Same click-away-popover pattern as EmbedCodeButton — a destructive action always needs an
// "are you sure", so this is the one place that logic lives instead of copy-pasted per button.
export default function ConfirmButton({
  label,
  confirmLabel = 'Delete',
  message,
  action,
  className,
}: {
  label: string
  confirmLabel?: string
  message: string
  action: () => Promise<void>
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'bg-white border border-gray-200 text-gray-600 py-1 px-3 rounded-lg text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center gap-1'
        }
      >
        <Trash2 size={14} /> {label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 text-left">
            <p className="text-xs text-gray-600 mb-3">{message}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => { await action() })}
                className="flex-1 bg-red-600 text-white py-1.5 rounded-lg text-xs font-medium disabled:opacity-60 hover:bg-red-700 transition-colors"
              >
                {pending ? 'Deleting…' : confirmLabel}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 py-1.5 rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
