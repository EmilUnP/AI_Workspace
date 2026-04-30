import Link from 'next/link'
import { getCurrentUser } from '@/lib/backend-auth'
import { redirect } from 'next/navigation'

export default async function AppPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }

  if (user.role === 'admin') redirect('/platform-owner')
  if (user.role === 'operator') redirect('/school-admin')

  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome</h1>
        <p className="mt-2 text-sm text-gray-600">
          You are signed in as <span className="font-medium text-gray-900">{user.email}</span>.
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Your role is <span className="font-medium text-gray-900">{user.role}</span>.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/platform-owner"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Open Platform Owner
          </Link>
          <Link
            href="/school-admin"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Open School Admin
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
