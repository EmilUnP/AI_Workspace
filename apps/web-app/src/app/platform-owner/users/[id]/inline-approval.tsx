'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { approveUser, rejectUser } from './actions'

interface ApproveRejectButtonsProps {
  userId: string
  approvalStatus: string
}

export function ApproveRejectButtons({ userId, approvalStatus }: ApproveRejectButtonsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  if (approvalStatus === 'approved') {
    return null
  }

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
      {approvalStatus !== 'approved' && (
        <button
          type="button"
          onClick={handleApprove}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </button>
      )}
      {approvalStatus !== 'rejected' && (
        <button
          type="button"
          onClick={handleReject}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </button>
      )}
    </div>
  )
}

