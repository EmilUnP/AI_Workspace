import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function PublicHeader() {
  const tc = await getTranslations('common')

  return (
    <header className="border-b border-green-100 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          Eduator AI Web
        </Link>
        <Link
          href="/auth/login"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg"
        >
          {tc('signIn')}
        </Link>
      </div>
    </header>
  )
}
