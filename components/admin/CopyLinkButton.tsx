'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="bg-white border border-gray-200 text-gray-600 py-1 px-3 rounded-lg text-xs hover:bg-gray-50 transition-colors flex items-center gap-1"
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}
