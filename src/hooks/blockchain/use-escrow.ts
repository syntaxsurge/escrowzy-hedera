'use client'

import { useState, useCallback } from 'react'

import { parseEther, formatEther, decodeEventLog } from 'viem'

import { useBlockchain } from '@/context'
import { useToast } from '@/hooks/use-toast'
import { getEscrowCoreAddress, ESCROW_CORE_ABI } from '@/lib/blockchain'

import { useTransaction } from './use-transaction'
import type { TransactionConfig } from './use-transaction'

export enum EscrowStatus {
  CREATED = 0,
  FUNDED = 1,
  DELIVERED = 2,
  CONFIRMED = 3,
  DISPUTED = 4,
  REFUNDED = 5,
  CANCELLED = 6,
  COMPLETED = 7
}

export interface EscrowDetails {
  buyer: string
  seller: string
  amount: bigint
  fee: bigint
  status: EscrowStatus
  createdAt: bigint
  fundedAt: bigint
  disputeWindow: bigint
  metadata: string
}

export interface CreateEscrowParams {
  seller: string
  amount: string // Native currency amount as string
  disputeWindow?: number // in seconds
  metadata?: string
  autoFund?: boolean // Whether to fund immediately
  templateId?: string // Optional template ID
  approvers?: string[] // Optional multi-sig approvers
}

export interface BatchCreateEscrowParams {
  sellers: string[]
  amounts: string[]
  disputeWindows?: number[]
  metadatas?: string[]
}

