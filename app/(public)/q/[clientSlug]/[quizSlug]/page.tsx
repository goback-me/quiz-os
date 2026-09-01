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
    cardBackground?: string
    fieldBackground?: string
    buttonColor?: string
    textColor?: string
    fontSize?: string
    fieldBorderColor?: string
    fieldBorderWidth?: string
    buttonBorderColor?: string
    buttonBorderWidth?: string
    hoverColor?: string
  }

  // Theme becomes CSS variables — QuizRenderer and all its children read these.
  // Changing a client's look is a JSON edit in the admin, never a code change.
  const themeVars = {
    '--quiz-primary': theme.primary,
    '--quiz-secondary': theme.secondary,
    '--quiz-radius': theme.radius ? `${theme.radius}px` : '20px',
    '--quiz-font': theme.font ?? "'General Sans', Inter, sans-serif",
    ...(theme.pageBackground ? { '--quiz-page-bg': theme.pageBackground } : {}),
    ...(theme.cardBackground ? { '--quiz-card-bg': theme.cardBackground } : {}),
    ...(theme.fieldBackground ? { '--quiz-field-bg': theme.fieldBackground } : {}),
    ...(theme.buttonColor ? { '--quiz-button-bg': theme.buttonColor } : {}),
    ...(theme.textColor ? { '--quiz-text': theme.textColor } : {}),
    ...(theme.fontSize ? { '--quiz-font-size': `${theme.fontSize}px` } : {}),
    ...(theme.fieldBorderWidth && Number(theme.fieldBorderWidth) > 0
      ? {
          '--quiz-field-border': `${theme.fieldBorderWidth}px solid ${theme.fieldBorderColor || '#e5ddd0'}`,
        }
      : {}),
    ...(theme.buttonBorderWidth && Number(theme.buttonBorderWidth) > 0
      ? {
          '--quiz-button-border': `${theme.buttonBorderWidth}px solid ${theme.buttonBorderColor || '#000'}`,
        }
      : {}),
    ...(theme.hoverColor ? { '--quiz-hover-bg': theme.hoverColor } : {}),
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