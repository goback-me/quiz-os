import { redirect } from 'next/navigation'

export default function NewClientPage() {
  return (
    <div className="max-w-xl">
      <h2 className="text-3xl font-semibold tracking-tight text-black mb-1">New client</h2>
      <p className="text-sm text-gray-500 mb-6">Sets up their brand, theme, and where leads get forwarded.</p>

      <form action={createClient} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
        <Field label="Client name" name="name" placeholder="Acme Corp" required />
        <Field label="URL slug" name="slug" placeholder="acme-corp" required />
        <Field label="Description" name="description" placeholder="E-commerce Solutions" />
        <Field label="Webhook URL (n8n)" name="webhookUrl" placeholder="https://n8n.example.com/webhook/..." required />
        <Field label="Webhook secret (optional)" name="webhookSecret" placeholder="For HMAC signing" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Primary color" name="primary" placeholder="#3B82F6" defaultValue="#3B82F6" required />
          <Field label="Secondary color" name="secondary" placeholder="#111111" defaultValue="#111111" required />
        </div>
        <Field label="Logo URL (optional)" name="logoUrl" placeholder="https://.../logo.png" />

        <button type="submit" className="bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium w-full hover:bg-gray-800 transition-colors">
          Create client
        </button>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  placeholder,
  required,
  defaultValue,
}: {
  label: string
  name: string
  placeholder?: string
  required?: boolean
  defaultValue?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-black focus:ring-2 focus:ring-gray-100 outline-none"
      />
    </div>
  )
}

async function createClient(formData: FormData) {
  'use server'
  const { prisma } = await import('@/lib/prisma')
  const { encrypt } = await import('@/lib/crypto')
  const { slugify } = await import('@/lib/slugify')

  const client = await prisma.client.create({
    data: {
      name: String(formData.get('name')),
      slug: slugify(String(formData.get('slug'))),
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

  redirect(`/admin/clients/${client.id}`)
}
