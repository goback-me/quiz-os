import Link from 'next/link'
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
import { SignOutButton } from '@clerk/nextjs'

export default function Sidebar() {
  return (
    <nav className="hidden md:flex fixed left-0 top-0 h-screen w-[240px] bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.03)] z-50 flex-col py-8 px-4">
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-black text-black leading-tight">Quiz OS</h1>
        <p className="text-xs text-gray-500 mt-0.5">Agency Dashboard</p>
      </div>

      <div className="flex-1 space-y-1">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 text-sm font-medium"
        >
          <LayoutDashboard size={20} />
          Home
        </Link>
        <Link
          href="/admin/clients"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 transition-colors text-black font-bold border-r-2 border-black text-sm"
        >
          <Users size={20} />
          Clients
        </Link>
      </div>

      <div className="mt-auto space-y-1">
        <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-black hover:bg-gray-100 transition-colors text-sm font-medium mb-3">
          Help Center
        </button>
        <div className="border-t border-gray-200 pt-3 space-y-1">
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 text-sm font-medium"
          >
            <Settings size={20} />
            Settings
          </Link>
          <SignOutButton redirectUrl="/sign-in">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 text-sm font-medium">
              <LogOut size={20} />
              Logout
            </button>
          </SignOutButton>
        </div>
      </div>
    </nav>
  )
}
