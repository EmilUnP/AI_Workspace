import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AppPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) {
    redirect('/auth/login')
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Logged in</h1>
      <p className="mt-2 text-gray-600">Basic frontend shell is connected to clean backend auth.</p>
      <form action="/api/auth/logout" method="post" className="mt-6">
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white hover:opacity-90"
        >
          Logout
        </button>
      </form>
    </main>
  )
}
