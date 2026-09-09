import NewClientForm from '@/components/admin/NewClientForm'

export default function NewClientPage() {
  return (
    <div className="max-w-xl">
      <h2 className="text-3xl font-semibold tracking-tight text-black mb-1">New client</h2>
      <p className="text-sm text-gray-500 mb-6">Sets up their brand, theme, and where leads get forwarded.</p>
      <NewClientForm createClient={createClient} />
    </div>
  )
}

async function createClient(formData: FormData): Promise<{ error?: string } | void> {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { encrypt } = await import('@/lib/crypto')
  const { slugify } = await import('@/lib/slugify')
  const { redirect } = await import('next/navigation')

  const slug = slugify(String(formData.get('slug')))
  if (!slug) return { error: 'URL slug cannot be empty.' }

  let clientId: string
  try {
    const client = await prisma.client.create({
      data: {
        name: String(formData.get('name')),
        slug,
        description: (formData.get('description') as string) || null,
        webhookUrl: encrypt(String(formData.get('webhookUrl'))),
        webhookSecret: (formData.get('webhookSecret') as string) || null,
        theme: {
          primary: String(formData.get('primary')),
          secondary: String(formData.get('secondary')),
          logoUrl: (formData.get('logoUrl') as string) || undefined,
        },
      },
    })
    clientId = client.id
  } catch (err: any) {
    if (err?.code === 'P2002') return { error: `"${slug}" is already taken by another client.` }
    return { error: 'Could not create client — try again.' }
  }

  redirect(`/admin/clients/${clientId}`)
}
