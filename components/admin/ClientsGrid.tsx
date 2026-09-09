'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

type ClientCard = {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  primary: string
  secondary: string
  logoUrl?: string
  liveCount: number
}

type SortBy = 'newest' | 'oldest' | 'name'

export default function ClientsGrid({ clients, initialQuery = '' }: { clients: ClientCard[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [sortBy, setSortBy] = useState<SortBy>('newest')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? clients.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
      : clients

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortBy === 'newest' ? -diff : diff
    })
  }, [clients, query, sortBy])

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-gray-100"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="bg-white border border-gray-200 rounded-lg text-sm px-3 py-1.5 text-black"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">No clients match "{query}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((client) => (
            <Link
              key={client.id}
              href={`/admin/clients/${client.id}`}
              className="bg-white rounded-xl border border-gray-100 p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] transition-all duration-200 flex flex-col"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center text-lg font-bold text-gray-400 mb-4">
                {client.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={client.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  client.name.charAt(0)
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black mb-1">{client.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{client.description ?? client.slug}</p>
              </div>
              <div className="mt-auto border-t border-gray-100 pt-4 flex items-center justify-between">
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: client.liveCount > 0 ? `${client.primary}22` : '#f3f4f6',
                    color: client.liveCount > 0 ? client.primary : '#6b7280',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: client.liveCount > 0 ? client.primary : '#9ca3af' }}
                  />
                  {client.liveCount} Live {client.liveCount === 1 ? 'Quiz' : 'Quizzes'}
                </div>
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: client.primary }} />
                  <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: client.secondary }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
