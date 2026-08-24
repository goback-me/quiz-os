import Link from 'next/link'
import { Filter, ArrowUpDown, MoreVertical } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: { quizzes: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-black">Clients</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your active agency clients and their quiz ecosystems.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors text-black">
            <Filter size={16} /> Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors text-black">
            <ArrowUpDown size={16} /> Sort
          </button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500 mb-4">No clients yet.</p>
          <Link href="/admin/clients/new" className="inline-block bg-black text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Add your first client
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clients.map((client) => {
            const theme = client.theme as { primary: string; secondary: string; logoUrl?: string }
            const liveCount = client.quizzes.filter((q) => q.status === 'live').length
            return (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="bg-white rounded-xl border border-gray-100 p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] transition-all duration-200 group flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center text-lg font-bold text-gray-400">
                    {theme.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={theme.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      client.name.charAt(0)
                    )}
                  </div>
                  <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical size={20} />
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black mb-1">{client.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{client.description ?? client.slug}</p>
                </div>
                <div className="mt-auto border-t border-gray-100 pt-4 flex items-center justify-between">
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: liveCount > 0 ? `${theme.primary}22` : '#f3f4f6',
                      color: liveCount > 0 ? theme.primary : '#6b7280',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: liveCount > 0 ? theme.primary : '#9ca3af' }}
                    />
                    {liveCount} Live {liveCount === 1 ? 'Quiz' : 'Quizzes'}
                  </div>
                  <div className="flex gap-1">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: theme.secondary }}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
