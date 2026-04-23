'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { EditClassDialog } from './edit-class-dialog'

interface ClassData {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

interface EditClassButtonProps {
  classData: ClassData
  variant?: 'button' | 'icon'
}

export function EditClassButton({ classData, variant = 'button' }: EditClassButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors"
          title="Edit Class"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <EditClassDialog
          classData={classData}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-700 transition-colors"
      >
        <Pencil className="h-4 w-4" />
        Edit Class
      </button>
      <EditClassDialog
        classData={classData}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
