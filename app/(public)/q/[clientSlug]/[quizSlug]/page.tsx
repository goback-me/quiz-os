import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import QuizRenderer from '@/components/QuizRenderer'
import type { QuizSchema } from '@/lib/quiz-logic'

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

  const theme = quiz.client.theme as {
    primary: string
    secondary: string
    font?: string
    radius?: string
    logoUrl?: string
    pageBackground?: string
  }

  // Theme becomes CSS variables — QuizRenderer and all its children read these.
  // Changing a client's look is a JSON edit in the admin, never a code change.
  const themeVars = {
    '--quiz-primary': theme.primary,
    '--quiz-secondary': theme.secondary,
    '--quiz-radius': theme.radius ?? '20px',
    '--quiz-font': theme.font ?? "'General Sans', Inter, sans-serif",
    ...(theme.pageBackground ? { '--quiz-page-bg': theme.pageBackground } : {}),
  } as React.CSSProperties

  return (
    <div style={themeVars} className="quiz-page">
      <QuizRenderer
        quizId={quiz.id}
        schema={quiz.schema as unknown as QuizSchema}
        logoUrl={theme.logoUrl}
      />
    </div>
  )
}
