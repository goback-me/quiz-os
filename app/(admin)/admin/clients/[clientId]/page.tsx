import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Edit } from 'lucide-react'
import BrandSettingsForm from '@/components/admin/BrandSettingsForm'
import WebhookField from '@/components/admin/WebhookField'
import QuizStatusToggle from '@/components/admin/QuizStatusToggle'
import CopyLinkButton from '@/components/admin/CopyLinkButton'
import EmbedCodeButton from '@/components/admin/EmbedCodeButton'

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

  const theme = client.theme as { primary: string; secondary: string; font?: string; logoUrl?: string }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '') // strip trailing slash(es) — a trailing slash in the env var plus our own template literal was producing double slashes in every generated link

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-black">{client.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{client.description ?? 'Client Details & Configuration'}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex items-center gap-3">
        <form action={updateSlug} className="flex items-center gap-2 flex-1">
          <input type="hidden" name="clientId" value={client.id} />
          <span className="text-xs text-gray-500 shrink-0">{siteUrl}/q/</span>
          <input
            name="slug"
            defaultValue={client.slug}
            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-mono focus:border-black outline-none"
            placeholder="client-slug (letters, numbers, hyphens only)"
          />
          <button type="submit" className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium shrink-0">
            Save slug
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <BrandSettingsForm
            clientId={client.id}
            initialTheme={theme}
            updateBranding={updateBranding}
          />

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
        </div>
      </div>
    </div>
  )
}

async function updateSlug(formData: FormData) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { slugify } = await import('@/lib/slugify')

  const clientId = String(formData.get('clientId'))
  const clean = slugify(String(formData.get('slug')))
  if (!clean) return // don't save an empty slug

  try {
    await prisma.client.update({ where: { id: clientId }, data: { slug: clean } })
  } catch (err) {
    // Most likely cause: another client already has this slug (unique constraint).
    console.error('Failed to update slug — likely a duplicate:', err)
  }
}

async function updateBranding(formData: FormData) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const clientId = String(formData.get('clientId'))
  await prisma.client.update({
    where: { id: clientId },
    data: {
      theme: {
        primary: String(formData.get('primary')),
        secondary: String(formData.get('secondary')),
        font: String(formData.get('font')),
        logoUrl: (formData.get('logoUrl') as string) || undefined,
        pageBackground: (formData.get('pageBackground') as string) || undefined,
        cardBackground: (formData.get('cardBackground') as string) || undefined,
        fieldBackground: (formData.get('fieldBackground') as string) || undefined,
        buttonColor: (formData.get('buttonColor') as string) || undefined,
        textColor: (formData.get('textColor') as string) || undefined,
        fontSize: (formData.get('fontSize') as string) || undefined,
        fieldBorderColor: (formData.get('fieldBorderColor') as string) || undefined,
        fieldBorderWidth: (formData.get('fieldBorderWidth') as string) || undefined,
        buttonBorderColor: (formData.get('buttonBorderColor') as string) || undefined,
        buttonBorderWidth: (formData.get('buttonBorderWidth') as string) || undefined,
        hoverColor: (formData.get('hoverColor') as string) || undefined,
        radius: (formData.get('radius') as string) || undefined,
      },
    },
  })
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
  const quizId = String(formData.get('quizId'))
  const status = String(formData.get('status'))
  await prisma.quiz.update({ where: { id: quizId }, data: { status } })
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