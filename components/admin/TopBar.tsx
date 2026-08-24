import Link from 'next/link'
import { Search, Bell, UserCircle } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

export default function TopBar() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 flex justify-between items-center h-16 px-8 w-full">
      <div className="relative hidden sm:block w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-gray-100 transition-all"
          placeholder="Search..."
          type="text"
        />
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/admin/clients/new"
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm active:scale-95 duration-150"
        >
          + New Client
        </Link>
        <button className="hidden sm:block text-black hover:opacity-70 transition-opacity text-sm font-medium px-2 py-1.5">
          Support
        </button>
        <button className="text-gray-500 hover:text-black transition-colors p-1.5 rounded-full hover:bg-gray-100">
          <Bell size={20} />
        </button>
        <UserButton />
      </div>
    </header>
  )
}
