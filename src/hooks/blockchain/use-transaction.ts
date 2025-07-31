'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

import { mutate } from 'swr'
import { prepareContractCall, waitForReceipt } from 'thirdweb'
import {
  useActiveAccount,
  useActiveWalletChain,
  useSendTransaction as useThirdwebSendTransaction
} from 'thirdweb/react'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId
} from 'wagmi'

import {
  createTransactionToast,
  updateTransactionToast
} from '@/components/blocks/transaction-toast'
import { apiEndpoints } from '@/config/api-endpoints'
import { isWalletProvider, WalletProviders } from '@/config/wallet-provider'
import {
  useBlockchain,
  useUnifiedWalletInfo,
  useUnifiedChainInfo
} from '@/context'
import { api } from '@/lib/api/http-client'
import {
  DEFAULT_CHAIN_ID,
  getChainConfig,
  isSupportedChainId,
  SUBSCRIPTION_MANAGER_ABI
} from '@/lib/blockchain'
import {
  waitForTransactionConfirmation,
  getBlockExplorerUrl
} from '@/lib/blockchain/blockchain-transaction'
import { thirdwebClient } from '@/lib/blockchain/thirdweb-client'
import { type TransactionStatus } from '@/types/transaction'

// ============================================================================
// Types
// ============================================================================

export interface TransactionConfig {
  address: `0x${string}`
  abi: any[]
  functionName: string
  args?: any[]
  value?: bigint
  chainId?: number
}

export interface TransactionMessages {
  pendingMessage: string
  processingMessage: string
  confirmedMessage: string
  failedMessage: string
}

export interface TransactionTracking {
  teamId?: number
  userId?: number
  planId?: string
  amount?: string
  currency?: string
}

export interface TransactionOptions {
  messages?: TransactionMessages
  tracking?: TransactionTracking
  showToast?: boolean
  dismissibleToast?: boolean
  onSuccess?: (hash: string) => void
  onError?: (error: Error) => void
  onStatusChange?: (status: TransactionStatus, hash?: string) => void
}

export interface TransactionTracker {
  hash: string
  chainId: number
  status: TransactionStatus
  message: string
  description?: string
  toastId?: string | number
}

// ============================================================================
// Transaction Tracker Store
// ============================================================================

class TransactionStore {
  private transactions = new Map<string, TransactionTracker>()
  private removeTimeouts = new Map<string, NodeJS.Timeout>()
  private listeners = new Set<(transactions: TransactionTracker[]) => void>()

  subscribe(listener: (transactions: TransactionTracker[]) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    const transactions = Array.from(this.transactions.values())
    this.listeners.forEach(listener => listener(transactions))
  }

  add(transaction: TransactionTracker) {
    this.transactions.set(transaction.hash, transaction)
    this.notify()
  }

  update(hash: string, update: Partial<TransactionTracker>) {
    const transaction = this.transactions.get(hash)
    if (transaction) {
      this.transactions.set(hash, { ...transaction, ...update })
      this.notify()
    }
  }

  remove(hash: string) {
    const transaction = this.transactions.get(hash)
    if (transaction?.toastId) {
      import('sonner').then(({ toast }) => toast.dismiss(transaction.toastId))
    }
    this.transactions.delete(hash)
    const timeout = this.removeTimeouts.get(hash)
    if (timeout) {
      clearTimeout(timeout)
      this.removeTimeouts.delete(hash)
    }
    this.notify()
  }

  get(hash: string) {
    return this.transactions.get(hash)
  }

  getAll() {
    return Array.from(this.transactions.values())
  }

  clear() {
    this.transactions.forEach(transaction => {
      if (transaction.toastId) {
        import('sonner').then(({ toast }) => toast.dismiss(transaction.toastId))
      }
    })
    this.removeTimeouts.forEach(timeout => clearTimeout(timeout))
    this.removeTimeouts.clear()
    this.transactions.clear()
    this.notify()
  }

