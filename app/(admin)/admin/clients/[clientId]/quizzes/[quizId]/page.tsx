import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import QuizBuilder from '@/components/admin/QuizBuilder'
import type { QuizSchema } from '@/lib/quiz-logic'
import type { ClientTheme } from '@/lib/theme'
import { getPublicSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export default async function QuizEditPage({
  params,
}: {
  params: { clientId: string; quizId: string }
}) {
  const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId }, include: { client: true } })
  if (!quiz) notFound()

  const theme = quiz.client.theme as ClientTheme
  const siteUrl = getPublicSiteUrl()

  return (
    <QuizBuilder
      quizId={quiz.id}
      clientId={params.clientId}
      initialSchema={quiz.schema as unknown as QuizSchema}
      initialStatus={quiz.status}
      theme={theme}
      publicUrl={`${siteUrl}/q/${quiz.client.slug}/${quiz.slug}`}
      saveQuiz={saveQuiz}
      deleteQuiz={deleteQuiz.bind(null, quiz.id, params.clientId)}
      hasWebhookOverride={quiz.webhookUrl !== null}
      updateQuizWebhook={updateQuizWebhook.bind(null, params.clientId, quiz.id)}
      removeQuizWebhookOverride={removeQuizWebhookOverride.bind(null, params.clientId, quiz.id)}
    />
  )
}

async function saveQuiz(formData: FormData) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { invalidatePublicQuizCache } = await import('@/lib/quiz-cache')
  const quizId = String(formData.get('quizId'))
  const status = String(formData.get('status'))
  const schema = JSON.parse(String(formData.get('schema')))
  // Keep the admin-facing quiz name in sync with the headline the admin actually edits in the
  // builder, so the quizzes list shows something meaningful instead of "Untitled Quiz" forever.
  const name = (typeof schema.headline === 'string' && schema.headline.trim()) || 'Untitled Quiz'
  await prisma.quiz.update({ where: { id: quizId }, data: { schema, status, name } })
  invalidatePublicQuizCache()
}

async function deleteQuiz(quizId: string, clientId: string) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { redirect } = await import('next/navigation')
  const { invalidatePublicQuizCache } = await import('@/lib/quiz-cache')
  await prisma.quiz.delete({ where: { id: quizId } }) // Submissions cascade-delete (see prisma/schema.prisma)
  invalidatePublicQuizCache()
  redirect(`/admin/clients/${clientId}`)
}

async function updateQuizWebhook(clientId: string, quizId: string, formData: FormData) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { encrypt } = await import('@/lib/crypto')
  const { revalidatePath } = await import('next/cache')
  const webhookUrl = String(formData.get('webhookUrl'))
  await prisma.quiz.update({ where: { id: quizId }, data: { webhookUrl: encrypt(webhookUrl) } })
  revalidatePath(`/admin/clients/${clientId}/quizzes/${quizId}`)
}

async function removeQuizWebhookOverride(clientId: string, quizId: string) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { revalidatePath } = await import('next/cache')
  await prisma.quiz.update({ where: { id: quizId }, data: { webhookUrl: null } })
  revalidatePath(`/admin/clients/${clientId}/quizzes/${quizId}`)
}
