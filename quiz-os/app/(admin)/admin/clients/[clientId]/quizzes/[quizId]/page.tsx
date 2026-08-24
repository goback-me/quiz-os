import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import QuizBuilder from '@/components/admin/QuizBuilder'
import type { QuizSchema } from '@/lib/quiz-logic'

export const dynamic = 'force-dynamic'

export default async function QuizEditPage({
  params,
}: {
  params: { clientId: string; quizId: string }
}) {
  const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId }, include: { client: true } })
  if (!quiz) notFound()

  const theme = quiz.client.theme as { primary: string; secondary: string; pageBackground?: string }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  return (
    <QuizBuilder
      quizId={quiz.id}
      initialSchema={quiz.schema as unknown as QuizSchema}
      initialStatus={quiz.status}
      theme={theme}
      publicUrl={`${siteUrl}/q/${quiz.client.slug}/${quiz.slug}`}
      saveQuiz={saveQuiz}
    />
  )
}

async function saveQuiz(formData: FormData) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const quizId = String(formData.get('quizId'))
  const status = String(formData.get('status'))
  const schema = JSON.parse(String(formData.get('schema')))
  await prisma.quiz.update({ where: { id: quizId }, data: { schema, status } })
}
