'use client'

import { useState, useTransition } from 'react'

export default function SlugField({
  clientId,
  initialSlug,
  siteUrl,
  updateSlug,
}: {
  clientId: string
  initialSlug: string
  siteUrl: string
  updateSlug: (clientId: string, slug: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const [slug, setSlug] = useState(initialSlug)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    const next = String(formData.get('slug'))
    startTransition(async () => {
      const result = await updateSlug(clientId, next)
      setError(result.ok ? null : result.error ?? 'Could not save — try again.')
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
      <form action={handleSubmit} className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">{siteUrl}/q/</span>
        <input
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-mono focus:border-black outline-none"
          placeholder="client-slug (letters, numbers, hyphens only)"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save slug'}
        </button>
      </form>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
