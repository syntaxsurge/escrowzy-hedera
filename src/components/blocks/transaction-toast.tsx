'use client'

import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

import { getExplorerUrl } from '@/lib/blockchain'
import { type TransactionStatus } from '@/types/transaction'

interface TransactionToastState {
  id: string | number
  status: TransactionStatus
  hash?: string
  chainId?: number
}

// Store active transaction toasts
const activeToasts = new Map<string, TransactionToastState>()

interface TransactionToastOptions {
  hash?: string
  chainId?: number
  message?: string
  description?: string
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

// Create a new transaction toast that can be updated through different states
export const createTransactionToast = (
  key: string,
  initialStatus: TransactionStatus,
  options: TransactionToastOptions = {}
): string | number => {
  // If there's an existing toast with this key, update it instead
  const existing = activeToasts.get(key)
  if (existing) {
    return updateTransactionToast(key, initialStatus, options)
  }

  const { hash, chainId, message, description, dismissible = false } = options

  const toastId = showToast(initialStatus, {
    hash,
    chainId,
    message,
    description,
    dismissible
  })

  activeToasts.set(key, { id: toastId, status: initialStatus, hash, chainId })
  return toastId
}

// Update an existing transaction toast
export const updateTransactionToast = (
  key: string,
  newStatus: TransactionStatus,
  options: TransactionToastOptions = {}
): string | number => {
  const existing = activeToasts.get(key)

  // Dismiss the old toast if it exists
  if (existing) {
    toast.dismiss(existing.id)
  }

  const { hash, chainId, message, description, dismissible = false } = options

  // Use stored values if not provided in options
  const finalHash = hash || existing?.hash
  const finalChainId = chainId || existing?.chainId

  const toastId = showToast(newStatus, {
    hash: finalHash,
    chainId: finalChainId,
    message,
    description,
    dismissible:
      newStatus === 'confirmed' || newStatus === 'failed' ? true : dismissible
  })

  activeToasts.set(key, {
    id: toastId,
    status: newStatus,
    hash: finalHash,
    chainId: finalChainId
  })

  // Clean up completed toasts after a delay
  if (newStatus === 'confirmed' || newStatus === 'failed') {
    setTimeout(() => {
      activeToasts.delete(key)
    }, 30000)
  }

  return toastId
}

// Remove a transaction toast
export const dismissTransactionToast = (key: string) => {
  const existing = activeToasts.get(key)
  if (existing) {
    toast.dismiss(existing.id)
    activeToasts.delete(key)
  }
}

// Internal function to show toast with proper styling
const showToast = (
  status: TransactionStatus,
  options: TransactionToastOptions
): string | number => {
  const { hash, chainId, message, description, dismissible } = options

  // Get blockchain explorer URL if hash and chainId are provided
  const explorerUrl =
    hash && chainId
      ? (() => {
          const explorerBaseUrl = getExplorerUrl(chainId)
          if (!explorerBaseUrl) return null
          return `${explorerBaseUrl}/tx/${hash}`
        })()
      : null

  const toastContent = (
    <div className='space-y-2'>
      <p className='font-medium'>{message || getDefaultMessage(status)}</p>
      {description && <p className='text-sm opacity-90'>{description}</p>}
      {hash && (
        <div className='flex items-center gap-2'>
          <code className='rounded bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-800'>
            {hash.slice(0, 6)}...{hash.slice(-4)}
          </code>
          {explorerUrl && (
            <button
              type='button'
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                window.open(explorerUrl, '_blank', 'noopener,noreferrer')
              }}
              className='z-50 inline-flex cursor-pointer items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400'
            >
              View on Explorer
              <ExternalLink className='h-3 w-3' />
            </button>
          )}
        </div>
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

    case 'confirmed':
      return toast.success(toastContent, {
        ...baseOptions,
        icon: <CheckCircle2 className='h-4 w-4 text-green-500' />,
        duration: 10000
      })

    case 'failed':
      return toast.error(toastContent, {
        ...baseOptions,
        icon: <XCircle className='h-4 w-4 text-red-500' />,
        duration: 15000
      })

    default:
      return toast(toastContent, baseOptions)
  }
}

// Get default message based on status
const getDefaultMessage = (status: TransactionStatus): string => {
  switch (status) {
    case 'pending':
      return 'Please confirm the transaction in your wallet'
    case 'processing':
      return 'Transaction is being processed...'
    case 'confirmed':
      return 'Transaction confirmed!'
    case 'failed':
      return 'Transaction failed'
    default:
      return 'Transaction status unknown'
  }
}
