import { redirect } from 'next/navigation'

/**
 * ERP has no public signup.
 * Route is retained for backward compatibility and redirects to login.
 */
export default function SignupPage() {
  redirect('/auth/login')
}
