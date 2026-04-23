import { ArrowRight } from 'lucide-react'
import { Footer } from './components/footer'
import { PublicHeader } from './components/public-header'
import { getAppUrl } from '@/lib/portal-urls'

export default function HomePage() {
  const appUrl = getAppUrl()

  return (
    <div className="min-h-screen bg-[#faf5ff]">
      <PublicHeader />

      <main className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Eduator AI
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-600">
          One simple education platform for teachers and students.
        </p>

        <a
          href={`${appUrl}/auth/login`}
          className="mt-10 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Open Platform
          <ArrowRight className="h-4 w-4" />
        </a>
      </main>

      <Footer />
    </div>
  )
}
