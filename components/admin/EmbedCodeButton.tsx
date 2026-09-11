'use client'

import { useRef, useState } from 'react'
import { Code2, Check, Copy } from 'lucide-react'
import AnchoredPopover from '@/components/admin/AnchoredPopover'

export default function EmbedCodeButton({ embedCode }: { embedCode: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  async function handleCopy() {
    await navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="bg-white border border-gray-200 text-gray-600 py-1 px-3 rounded-lg text-xs hover:bg-gray-50 transition-colors flex items-center gap-1"
      >
        <Code2 size={14} /> Embed
      </button>

      <AnchoredPopover open={open} onClose={() => setOpen(false)} anchorRef={buttonRef} width={320}>
        <div className="p-4">
          <p className="text-xs font-medium text-black mb-2">Paste this on the client's site</p>
          <pre className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
            {embedCode}
          </pre>
          <button
            onClick={handleCopy}
            className="mt-2 w-full bg-black text-white py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-gray-800 transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy embed code'}
          </button>
        </div>
      </AnchoredPopover>
    </>
  )
}
