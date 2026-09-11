import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BrandSettingsForm from '@/components/admin/BrandSettingsForm'
import type { ClientTheme } from '@/lib/theme'

export const dynamic = 'force-dynamic'

export default async function BrandSettingsPage({ params }: { params: { clientId: string } }) {
  const client = await prisma.client.findUnique({ where: { id: params.clientId } })
  if (!client) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href={`/admin/clients/${client.id}`} className="text-sm text-gray-400 hover:text-black">
          ← Back to {client.name}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-black mt-1">Brand Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          The default look for every quiz under {client.name} — any quiz can still override individual colors for
          itself in its own builder.
        </p>
      </div>

      <BrandSettingsForm clientId={client.id} initialTheme={client.theme as ClientTheme} updateBranding={updateBranding} />
    </div>
  )
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
        hoverTextColor: (formData.get('hoverTextColor') as string) || undefined,
        radius: (formData.get('radius') as string) || undefined,
        progressColor: (formData.get('progressColor') as string) || undefined,
        progressTrackColor: (formData.get('progressTrackColor') as string) || undefined,
        questionColor: (formData.get('questionColor') as string) || undefined,
        errorColor: (formData.get('errorColor') as string) || undefined,
      },
    },
  })
}
