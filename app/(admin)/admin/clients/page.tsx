import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import ClientsGrid from '@/components/admin/ClientsGrid'
import type { ClientTheme } from '@/lib/theme'

export const dynamic = 'force-dynamic'

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const clients = await prisma.client.findMany({
    include: { quizzes: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-semibold tracking-tight text-black">Clients</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your active agency clients and their quiz ecosystems.</p>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500 mb-4">No clients yet.</p>
          <Link href="/admin/clients/new" className="inline-block bg-black text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Add your first client
          </Link>
        </div>
      ) : (
        <ClientsGrid
          initialQuery={searchParams.q ?? ''}
          clients={clients.map((client) => {
            const theme = client.theme as ClientTheme
            return {
              id: client.id,
              name: client.name,
              slug: client.slug,
              description: client.description,
              createdAt: client.createdAt.toISOString(),
              primary: theme.primary,
              secondary: theme.secondary,
              logoUrl: theme.logoUrl,
              liveCount: client.quizzes.filter((q) => q.status === 'live').length,
            }
          })}
        />
      )}
    </div>
  )
}
