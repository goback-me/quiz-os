import { ClerkProvider } from '@clerk/nextjs'
import Sidebar from '@/components/admin/Sidebar'
import TopBar from '@/components/admin/TopBar'

// ClerkProvider is scoped to just /admin (and /sign-in, see app/sign-in/layout.tsx) instead of
// the root layout — public quiz pages under /q/* are embedded on third-party sites and never use
// auth, so they shouldn't pay for Clerk's client-side init (a real network round-trip) on every
// load.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <div className="min-h-screen bg-[#f9f9fa]">
        <Sidebar />
        <div className="md:ml-[240px] flex flex-col min-h-screen">
          <TopBar />
          <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 md:px-8 py-8">{children}</main>
        </div>
      </div>
    </ClerkProvider>
  )
}
