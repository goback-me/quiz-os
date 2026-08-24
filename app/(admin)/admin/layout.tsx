import Sidebar from '@/components/admin/Sidebar'
import TopBar from '@/components/admin/TopBar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9f9fa]">
      <Sidebar />
      <div className="md:ml-[240px] flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 md:px-8 py-8">{children}</main>
      </div>
    </div>
  )
}
