import { unstable_cache, revalidateTag } from 'next/cache'
import { prisma } from './prisma'

// Every embed load (the actual hot path — a live ad landing page can get hit hundreds of times
// an hour) was paying for a fresh Postgres round-trip on every single request, since the page is
// `force-dynamic`. Wrapping the lookup in a short-lived cache means only the first request in
// each ~60s window touches the database; everything after that is served from memory. Selecting
// only the columns the page actually renders (not the encrypted webhookUrl/webhookSecret) keeps
// what's sitting in that cache minimal.
export const getPublicQuiz = unstable_cache(
  async (clientSlug: string, quizSlug: string) => {
    return prisma.quiz.findFirst({
      where: {
        slug: quizSlug,
        status: 'live',
        client: { slug: clientSlug, isActive: true },
      },
      select: {
        id: true,
        schema: true,
        client: { select: { theme: true } },
      },
    })
  },
  ['public-quiz'],
  { revalidate: 60, tags: ['quiz-data'] }
)

// Called from every admin action that can change what a public quiz page renders (schema, status,
// slug, theme, client active state) so an edit shows up immediately instead of waiting out the
// 60s window above.
export function invalidatePublicQuizCache() {
  revalidateTag('quiz-data')
}