  setAutoRemove(hash: string, delay: number) {
    const existing = this.removeTimeouts.get(hash)
    if (existing) clearTimeout(existing)

    const timeout = setTimeout(() => this.remove(hash), delay)
    this.removeTimeouts.set(hash, timeout)
  }
}

const transactionStore = new TransactionStore()

// ============================================================================
// Platform-specific Transaction Implementations
// ============================================================================

function useThirdwebTransactionCore() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | undefined>()
  const [receipt, setReceipt] = useState<any>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const thirdwebAccount = useActiveAccount()
  const activeChain = useActiveWalletChain()
  const { mutateAsync: thirdwebSendTransaction } = useThirdwebSendTransaction()
  const { chainId: blockchainChainId } = useBlockchain()

  useEffect(() => {
    if (!transactionHash || !activeChain) return

    let isCancelled = false
    setIsConfirming(true)

    const pollReceipt = async () => {
      try {
        const txReceipt = await waitForReceipt({
          client: thirdwebClient,
          chain: activeChain,
          transactionHash: transactionHash as `0x${string}`
        })

        if (!isCancelled && txReceipt) {
          setReceipt(txReceipt)
          setIsSuccess(true)
          setIsConfirming(false)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err : new Error('Receipt polling failed')
          )
          setIsConfirming(false)
        }
      }
    }

    pollReceipt()

    return () => {
      isCancelled = true
    }
  }, [transactionHash, activeChain])

  const sendTransaction = async (
    config: TransactionConfig
  ): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      if (!thirdwebAccount) {
        throw new Error('No wallet connected')
      }

      const chainId = config.chainId || activeChain?.id || blockchainChainId
      if (!chainId) {
        throw new Error('No chain ID specified')
      }

      // Define chain directly without importing from server
      const { defineChain } = await import('thirdweb')
      const chainConfig = getChainConfig(chainId)

      if (!chainConfig) {
        throw new Error(`Chain ${chainId} not supported`)
      }

      const chain = defineChain({
        id: chainId,
        name: chainConfig.name,
        rpc: chainConfig.rpcUrl
      })

      const transaction = prepareContractCall({
        contract: {
          client: thirdwebClient,
          chain,
          address: config.address,
          abi: config.abi
        },
        method: config.functionName,
        params: config.args || [],
        value: config.value
      })

      const result = await thirdwebSendTransaction(transaction)
      const txHash = result.transactionHash

      setTransactionHash(txHash)
      return txHash
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Transaction failed')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setIsLoading(false)
    setError(null)
    setTransactionHash(undefined)
    setReceipt(null)
    setIsConfirming(false)
    setIsSuccess(false)
  }

  return {
    sendTransaction,
    isLoading,
    isConfirming,
    isSuccess,
    isError: !!error,
    error,
    transactionHash,
    receipt,
    reset
  }
}

function useWagmiTransactionCore() {
  const [transactionHash, setTransactionHash] = useState<string | undefined>()
  const wagmiChainId = useChainId()
  const {
    writeContractAsync,
    isPending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract()
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash: transactionHash as `0x${string}` | undefined
  })
  const { chainId: blockchainChainId } = useBlockchain()

  const sendTransaction = async (
    config: TransactionConfig
  ): Promise<string> => {
    try {
      const txHash = await writeContractAsync({
        address: config.address,
        abi: config.abi,
        functionName: config.functionName,
        args: config.args || [],
        value: config.value,
        chainId:
          (config.chainId || wagmiChainId || blockchainChainId) ?? undefined
      })

      setTransactionHash(txHash)
      return txHash
    } catch (err) {
      throw err instanceof Error ? err : new Error('Transaction failed')
    }
  }

  const reset = () => {
    resetWrite()
    setTransactionHash(undefined)
  }

  return {
    sendTransaction,
    isLoading: isPending,
    isConfirming,
    isSuccess,
    isError: !!writeError || !!receiptError,
    error: writeError || receiptError || null,
    transactionHash,
    receipt,
    reset
  }
}

// ============================================================================
// Main Transaction Hook
// ============================================================================

