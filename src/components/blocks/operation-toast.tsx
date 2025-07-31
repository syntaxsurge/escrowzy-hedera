'use client'

import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export type OperationStatus = 'pending' | 'processing' | 'success' | 'error'

interface OperationToastState {
  id: string | number
  status: OperationStatus
}

const activeOperations = new Map<string, OperationToastState>()

interface OperationToastOptions {
  message?: string
  description?: string
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export const createOperationToast = (
  key: string,
  initialStatus: OperationStatus,
  options: OperationToastOptions = {}
): string | number => {
  const existing = activeOperations.get(key)
  if (existing) {
    return updateOperationToast(key, initialStatus, options)
  }

  const { message, description, dismissible = false } = options

  const toastId = showOperationToast(initialStatus, {
    message,
    description,
    dismissible
  })

  activeOperations.set(key, { id: toastId, status: initialStatus })
  return toastId
}

export const updateOperationToast = (
  key: string,
  newStatus: OperationStatus,
  options: OperationToastOptions = {}
): string | number => {
  const existing = activeOperations.get(key)

  if (existing) {
    toast.dismiss(existing.id)
  }

  const { message, description, dismissible = false } = options

  const toastId = showOperationToast(newStatus, {
    message,
    description,
    dismissible:
      newStatus === 'success' || newStatus === 'error' ? true : dismissible
  })

  activeOperations.set(key, {
    id: toastId,
    status: newStatus
  })

  if (newStatus === 'success' || newStatus === 'error') {
    setTimeout(() => {
      activeOperations.delete(key)
    }, 30000)
  }

  return toastId
}

export const dismissOperationToast = (key: string) => {
  const existing = activeOperations.get(key)
  if (existing) {
    toast.dismiss(existing.id)
    activeOperations.delete(key)
  }
}

const showOperationToast = (
  status: OperationStatus,
  options: OperationToastOptions
): string | number => {
  const { message, description, dismissible, action } = options

  const toastContent = (
    <div className='space-y-2'>
      <p className='font-medium'>{message || getDefaultMessage(status)}</p>
      {description && <p className='text-sm opacity-90'>{description}</p>}
      {action && (
        <button
          type='button'
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            action.onClick()
          }}
          className='z-50 mt-2 inline-flex cursor-pointer items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400'
        >
          {action.label}
        </button>
      )}
    </div>
  )

  const baseOptions = {
    dismissible,
    className: 'pointer-events-auto z-[9999]',
    closeButton: true
  }

  switch (status) {
    case 'pending':
      return toast(toastContent, {
        ...baseOptions,
        icon: <Clock className='h-4 w-4 text-yellow-500' />,
        duration: dismissible ? 30000 : Infinity
      })

    case 'processing':
      return toast(toastContent, {
        ...baseOptions,
        icon: <Loader2 className='h-4 w-4 animate-spin text-blue-500' />,
        duration: dismissible ? 60000 : Infinity
      })

    case 'success':
      return toast.success(toastContent, {
        ...baseOptions,
        icon: <CheckCircle2 className='h-4 w-4 text-green-500' />,
        duration: 10000
      })

    case 'error':
      return toast.error(toastContent, {
        ...baseOptions,
        icon: <XCircle className='h-4 w-4 text-red-500' />,
        duration: 15000
      })

    default:
      return toast(toastContent, baseOptions)
  }
}

const getDefaultMessage = (status: OperationStatus): string => {
  switch (status) {
    case 'pending':
      return 'Preparing operation...'
    case 'processing':
      return 'Processing...'
    case 'success':
      return 'Operation completed successfully!'
    case 'error':
      return 'Operation failed'
    default:
      return 'Operation status unknown'
  }
}
