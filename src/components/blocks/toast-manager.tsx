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
import {
  getTransactionStatusTitle,
  getTransactionStatusDescription,
  type TransactionError
} from '@/lib/blockchain/transaction-messages'
import { type TransactionStatus } from '@/types/transaction'

// Convenience functions for common toast types
export const showSuccessToast = (message: string, description?: string) => {
  toast.success(message, { description })
}

export const showErrorToast = (message: string, description?: string) => {
  toast.error(message, { description })
}

// Transaction toast types
interface TransactionToastOptions {
  hash?: string
  chainId?: number
  message?: string
  description?: string
  error?: TransactionError
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export const showTransactionToast = (
  status: TransactionStatus,
  options: TransactionToastOptions = {}
): string | number => {
  const {
    hash,
    chainId,
    message,
    description,
    error,
    dismissible = true,
    action
  } = options

  // Get blockchain explorer URL if hash and chainId are provided
  const explorerUrl =
    hash && chainId
      ? (() => {
          const explorerBaseUrl = getExplorerUrl(chainId)
          if (!explorerBaseUrl) return null
          return `${explorerBaseUrl}/tx/${hash}`
        })()
      : null

  const toastMessage = message || getTransactionStatusTitle(status)
  const toastDescription =
    description || getTransactionStatusDescription(status, { hash, error })

  const toastOptions = {
    description: (
      <div className='space-y-2'>
        <p className='text-sm'>{toastDescription}</p>
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
    ),
    dismissible,
    action: explorerUrl
      ? {
          label: (
            <span className='flex items-center gap-1'>
              View <ExternalLink className='h-3 w-3' />
            </span>
          ),
          onClick: () => {
            window.open(explorerUrl, '_blank', 'noopener,noreferrer')
          }
        }
      : action
  }

  let toastId: string | number

  switch (status) {
    case 'pending':
      toastId = toast(toastMessage, {
        ...toastOptions,
        icon: <Clock className='h-4 w-4 text-yellow-500' />,
        duration: dismissible ? 30000 : Infinity,
        className: 'pointer-events-auto z-[9999]',
        closeButton: true
      })
      break

    case 'processing':
      toastId = toast(toastMessage, {
        ...toastOptions,
        icon: <Loader2 className='h-4 w-4 animate-spin text-blue-500' />,
        duration: dismissible ? 60000 : Infinity,
        className: 'pointer-events-auto z-[9999]',
        closeButton: true
      })
      break

    case 'confirmed':
      toastId = toast.success(toastMessage, {
        ...toastOptions,
        icon: <CheckCircle2 className='h-4 w-4 text-green-500' />,
        duration: 10000,
        className: 'pointer-events-auto z-[9999]',
        closeButton: true
      })
      break

    case 'failed':
      toastId = toast.error(toastMessage, {
        ...toastOptions,
        icon: <XCircle className='h-4 w-4 text-red-500' />,
        duration: 15000,
        className: 'pointer-events-auto z-[9999]',
        closeButton: true
      })
      break
  }

  return toastId
}

export const updateTransactionToast = (
  toastId: string | number,
  status: TransactionStatus,
  options: TransactionToastOptions = {}
) => {
  // Dismiss the old toast
  toast.dismiss(toastId)
  // Show new toast with updated status
  return showTransactionToast(status, options)
}