export function useTransaction(defaultOptions?: TransactionOptions) {
  const [transactions, setTransactions] = useState<TransactionTracker[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Platform-specific transaction implementation
  const txImpl = isWalletProvider(WalletProviders.THIRDWEB)
    ? useThirdwebTransactionCore()
    : useWagmiTransactionCore()

  // Subscribe to transaction store
  useEffect(() => {
    return transactionStore.subscribe(setTransactions)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const executeTransaction = useCallback(
    async (
      config: TransactionConfig,
      options?: TransactionOptions
    ): Promise<string> => {
      const mergedOptions = { ...defaultOptions, ...options }
      const {
        messages = {
          pendingMessage: 'Transaction pending...',
          processingMessage: 'Processing transaction...',
          confirmedMessage: 'Transaction confirmed!',
          failedMessage: 'Transaction failed'
        },
        tracking,
        showToast = true,
        dismissibleToast = false,
        onStatusChange,
        onSuccess,
        onError
      } = mergedOptions

      try {
        setIsExecuting(true)
        txImpl.reset()

        // Cancel any previous transaction tracking
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        // Generate unique key for this transaction
        const toastKey = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // Show pending toast
        if (showToast) {
          createTransactionToast(toastKey, 'pending', {
            message: messages.pendingMessage,
            description: 'Please confirm the transaction in your wallet',
            dismissible: dismissibleToast
          })
        }
        onStatusChange?.('pending')

        // Send transaction
        let hash: string
        try {
          hash = await txImpl.sendTransaction(config)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Transaction failed'

          if (
            errorMessage.includes('user rejected') ||
            errorMessage.includes('User denied')
          ) {
            throw new Error('Transaction cancelled by user')
          } else if (errorMessage.includes('insufficient funds')) {
            throw new Error('Insufficient funds for transaction')
          } else if (errorMessage.includes('gas')) {
            throw new Error('Gas estimation failed. Please try again')
          }

          throw error
        }

        if (!hash) {
          throw new Error('Transaction failed - no hash returned')
        }

        // Add to tracker
        const chainId = config.chainId || 1
        transactionStore.add({
          hash,
          chainId,
          status: 'processing',
          message: messages.processingMessage
        })

        // Update to processing state
        if (showToast) {
          updateTransactionToast(toastKey, 'processing', {
            message: messages.processingMessage,
            description: 'Transaction submitted to the blockchain',
            hash,
            chainId,
            dismissible: dismissibleToast
          })
        }
        onStatusChange?.('processing', hash)

        // Track in database if tracking info provided
        if (tracking) {
          try {
            await api.post(apiEndpoints.transactions.track, {
              transactionHash: hash,
              chainId,
              ...tracking
            })
          } catch (_) {
            // Silently fail tracking
          }
        }

        // Wait for confirmation
        try {
          const result = await waitForTransactionConfirmation(hash, chainId, {
            pollingInterval: 2000,
            maxAttempts: 150,
            onStatusUpdate: (status: any) => {
              if (status.status === 'confirmed' && showToast) {
                const explorerUrl = getBlockExplorerUrl(hash, chainId)
                updateTransactionToast(toastKey, 'confirmed', {
                  message: messages.confirmedMessage,
                  hash,
                  chainId,
                  dismissible: true,
                  description: explorerUrl
                    ? 'View on block explorer'
                    : undefined
                })
                transactionStore.update(hash, {
                  status: 'confirmed',
                  message: messages.confirmedMessage
                })
                onStatusChange?.('confirmed', hash)
                onSuccess?.(hash)

                // Auto-remove after 5 seconds
                transactionStore.setAutoRemove(hash, 5000)
              }
            }
          })

          if (result.status === 'confirmed') {
            // Update tracking status in database
            if (tracking) {
              try {
                await api.post(apiEndpoints.transactions.status, {
                  transactionHash: hash,
                  status: 'confirmed'
                })
              } catch (_) {
                // Silently fail status update
              }
            }

            return hash
          } else if (result.status === 'failed') {
            throw new Error(result.error || 'Transaction failed')
          }
        } catch (err) {
          if (abortControllerRef.current?.signal.aborted) {
            return hash
          }
          throw err
        }

        return hash
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Transaction failed'

        // Update toast to failed state
        if (
          defaultOptions?.showToast !== false &&
          options?.showToast !== false
        ) {
          const toastKey = `tx-${Date.now()}`
          updateTransactionToast(toastKey, 'failed', {
            message: messages.failedMessage,
            description: errorMessage,
            dismissible: true
          })
        }

        onStatusChange?.('failed')
        onError?.(err instanceof Error ? err : new Error(errorMessage))

        throw err
      } finally {
        setIsExecuting(false)
      }
    },
    [txImpl, defaultOptions]
  )

  return {
    executeTransaction,
    isExecuting,
    transactions,
    transactionHash: txImpl.transactionHash,
    isLoading: txImpl.isLoading,
    isConfirming: txImpl.isConfirming,
    isSuccess: txImpl.isSuccess,
    isError: txImpl.isError,
    error: txImpl.error,
    receipt: txImpl.receipt,
    reset: txImpl.reset,
    // Transaction store methods
    addTransaction: (transaction: TransactionTracker) =>
      transactionStore.add(transaction),
    updateTransaction: (hash: string, update: Partial<TransactionTracker>) =>
      transactionStore.update(hash, update),
    removeTransaction: (hash: string) => transactionStore.remove(hash),
    getTransaction: (hash: string) => transactionStore.get(hash),
    getAllTransactions: () => transactionStore.getAll(),
    clearAllTransactions: () => transactionStore.clear()
  }
}

// ============================================================================
// Admin Transaction Hook
// ============================================================================

export function useAdminTransaction() {
  const { chainId } = useUnifiedChainInfo()
  const { isConnected } = useUnifiedWalletInfo()
  const { executeTransaction, isExecuting } = useTransaction({
    showToast: true,
    dismissibleToast: false
  })

  const executeAdminTransaction = async (
    method: string,
    args: any,
    networkId?: number,
    options: TransactionOptions = {}
  ) => {
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    const effectiveChainId =
      networkId ||
      (chainId && isSupportedChainId(chainId) ? chainId : DEFAULT_CHAIN_ID)

    // Define transaction messages based on method
    const getTransactionMessages = (
      method: string,
      args: any
    ): TransactionMessages => {
      switch (method) {
        case 'createPlan':
          return {
            pendingMessage: `Creating plan "${args.displayName}"...`,
            processingMessage: 'Creating plan on blockchain...',
            confirmedMessage: `Plan "${args.displayName}" created successfully!`,
            failedMessage: 'Failed to create plan'
          }
        case 'updatePlan':
          return {
            pendingMessage: `Updating plan "${args.displayName}"...`,
            processingMessage: 'Updating plan on blockchain...',
            confirmedMessage: `Plan "${args.displayName}" updated successfully!`,
            failedMessage: 'Failed to update plan'
          }
        case 'deletePlan':
          return {
            pendingMessage: 'Deleting plan...',
            processingMessage: 'Removing plan from blockchain...',
            confirmedMessage: 'Plan deleted successfully!',
            failedMessage: 'Failed to delete plan'
          }
        case 'withdrawEarnings':
          return {
            pendingMessage: `Withdrawing ${args.amountNative} to ${args.to.slice(0, 6)}...${args.to.slice(-4)}`,
            processingMessage: 'Processing withdrawal...',
            confirmedMessage: `Successfully withdrew ${args.amountNative}!`,
            failedMessage: 'Failed to withdraw earnings'
          }
        case 'setPlanPrice':
          return {
            pendingMessage: `Updating price for plan ${args.planKey}...`,
            processingMessage: 'Updating plan price on blockchain...',
            confirmedMessage: 'Plan price updated successfully!',
            failedMessage: 'Failed to update plan price'
          }
        default:
          return {
            pendingMessage: 'Processing transaction...',
            processingMessage: 'Transaction in progress...',
            confirmedMessage: 'Transaction completed!',
            failedMessage: 'Transaction failed'
          }
      }
    }

    const messages = getTransactionMessages(method, args)

    try {
      // Always use the API endpoint to prepare transaction data
      const payload = {
        action: method,
        chainId: effectiveChainId,
        ...args
      }

      const response = await api.post(
        apiEndpoints.admin.contract.transactions,
        payload,
        {
          shouldShowErrorToast: false
        }
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to prepare transaction')
      }

      const { transactionData } = response.data

      // Prepare contract arguments based on the method
      const contractArgs = prepareContractArgsFromResponse(
        method,
        args,
        response.data
      )

      const txHash = await executeTransaction(
        {
          address: transactionData.to as `0x${string}`,
          abi: SUBSCRIPTION_MANAGER_ABI,
          functionName: method,
          args: contractArgs,
          value: BigInt(transactionData.value || 0),
          chainId: effectiveChainId
        },
        {
          ...options,
          messages
        }
      )

      return { txHash, success: true }
    } catch (error) {
      throw error
    }
  }

  // Helper function to prepare contract arguments from API response
  const prepareContractArgsFromResponse = (
    method: string,
    args: any,
    responseData: any
  ): any[] => {
    switch (method) {
      case 'createPlan':
        return [
          responseData.planKey,
          args.name,
          args.displayName,
          args.description,
          BigInt(responseData.priceWei),
          args.maxMembers === -1
            ? BigInt(2) ** BigInt(256) - BigInt(1)
            : BigInt(args.maxMembers),
          args.features,
          args.isActive,
          args.sortOrder,
          args.isTeamPlan
        ]
      case 'updatePlan':
        return [
          args.planKey,
          args.name,
          args.displayName,
          args.description,
          BigInt(responseData.priceWei),
          args.maxMembers === -1
            ? BigInt(2) ** BigInt(256) - BigInt(1)
            : BigInt(args.maxMembers),
          args.features,
          args.isActive,
          args.sortOrder,
          args.isTeamPlan
        ]
      case 'deletePlan':
        return [args.planKey]
      case 'withdrawEarnings':
        return [args.to as `0x${string}`, BigInt(responseData.amountWei)]
      case 'setPlanPrice':
        return [args.planKey, BigInt(responseData.priceWei)]
      default:
        return []
    }
  }

  return {
    executeTransaction: executeAdminTransaction,
    isExecuting
  }
}

// ============================================================================
// Transaction Sync Hook
// ============================================================================

export function useTransactionSync() {
  const syncTransactions = useCallback(async () => {
    try {
      const result = await api.post<{
        synced: number
        updates: Array<{
          transactionHash?: string
          status?: string
          planId?: string
          chainId?: number
        }>
      }>(apiEndpoints.transactions.sync, {})

      if (!result.success || !result.data) return

      const { updates } = result.data

      // Process any status updates
      for (const update of updates) {
        if (update && update.status === 'confirmed') {
          // Show success toast
          createTransactionToast(
            `sync-${update.transactionHash}`,
            'confirmed',
            {
              hash: update.transactionHash,
              chainId: update.chainId || 1,
              message: `${update.planId} plan activated!`,
              description: 'Your subscription has been confirmed on-chain'
            }
          )

          // Refresh user data to get updated subscription
          await mutate(apiEndpoints.user.profile)
          await mutate(apiEndpoints.team)
        } else if (update && update.status === 'failed') {
          // Show failure toast
          createTransactionToast(`sync-${update.transactionHash}`, 'failed', {
            hash: update.transactionHash,
            chainId: update.chainId || 1,
            message: 'Transaction failed',
            description: 'Your subscription payment could not be completed'
          })
        }
      }
    } catch (_) {
      // Silently fail - this is a background sync operation
    }
  }, [])

  useEffect(() => {
    // Sync transactions only on first page load
    syncTransactions()
  }, [syncTransactions])

  return { syncTransactions }
}
