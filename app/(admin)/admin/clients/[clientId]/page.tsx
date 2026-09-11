import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Edit, Palette } from 'lucide-react'
import WebhookField from '@/components/admin/WebhookField'
import QuizStatusToggle from '@/components/admin/QuizStatusToggle'
import CopyLinkButton from '@/components/admin/CopyLinkButton'
import EmbedCodeButton from '@/components/admin/EmbedCodeButton'
import SlugField from '@/components/admin/SlugField'
import ConfirmButton from '@/components/admin/ConfirmButton'
import { getPublicSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  live: 'bg-green-100 text-green-800',
  draft: 'bg-yellow-100 text-yellow-800',
  paused: 'bg-gray-100 text-gray-800',
}

export default async function ClientDetailPage({ params }: { params: { clientId: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.clientId },
    include: { quizzes: true },
  })
  if (!client) notFound()

  const totalSubmissions = await prisma.submission.count({
    where: { quiz: { clientId: client.id } },
  })
  const activeQuizzes = client.quizzes.filter((q) => q.status === 'live').length

  const siteUrl = getPublicSiteUrl()

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black">{client.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{client.description ?? 'Client Details & Configuration'}</p>
        </div>
        <Link
          href={`/admin/clients/${client.id}/brand`}
          className="shrink-0 flex items-center gap-2 bg-white border border-gray-200 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Palette size={16} /> Brand Settings
        </Link>
      </div>

      <SlugField clientId={client.id} initialSlug={client.slug} siteUrl={siteUrl} updateSlug={updateSlug} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-black">Active Quizzes</h2>
              <form action={createQuiz}>
                <input type="hidden" name="clientId" value={client.id} />
                <button className="bg-black text-white py-1.5 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                  Create Quiz
                </button>
              </form>
            </div>

            {client.quizzes.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No quizzes yet — click "Create Quiz" to build one.</p>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="p-4 text-xs font-medium text-gray-500">Quiz Name</th>
                      <th className="p-4 text-xs font-medium text-gray-500">Status</th>
                      <th className="p-4 text-xs font-medium text-gray-500">Active</th>
                      <th className="p-4 text-xs font-medium text-gray-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {client.quizzes.map((quiz) => (
                      <tr key={quiz.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm text-black">{quiz.name}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[quiz.status]}`}>
                            {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-4">
                          <QuizStatusToggle quizId={quiz.id} initialStatus={quiz.status} toggleStatus={toggleQuizStatus} />
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/admin/clients/${client.id}/quizzes/${quiz.id}`}
                              className="bg-white border border-gray-200 text-gray-600 py-1 px-3 rounded-lg text-xs hover:bg-gray-50 transition-colors flex items-center gap-1"
                            >
                              <Edit size={14} /> Edit
                            </Link>
                            <CopyLinkButton url={`${siteUrl}/q/${client.slug}/${quiz.slug}`} />
                            <EmbedCodeButton
                              embedCode={`<div data-quiz="${client.slug}/${quiz.slug}"></div>\n<script src="${siteUrl}/embed.js" defer></script>`}
                            />
                            <ConfirmButton
                              label="Delete"
                              message={`Delete "${quiz.name}" permanently? Its submissions are deleted too.`}
                              action={deleteQuiz.bind(null, quiz.id, client.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <WebhookField clientId={client.id} updateWebhook={updateWebhook} />

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wide">Client Summary</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="text-2xl font-semibold text-black mb-1">{totalSubmissions}</div>
                <div className="text-xs text-gray-500">Total Submissions</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="text-2xl font-semibold text-black mb-1">{activeQuizzes}</div>
                <div className="text-xs text-gray-500">Active Quizzes</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
            <h3 className="text-xs font-medium text-red-600 mb-1 uppercase tracking-wide">Danger Zone</h3>
            <p className="text-xs text-gray-500 mb-3">
              Deletes this client, all its quizzes, and all their submissions. Can't be undone.
            </p>
            <ConfirmButton
              label={`Delete ${client.name}`}
              message={`Delete "${client.name}" and every quiz + submission under it permanently?`}
              action={deleteClient.bind(null, client.id)}
              className="w-full justify-center bg-white border border-red-200 text-red-600 py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors flex items-center gap-1"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

async function updateSlug(clientId: string, rawSlug: string): Promise<{ ok: boolean; error?: string }> {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { slugify } = await import('@/lib/slugify')

  const clean = slugify(rawSlug)
  if (!clean) return { ok: false, error: 'Slug cannot be empty.' }

  try {
    await prisma.client.update({ where: { id: clientId }, data: { slug: clean } })
    const { invalidatePublicQuizCache } = await import('@/lib/quiz-cache')
    invalidatePublicQuizCache()
    return { ok: true }
  } catch (err: any) {
    if (err?.code === 'P2002') return { ok: false, error: `"${clean}" is already taken by another client.` }
    return { ok: false, error: 'Could not save — try again.' }
  }
}

async function updateWebhook(formData: FormData) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { encrypt } = await import('@/lib/crypto')
  const clientId = String(formData.get('clientId'))
  const webhookUrl = String(formData.get('webhookUrl'))
  await prisma.client.update({
    where: { id: clientId },
    data: { webhookUrl: encrypt(webhookUrl) },
  })
}

async function toggleQuizStatus(formData: FormData) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { invalidatePublicQuizCache } = await import('@/lib/quiz-cache')
  const quizId = String(formData.get('quizId'))
  const status = String(formData.get('status'))
  await prisma.quiz.update({ where: { id: quizId }, data: { status } })
  invalidatePublicQuizCache()
}

async function createQuiz(formData: FormData) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { redirect } = await import('next/navigation')
  const clientId = String(formData.get('clientId'))

  const quiz = await prisma.quiz.create({
    data: {
      clientId,
      name: 'Untitled Quiz',
      slug: `quiz-${Date.now()}`,
      status: 'draft',
      schema: {
        headline: 'Untitled Quiz',
        steps: [
          {
            id: 'q1',
            type: 'single_select',
            question: 'Your first question',
            options: [
              { label: 'Option A', value: 'option_a' },
              { label: 'Option B', value: 'option_b' },
            ],
          },
          {
            id: 'contact',
            type: 'contact_fields',
            fields: [
              { name: 'fullName', label: 'Full name', type: 'text', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
            ],
          },
        ],
        endScreen: { heading: 'Thanks!' },
      },
    },
  })

  redirect(`/admin/clients/${clientId}/quizzes/${quiz.id}`)
}

async function deleteQuiz(quizId: string, clientId: string) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { revalidatePath } = await import('next/cache')
  const { invalidatePublicQuizCache } = await import('@/lib/quiz-cache')
  await prisma.quiz.delete({ where: { id: quizId } }) // Submissions cascade-delete (see prisma/schema.prisma)
  invalidatePublicQuizCache()
  revalidatePath(`/admin/clients/${clientId}`)
}

async function deleteClient(clientId: string) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { redirect } = await import('next/navigation')
  const { invalidatePublicQuizCache } = await import('@/lib/quiz-cache')
  await prisma.client.delete({ where: { id: clientId } }) // Quizzes + submissions cascade-delete
  invalidatePublicQuizCache()
  redirect('/admin/clients')
}
