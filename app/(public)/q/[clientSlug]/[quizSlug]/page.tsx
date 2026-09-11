import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import QuizRenderer from '@/components/QuizRenderer'
import type { QuizSchema } from '@/lib/quiz-logic'
import { themeToCssVars, mergeTheme, type ClientTheme } from '@/lib/theme'

// Never statically pre-render this — quiz content, theme, and status can change any time,
// and Next would otherwise try to hit the database at build time (before it's reachable) to
// pre-generate this page, causing the Docker build to fail.
export const dynamic = 'force-dynamic'

export default async function QuizPage({
  params,
}: {
  params: { clientSlug: string; quizSlug: string }
}) {
  const quiz = await prisma.quiz.findFirst({
    where: {
      slug: params.quizSlug,
      status: 'live',
      client: { slug: params.clientSlug, isActive: true },
    },
    include: { client: true },
  })

  if (!quiz) notFound()

  const quizSchema = quiz.schema as unknown as QuizSchema
  const theme = mergeTheme(quiz.client.theme as ClientTheme, quizSchema.themeOverride)

  return (
    <div style={themeToCssVars(theme)} className="quiz-page">
      <QuizRenderer quizId={quiz.id} schema={quizSchema} logoUrl={theme.logoUrl} />
    </div>
  )
}