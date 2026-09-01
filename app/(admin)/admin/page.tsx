import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Users, FileText, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  const [clientCount, liveQuizCount, submissionCount] = await Promise.all([
    prisma.client.count(),
    prisma.quiz.count({ where: { status: 'live' } }),
    prisma.submission.count(),
  ])

  const recentClients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { quizzes: true },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-black">Home</h1>
        <p className="text-sm text-gray-500 mt-1">Quiz OS overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <Users size={20} className="text-gray-400 mb-2" />
          <div className="text-2xl font-semibold text-black">{clientCount}</div>
          <div className="text-xs text-gray-500">Clients</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <FileText size={20} className="text-gray-400 mb-2" />
          <div className="text-2xl font-semibold text-black">{liveQuizCount}</div>
          <div className="text-xs text-gray-500">Live quizzes</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <TrendingUp size={20} className="text-gray-400 mb-2" />
          <div className="text-2xl font-semibold text-black">{submissionCount}</div>
          <div className="text-xs text-gray-500">Total submissions</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-black">Recent clients</h2>
          <Link href="/admin/clients" className="text-sm text-black hover:underline">
            View all →
          </Link>
        </div>
        {recentClients.length === 0 ? (
          <p className="text-sm text-gray-500">
            No clients yet.{' '}
            <Link href="/admin/clients/new" className="underline">
              Add your first one
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-2">
            {recentClients.map((client) => (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-black">{client.name}</span>
                <span className="text-xs text-gray-400">{client.quizzes.length} quiz(zes)</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}