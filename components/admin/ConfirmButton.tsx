'use client'

import { useRef, useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import AnchoredPopover from '@/components/admin/AnchoredPopover'

// Same portal-based popover as EmbedCodeButton — a destructive action always needs an "are you
// sure", so this is the one place that logic lives instead of copy-pasted per button.
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
  const buttonRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'bg-white border border-gray-200 text-gray-600 py-1 px-3 rounded-lg text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center gap-1'
        }
      >
        <Trash2 size={14} /> {label}
      </button>

      <AnchoredPopover open={open} onClose={() => setOpen(false)} anchorRef={buttonRef} width={256}>
        <div className="p-4 text-left">
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
      </AnchoredPopover>
    </>
  )
}
