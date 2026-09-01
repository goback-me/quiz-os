import { PrismaClient } from '@prisma/client'
import { encrypt } from '../lib/crypto'
import type { QuizSchema } from '../lib/quiz-logic'

const prisma = new PrismaClient()

const debtConsolidationSchema: QuizSchema = {
  headline: 'See What Debt Consolidation Options May Be Available',
  steps: [
    {
      id: 'q1',
      type: 'single_select',
      question: 'What are you mainly looking to consolidate?',
      options: [
        { label: 'Credit cards', value: 'credit_cards' },
        { label: 'Car finance', value: 'car_finance' },
        { label: 'Personal loans', value: 'personal_loans' },
        { label: 'Other debts', value: 'other_debts' },
      ],
    },
    {
      id: 'q2',
      type: 'single_select',
      question: 'What best describes your current employment situation?',
      options: [
        { label: 'Full-time employed', value: 'full_time' },
        { label: 'Part-time employed', value: 'part_time' },
        { label: 'Self-employed', value: 'self_employed' },
        { label: 'Centrelink', value: 'centrelink', disqualify: true },
      ],
    },
    {
      id: 'q3',
      type: 'single_select',
      question: 'What would you most like help with?',
      options: [
        { label: 'Simplifying multiple repayments', value: 'simplify' },
        { label: 'Reviewing my current repayments', value: 'review' },
        { label: 'Understanding consolidation options', value: 'understand' },
      ],
    },
    {
      id: 'contact',
      type: 'contact_fields',
      fields: [
        { name: 'fullName', label: 'Full name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone', type: 'tel', required: true },
      ],
    },
  ],
  disqualifyAction: {
    mode: 'message',
    message:
      "Thanks for your interest. Based on your answers, we're not able to offer debt consolidation options for you at this time.",
  },
  endScreen: {
    heading: "Thanks — we've received your details",
    subheading: 'One of our consultants will be in touch shortly.',
  },
  trustLine: '160+ people helped, grown by referral.',
}

async function main() {
  // Replace with the real n8n webhook URL before running.
  const REAL_WEBHOOK_URL = process.env.SEED_WEBHOOK_URL ?? 'https://n8n.example.com/webhook/replace-me'

  const client = await prisma.client.upsert({
    where: { slug: 'debt-consolidation-client' },
    update: {},
    create: {
      slug: 'debt-consolidation-client',
      name: 'Debt Consolidation Client',
      webhookUrl: encrypt(REAL_WEBHOOK_URL),
      theme: {
        primary: '#c86b4a', // warm terracotta — matches the eyebrow, progress bar, and pill option accents
        secondary: '#1a1a1a',
        pageBackground: '#fdf3e7', // cream page background behind the white card
        radius: '20px',
        font: "'General Sans', Inter, sans-serif",
      },
    },
  })

  await prisma.quiz.upsert({
    where: { clientId_slug: { clientId: client.id, slug: 'debt-consolidation' } },
    update: { schema: debtConsolidationSchema as any, status: 'live' },
    create: {
      clientId: client.id,
      slug: 'debt-consolidation',
      name: 'Debt Consolidation Qualifier',
      schema: debtConsolidationSchema as any,
      status: 'live',
    },
  })

  console.log('Seeded: /q/debt-consolidation-client/debt-consolidation')
}

main().finally(() => prisma.$disconnect())