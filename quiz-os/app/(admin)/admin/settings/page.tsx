import { currentUser } from '@clerk/nextjs/server'

export default async function SettingsPage() {
  const user = await currentUser()

  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-semibold tracking-tight text-black mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Account and workspace details.</p>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Signed in as</div>
          <div className="text-sm text-black">{user?.primaryEmailAddress?.emailAddress ?? 'Unknown'}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Name</div>
          <div className="text-sm text-black">{user?.fullName ?? '—'}</div>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-1">Quiz OS</div>
          <div className="text-sm text-gray-500">v0.1.0 — internal agency admin</div>
        </div>
      </div>
    </div>
  )
}
