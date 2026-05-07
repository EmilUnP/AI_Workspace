'use client'

import { useState, useTransition } from 'react'
import { Lock, Loader2, Eye, EyeOff, Key } from 'lucide-react'
import { changePassword } from './actions'

interface ChangePasswordFormProps {
  userId: string
  userName: string
}

export function ChangePasswordForm({ userId, userName }: ChangePasswordFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    startTransition(async () => {
      const result = await changePassword(userId, password)
      
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setPassword('')
        setConfirmPassword('')
        setTimeout(() => setSuccess(false), 5000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      {/* Info Box */}
      <div className="rounded-lg bg-gray-100 p-4">
        <div className="flex items-start gap-3">
          <Key className="h-5 w-5 text-gray-700 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-medium">Password Reset</p>
            <p className="mt-1">
              Set a new password for <strong>{userName}</strong>. They will use this password to log in.
            </p>
          </div>
        </div>
      </div>

      {/* New Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          New Password
        </label>
        <div className="relative mt-1">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-10 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            placeholder="Enter new password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm Password
        </label>
        <div className="relative mt-1">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            placeholder="Confirm new password"
          />
        </div>
      </div>

      {/* Password Requirements */}
      <div className="text-xs text-gray-500">
        Password must be at least 6 characters long
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-gray-100 p-3">
          <p className="text-sm text-gray-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-md bg-gray-100 p-3">
          <p className="text-sm text-gray-800">Password changed successfully! The user can now log in with the new password.</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending || !password || !confirmPassword}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Changing Password...
          </>
        ) : (
          <>
            <Key className="h-4 w-4" />
            Change Password
          </>
        )}
      </button>
    </form>
  )
}
