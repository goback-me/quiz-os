'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

export default function TopBar() {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 flex justify-between items-center h-16 px-8 w-full">
      <form
        className="relative hidden sm:block w-64"
        onSubmit={(e) => {
          e.preventDefault()
          const q = new FormData(e.currentTarget).get('q')
          router.push(q ? `/admin/clients?q=${encodeURIComponent(String(q))}` : '/admin/clients')
        }}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          name="q"
          className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-gray-100 transition-all"
          placeholder="Search clients…"
          type="search"
        />
      </form>

      <div className="flex items-center gap-4">
        <Link
          href="/admin/clients/new"
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm active:scale-95 duration-150"
        >
          + New Client
        </Link>
        <UserButton />
      </div>
    </header>
  )
}