export function useEscrow() {
  const { chainId } = useBlockchain()
  const { executeTransaction, isExecuting } = useTransaction()
  const { toast } = useToast()
  const [escrowDetails, _setEscrowDetails] = useState<EscrowDetails | null>(
    null
  )

  const selectedChainId = chainId || 1
  const escrowAddress = getEscrowCoreAddress(selectedChainId)

  // Helper function to get escrowId from transaction receipt
  const getEscrowIdFromReceipt = async (
    txHash: string,
    chainId: number
  ): Promise<number | null> => {
    try {
      // Import necessary functions dynamically
      const { getPublicClient } = await import(
        '@/lib/blockchain/blockchain-transaction'
      )
      const publicClient = getPublicClient(chainId)

      if (!publicClient) {
        console.error('No public client available for chain', chainId)
        return null
      }

      // Get transaction receipt
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`
      })

      // Find the EscrowCreated event in the logs
      for (const log of receipt.logs) {
        try {
          const decodedLog = decodeEventLog({
            abi: ESCROW_CORE_ABI,
            data: log.data,
            topics: log.topics
          })

          if (decodedLog.eventName === 'EscrowCreated' && decodedLog.args) {
            // The escrowId is the first indexed parameter
            const args = decodedLog.args as unknown as { escrowId: bigint }
            const escrowId = Number(args.escrowId)
            return escrowId
          }
        } catch {
          // Not the event we're looking for, continue
          continue
        }
      }

      return null
    } catch (error) {
      console.error('Error getting escrowId from receipt:', error)
      return null
    }
  }

  const createEscrow = useCallback(
    async (params: CreateEscrowParams) => {
      if (!escrowAddress) {
        toast({
          title: 'Error',
          description: 'Escrow contract not deployed on this network',
          variant: 'destructive'
        })
        return { txHash: undefined, escrowId: undefined }
      }

      try {
        const amountInWei = parseEther(params.amount)

        // Calculate fee based on user's tier
        const feeStr = await calculateFee(params.amount, params.seller)
        const feeAmount = parseEther(feeStr)
        const totalAmount = amountInWei + feeAmount

        const disputeWindow = params.disputeWindow || 7 * 24 * 60 * 60 // 7 days default

        let config: TransactionConfig

        // Use enhanced function if template or approvers provided
        if (
          params.templateId ||
          (params.approvers && params.approvers.length > 0)
        ) {
          config = {
            address: escrowAddress as `0x${string}`,
            abi: ESCROW_CORE_ABI,
            functionName: 'createEscrowWithTemplate',
            args: [
              params.seller,
              amountInWei,
              disputeWindow,
              params.metadata || '',
              params.templateId || '',
              params.approvers || []
            ],
            value: params.autoFund ? totalAmount : 0n,
            chainId: selectedChainId
          }
        } else {
          // Use basic function for backward compatibility
          config = {
            address: escrowAddress as `0x${string}`,
            abi: ESCROW_CORE_ABI,
            functionName: 'createEscrow',
            args: [
              params.seller,
              amountInWei,
              disputeWindow,
              params.metadata || ''
            ],
            value: params.autoFund ? totalAmount : 0n,
            chainId: selectedChainId
          }
        }

        const hash = await executeTransaction(config)

        // Extract escrowId from the transaction receipt
        let escrowId: number | null = null
        if (hash) {
          escrowId = await getEscrowIdFromReceipt(hash, selectedChainId)
          if (escrowId !== null) {
            console.log('Escrow created with ID:', escrowId)
          }
        }

        return { txHash: hash, escrowId }
      } catch (error) {
        console.error('Failed to create escrow:', error)
        throw error
      }
    },
    [escrowAddress, selectedChainId, executeTransaction, toast]
  )

  const fundEscrow = useCallback(
    async (escrowId: number, amount: string) => {
      if (!escrowAddress) {
        toast({
          title: 'Error',
          description: 'Escrow contract not deployed on this network',
          variant: 'destructive'
        })
        return
      }

      try {
        const amountInWei = parseEther(amount)

        // Calculate fee (2.5% default)
        const feeAmount = (amountInWei * 250n) / 10000n
        const totalAmount = amountInWei + feeAmount

        const config: TransactionConfig = {
          address: escrowAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: 'fundEscrow',
          args: [escrowId],
          value: totalAmount,
          chainId: selectedChainId
        }

        const hash = await executeTransaction(config, {
          messages: {
            pendingMessage: 'Funding escrow...',
            processingMessage: 'Processing escrow funding...',
            confirmedMessage: 'Escrow funded successfully!',
            failedMessage: 'Failed to fund escrow'
          },
          onSuccess: (_txHash: string) => {
            toast({
              title: 'Success',
              description: `Escrow funded. Transaction: ${_txHash.slice(0, 10)}...`
            })
          },
          onError: (error: Error) => {
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive'
            })
          }
        })

        return hash
      } catch (error) {
        console.error('Failed to fund escrow:', error)
        throw error
      }
    },
    [escrowAddress, selectedChainId, executeTransaction, toast]
  )

  const confirmDelivery = useCallback(
    async (escrowId: number) => {
      if (!escrowAddress) {
        toast({
          title: 'Error',
          description: 'Escrow contract not deployed on this network',
          variant: 'destructive'
        })
        return
      }

      try {
        const config: TransactionConfig = {
          address: escrowAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: 'confirmDelivery',
          args: [escrowId],
          chainId: selectedChainId
        }

        const hash = await executeTransaction(config)

        return hash
      } catch (error) {
        console.error('Failed to confirm delivery:', error)
        throw error
      }
    },
    [escrowAddress, selectedChainId, executeTransaction, toast]
  )

  const raiseDispute = useCallback(
    async (escrowId: number, reason: string) => {
      if (!escrowAddress) {
        toast({
          title: 'Error',
          description: 'Escrow contract not deployed on this network',
          variant: 'destructive'
        })
        return
      }

      try {
        const config: TransactionConfig = {
          address: escrowAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: 'raiseDispute',
          args: [escrowId, reason],
          chainId: selectedChainId
        }

        const hash = await executeTransaction(config, {
          messages: {
            pendingMessage: 'Raising dispute...',
            processingMessage: 'Processing dispute...',
            confirmedMessage: 'Dispute raised successfully!',
            failedMessage: 'Failed to raise dispute'
          },
          onSuccess: (_txHash: string) => {
            toast({
              title: 'Dispute Raised',
              description: 'Your dispute has been submitted for review'
            })
          },
          onError: (error: Error) => {
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive'
            })
          }
        })

        return hash
      } catch (error) {
        console.error('Failed to raise dispute:', error)
        throw error
      }
    },
    [escrowAddress, selectedChainId, executeTransaction, toast]
  )

  const markDelivered = useCallback(
    async (escrowId: number) => {
      if (!escrowAddress) {
        toast({
          title: 'Error',
          description: 'Escrow contract not deployed on this network',
          variant: 'destructive'
        })
        return
      }

      try {
        const config: TransactionConfig = {
          address: escrowAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: 'markDelivered',
          args: [escrowId],
          chainId: selectedChainId
        }

        const hash = await executeTransaction(config, {
          messages: {
            pendingMessage: 'Marking as delivered...',
            processingMessage: 'Processing delivery status...',
            confirmedMessage: 'Marked as delivered!',
            failedMessage: 'Failed to mark as delivered'
          },
          onSuccess: (_txHash: string) => {
            toast({
              title: 'Success',
              description:
                'Item marked as delivered. Waiting for buyer confirmation.'
            })
          },
          onError: (error: Error) => {
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive'
            })
          }
        })

        return hash
      } catch (error) {
        console.error('Failed to mark as delivered:', error)
        throw error
      }
    },
    [escrowAddress, selectedChainId, executeTransaction, toast]
  )

  const cancelEscrow = useCallback(
    async (escrowId: number) => {
      if (!escrowAddress) {
        toast({
          title: 'Error',
          description: 'Escrow contract not deployed on this network',
          variant: 'destructive'
        })
        return
      }

      try {
        const config: TransactionConfig = {
          address: escrowAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: 'cancelEscrow',
          args: [escrowId],
          chainId: selectedChainId
        }

        const hash = await executeTransaction(config, {
          messages: {
            pendingMessage: 'Cancelling escrow...',
            processingMessage: 'Processing cancellation...',
            confirmedMessage: 'Escrow cancelled successfully!',
            failedMessage: 'Failed to cancel escrow'
          },
          onSuccess: (_txHash: string) => {
            toast({
              title: 'Cancelled',
              description: 'Escrow has been cancelled'
            })
          },
          onError: (error: Error) => {
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive'
            })
          }
        })

        return hash
      } catch (error) {
        console.error('Failed to cancel escrow:', error)
        throw error
      }
    },
    [escrowAddress, selectedChainId, executeTransaction, toast]
  )

  const calculateFee = useCallback(
    async (amount: string, userAddress?: string): Promise<string> => {
      try {
        const amountInWei = parseEther(amount)

        // Get user's subscription tier if address provided
        if (userAddress && escrowAddress) {
          try {
            const { getPublicClient } = await import(
              '@/lib/blockchain/blockchain-transaction'
            )
            const publicClient = getPublicClient(selectedChainId)

            if (publicClient) {
              const tier = await publicClient.readContract({
                address: escrowAddress as `0x${string}`,
                abi: ESCROW_CORE_ABI,
                functionName: 'userSubscriptionTier',
                args: [userAddress]
              })

              // Apply tiered fee percentage
              let feePercentage = 250n // Default 2.5%
              if (tier === 2)
                feePercentage = 150n // Enterprise 1.5%
              else if (tier === 1) feePercentage = 200n // Pro 2.0%

              const feeAmount = (amountInWei * feePercentage) / 10000n
              return formatEther(feeAmount)
            }
          } catch (error) {
            console.error('Error getting user tier:', error)
          }
        }

        // Default fee calculation
        const feeAmount = (amountInWei * 250n) / 10000n // 2.5%
        return formatEther(feeAmount)
      } catch {
        return '0'
      }
    },
    [escrowAddress, selectedChainId]
  )

  const batchCreateEscrows = useCallback(
    async (params: BatchCreateEscrowParams) => {
      if (!escrowAddress) {
        toast({
          title: 'Error',
          description: 'Escrow contract not deployed on this network',
          variant: 'destructive'
        })
        return { txHash: undefined, escrowIds: [] }
      }

      try {
        // Calculate total value needed
        let totalValue = 0n
        const amountsInWei: bigint[] = []

        for (let i = 0; i < params.amounts.length; i++) {
          const amountInWei = parseEther(params.amounts[i])
          const feeStr = await calculateFee(
            params.amounts[i],
            params.sellers[i]
          )
          const feeAmount = parseEther(feeStr)

          amountsInWei.push(amountInWei)
          totalValue += amountInWei + feeAmount
        }

        const config: TransactionConfig = {
          address: escrowAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: 'batchCreateEscrows',
          args: [
            params.sellers,
            amountsInWei,
            params.disputeWindows || params.sellers.map(() => 7 * 24 * 60 * 60),
            params.metadatas || params.sellers.map(() => '')
          ],
          value: totalValue,
          chainId: selectedChainId
        }

        const hash = await executeTransaction(config, {
          messages: {
            pendingMessage: 'Creating batch escrows...',
            processingMessage: 'Processing batch creation...',
            confirmedMessage: 'Batch escrows created successfully!',
            failedMessage: 'Failed to create batch escrows'
          },
          onSuccess: (_txHash: string) => {
            toast({
              title: 'Success',
              description: `Created ${params.sellers.length} escrows successfully`
            })
          },
          onError: (error: Error) => {
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive'
            })
          }
        })

        return { txHash: hash, escrowIds: [] } // TODO: Extract IDs from events
      } catch (error) {
        console.error('Failed to create batch escrows:', error)
        throw error
      }
    },
    [escrowAddress, selectedChainId, executeTransaction, toast, calculateFee]
  )

  const approveEscrow = useCallback(
    async (escrowId: number) => {
      if (!escrowAddress) {
        toast({
          title: 'Error',
          description: 'Escrow contract not deployed on this network',
          variant: 'destructive'
        })
        return
      }

      try {
        const config: TransactionConfig = {
          address: escrowAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: 'approveEscrow',
          args: [escrowId],
          chainId: selectedChainId
        }

        const hash = await executeTransaction(config, {
          messages: {
            pendingMessage: 'Approving escrow...',
            processingMessage: 'Processing approval...',
            confirmedMessage: 'Escrow approved!',
            failedMessage: 'Failed to approve escrow'
          },
          onSuccess: (_txHash: string) => {
            toast({
              title: 'Approved',
              description: 'Escrow has been approved'
            })
          },
          onError: (error: Error) => {
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive'
            })
          }
        })

        return hash
      } catch (error) {
        console.error('Failed to approve escrow:', error)
        throw error
      }
    },
    [escrowAddress, selectedChainId, executeTransaction, toast]
  )

  return {
    createEscrow,
    batchCreateEscrows,
    fundEscrow,
    confirmDelivery,
    raiseDispute,
    markDelivered,
    cancelEscrow,
    approveEscrow,
    calculateFee,
    isLoading: isExecuting,
    escrowDetails
  }
}
