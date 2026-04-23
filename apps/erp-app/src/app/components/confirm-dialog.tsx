'use client'

import { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Loader2,
  CheckCircle,
  Info
} from 'lucide-react'

type DialogType = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: DialogType
  isLoading?: boolean
  icon?: React.ReactNode
}

const typeConfig = {
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    defaultIcon: Trash2,
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    defaultIcon: AlertTriangle,
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    defaultIcon: Info,
  },
  success: {
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    buttonBg: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    defaultIcon: CheckCircle,
  },
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const config = typeConfig[type]
  const IconComponent = config.defaultIcon

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    if (isLoading) return
    setIsAnimating(false)
    setTimeout(onClose, 150)
  }

  const handleConfirm = async () => {
    await onConfirm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Dialog Container */}
      <div className="min-h-full flex items-center justify-center p-4">
        {/* Dialog */}
        <div 
          className={`relative w-full max-w-md transform transition-all duration-200 ${
            isAnimating 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Close Button */}
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 z-10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="p-6 sm:p-8">
              {/* Icon */}
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${config.iconBg} ${config.iconColor} mb-5`}>
                {icon || <IconComponent className="h-8 w-8" />}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                {title}
              </h3>

              {/* Message */}
              <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-6 py-4 sm:px-8 flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-70 ${config.buttonBg}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for easier usage
export function useConfirmDialog() {
  const [state, setState] = useState<{
    isOpen: boolean
    resolve: ((value: boolean) => void) | null
    config: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>
  }>({
    isOpen: false,
    resolve: null,
    config: {
      title: '',
      message: '',
    },
  })

  const confirm = (config: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        resolve,
        config,
      })
    })
  }

  const handleClose = () => {
    state.resolve?.(false)
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }))
  }

  const handleConfirm = () => {
    state.resolve?.(true)
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }))
  }

  const DialogComponent = () => (
    <ConfirmDialog
      isOpen={state.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      {...state.config}
    />
  )

  return { confirm, DialogComponent }
}
