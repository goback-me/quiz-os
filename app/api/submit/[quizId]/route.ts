import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { forwardWithRetry } from '@/lib/webhook'
import { evaluateDisqualify, validateAnswers, formatAnswersForWebhook, QuizSchema, Answers } from '@/lib/quiz-logic'

// Basic in-memory rate limit per IP — swap for a Postgres/Redis backed one if you scale this
// across multiple containers. Good enough for single-instance VPS deploys like your others.
const hits = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > MAX_PER_WINDOW
}

export async function POST(req: NextRequest, { params }: { params: { quizId: string } }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.answers !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
  }

  const answers: Answers = body.answers
  const utm = body.utm ?? null

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.quizId },
    include: { client: true },
  })

  if (!quiz || quiz.status !== 'live' || !quiz.client.isActive) {
    return NextResponse.json({ ok: false, error: 'Quiz not available' }, { status: 404 })
  }

  const schema = quiz.schema as unknown as QuizSchema

  const validationErrors = validateAnswers(schema, answers)
  if (validationErrors.length > 0) {
    return NextResponse.json({ ok: false, error: validationErrors[0] }, { status: 400 })
  }

  // NEVER trust the client's disqualify check — re-run it here. This is the check that counts.
  const disqualifyRule = evaluateDisqualify(schema, answers)

  if (disqualifyRule) {
    await prisma.submission.create({
      data: {
        quizId: quiz.id,
        answers,
        utm,
        disqualified: true,
        disqualifyMsg: disqualifyRule.message,
        webhookStatus: 'skipped', // disqualified leads are never forwarded to the client's webhook
      },
    })
    // Same shape as a normal response — nothing about *why* leaks anything about the client's webhook.
    return NextResponse.json({ ok: true, disqualified: true, message: disqualifyRule.message })
  }

  const submission = await prisma.submission.create({
    data: { quizId: quiz.id, answers, utm, webhookStatus: 'pending' },
  })

  // Decrypt only in this server function, use immediately, never include in any response.
  const webhookUrl = decrypt(quiz.client.webhookUrl)
  const result = await forwardWithRetry(
    webhookUrl,
    {
      clientSlug: quiz.client.slug,
      quizSlug: quiz.slug,
      submissionId: submission.id,
      answers, // raw, for automations that key off internal field IDs
      questions: formatAnswersForWebhook(schema, answers), // readable — actual question text + answer label, e.g. [{ question: "What are you mainly looking to consolidate?", answer: "Credit cards" }]
      utm,
      submittedAt: submission.createdAt,
    },
    quiz.client.webhookSecret
  )

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      webhookStatus: result.ok ? 'sent' : 'failed',
      webhookAttempts: { increment: 1 },
      lastError: result.ok ? null : result.error,
    },
  })

  // Client only ever learns "it worked" — never the webhook URL, status detail, or client config.
  return NextResponse.json({ ok: true, disqualified: false })
}
