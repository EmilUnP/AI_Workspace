'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X, Mail, User, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { createSchoolAdmin } from './[id]/actions'

export function CreateSchoolAdminDialog() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  })

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const payload = new FormData()
    payload.set('full_name', formData.full_name)
    payload.set('email', formData.email)
    payload.set('password', formData.password)

    startTransition(async () => {
      const result = await createSchoolAdmin(payload)
      if (result.error) {
        setError(result.error)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setIsOpen(false)
        resetForm()
        router.refresh()
      }, 1500)
    })
  }

  const closeDialog = () => {
    if (isPending || success) return
    setIsOpen(false)
    setError('')
    setSuccess(false)
    resetForm()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
      >
        <UserPlus className="h-4 w-4" />
        Add School Admin
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeDialog}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-red-500 to-rose-600 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Create School Admin</h2>
                      <p className="text-sm text-red-100">Directly from Users</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={isPending || success}
                    className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {success ? (
                <div className="p-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">School admin created</h3>
                  <p className="mt-2 text-sm text-gray-600">{formData.email} can now log in.</p>
                </div>
              ) : (
                <>
                  <form id="create-school-admin-form" className="space-y-4 p-5" onSubmit={handleSubmit}>
                    {error && (
                      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium text-gray-700">Full Name</span>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          required
                          value={formData.full_name}
                          onChange={(event) => setFormData((prev) => ({ ...prev, full_name: event.target.value }))}
                          className="block w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                          placeholder="Jane Doe"
                        />
                      </div>
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium text-gray-700">Email Address</span>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                          className="block w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                          placeholder="admin@school.edu"
                        />
                      </div>
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium text-gray-700">Password</span>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={formData.password}
                          onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                          className="block w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                          placeholder="Minimum 8 characters"
                        />
                      </div>
                    </label>

                  </form>
                  <div className="flex gap-3 bg-gray-50 px-5 py-4">
                    <button
                      type="button"
                      onClick={closeDialog}
                      className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="create-school-admin-form"
                      disabled={isPending}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isPending ? 'Creating...' : 'Create Admin'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
