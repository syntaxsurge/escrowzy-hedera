'use client'

export type TransactionErrorType =
  | 'rejected'
  | 'insufficient_funds'
  | 'gas_estimation'
  | 'network_mismatch'
  | 'contract_error'
  | 'timeout'
  | 'unknown'

export interface TransactionError {
  type: TransactionErrorType
  message: string
  originalError?: Error
}

/**
 * Parses an error message and returns a structured error with type and user-friendly message
 */
export function parseTransactionError(
  error: Error | unknown
): TransactionError {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const lowerMessage = errorMessage.toLowerCase()

  if (
    lowerMessage.includes('user rejected') ||
    lowerMessage.includes('user denied')
  ) {
    return {
      type: 'rejected',
      message: 'You rejected the transaction in your wallet',
      originalError: error instanceof Error ? error : undefined
    }
  }

  if (
    lowerMessage.includes('insufficient funds') ||
    lowerMessage.includes('insufficient balance')
  ) {
    return {
      type: 'insufficient_funds',
      message:
        'Insufficient balance to complete this transaction. Please add funds to your wallet.',
      originalError: error instanceof Error ? error : undefined
    }
  }

  if (lowerMessage.includes('gas') || lowerMessage.includes('out of gas')) {
    return {
      type: 'gas_estimation',
      message:
        'Gas estimation failed. The transaction may require more gas than expected.',
      originalError: error instanceof Error ? error : undefined
    }
  }

  if (
    lowerMessage.includes('wrong network') ||
    lowerMessage.includes('chain mismatch')
  ) {
    return {
      type: 'network_mismatch',
      message: 'Please switch to the correct network in your wallet',
      originalError: error instanceof Error ? error : undefined
    }
  }

  if (
    lowerMessage.includes('revert') ||
    lowerMessage.includes('execution reverted')
  ) {
    return {
      type: 'contract_error',
      message:
        'The transaction was reverted by the smart contract. Please try again.',
      originalError: error instanceof Error ? error : undefined
    }
  }

  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return {
      type: 'timeout',
      message: 'Transaction timed out. Please try again.',
      originalError: error instanceof Error ? error : undefined
    }
  }

  // Default case
  return {
    type: 'unknown',
    message: 'Transaction failed. Please check your wallet and try again.',
    originalError: error instanceof Error ? error : undefined
  }
}

/**
 * Gets a user-friendly title for transaction status
 */
export function getTransactionStatusTitle(
  status: 'pending' | 'processing' | 'confirmed' | 'failed'
): string {
  switch (status) {
    case 'pending':
      return 'Transaction Pending'
    case 'processing':
      return 'Processing Transaction'
    case 'confirmed':
      return 'Transaction Confirmed'
    case 'failed':
      return 'Transaction Failed'
  }
}

/**
 * Gets a user-friendly description for transaction status
 */
export function getTransactionStatusDescription(
  status: 'pending' | 'processing' | 'confirmed' | 'failed',
  options?: {
    hash?: string
    error?: TransactionError
  }
): string {
  switch (status) {
    case 'pending':
      return 'Your transaction has been submitted and is waiting to be processed'
    case 'processing':
      return 'Your transaction is being processed on the blockchain'
    case 'confirmed':
      return options?.hash
        ? `Transaction confirmed successfully`
        : 'Your transaction has been confirmed on the blockchain'
    case 'failed':
      return (
        options?.error?.message ||
        'Your transaction could not be completed. Please try again.'
      )
  }
}
