'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Check, X } from 'lucide-react'
import { approveUser, rejectUser } from './[id]/actions'
import { useRouter } from 'next/navigation'

interface UserRowActionsProps {
  userId: string
  approvalStatus: string
}

export function UserRowActions({ userId, approvalStatus }: UserRowActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleApprove = async () => {
    setIsLoading(true)
    await approveUser(userId)
    setIsLoading(false)
    router.refresh()
  }

  const handleReject = async () => {
    setIsLoading(true)
    await rejectUser(userId)
    setIsLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {/* View Button */}
      <Link
        href={`/platform-owner/users/${userId}`}
        className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="View User"
      >
        <Eye className="h-4 w-4" />
      </Link>

      {/* Edit Button */}
      <Link
        href={`/platform-owner/users/${userId}`}
        className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Edit User"
      >
        <Pencil className="h-4 w-4" />
      </Link>

      {/* Approve/Reject Buttons */}
      {approvalStatus === 'pending' && (
        <>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isLoading}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Approve User"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isLoading}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reject User"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      )}

      {approvalStatus === 'rejected' && (
        <button
          type="button"
          onClick={handleApprove}
          disabled={isLoading}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Approve User"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
