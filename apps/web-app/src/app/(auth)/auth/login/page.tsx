import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const errorParam = params.error?.trim() || ''
  const ERROR_MESSAGES: Record<string, string> = {
    service_unavailable:
      'Auth service is temporarily unavailable. Please try again in a few minutes.',
    auth_callback_error: 'Sign-in could not be completed. Please try again.',
  }
  const error = errorParam ? (ERROR_MESSAGES[errorParam] ?? errorParam) : ''

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
        </div>
      }
    >
      <LoginForm
        error={error}
      />
    </Suspense>
  )
}
