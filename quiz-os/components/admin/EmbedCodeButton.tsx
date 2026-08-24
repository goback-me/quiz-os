'use client'

import { useState } from 'react'
import { Code2, Check, Copy } from 'lucide-react'

export default function EmbedCodeButton({ embedCode }: { embedCode: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-white border border-gray-200 text-gray-600 py-1 px-3 rounded-lg text-xs hover:bg-gray-50 transition-colors flex items-center gap-1"
      >
        <Code2 size={14} /> Embed
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20">
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
        </>
      )}
    </div>
  )
}
