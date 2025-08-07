'use client'

import { useState, useCallback } from 'react'

import { useBlockchain } from '@/context'
import { useToast } from '@/hooks/use-toast'
import { getEscrowCoreAddress } from '@/lib/blockchain'
import { calculateEscrowAmounts } from '@/lib/utils/token-helpers'
import {
  type CreateEscrowParams,
  type FundEscrowParams,
  type ConfirmDeliveryParams,
  type CancelEscrowParams,
  type RaiseDisputeParams,
  type BatchCreateEscrowsParams,
  type MarkDeliveredParams,
  EscrowCoreService
} from '@/services/blockchain/escrow-core.service'

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

export function useEscrow() {
  const { chainId, address } = useBlockchain()
  const { executeTransaction, isExecuting } = useTransaction()
  const { toast } = useToast()
  const [escrowDetails, _setEscrowDetails] = useState<EscrowDetails | null>(
    null
  )

  const selectedChainId = chainId || 1
  const escrowAddress = getEscrowCoreAddress(selectedChainId)

  // Create service instance for parameter preparation
  const escrowService = escrowAddress
    ? new EscrowCoreService(selectedChainId)
    : null

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
        // Get fee percentage based on user's tier
        const feePercentage = await calculateFeePercentage(params.seller)

        // Calculate all amounts with proper decimal handling for each chain
        const amounts = calculateEscrowAmounts(
          params.amount,
          feePercentage,
          selectedChainId
        )

        // Use contract amount for function args, transaction value for msg.value
        const amountForContract = amounts.baseAmount.contractAmount
        const totalValue = amounts.totalAmount.transactionValue

        // Prepare parameters using centralized function
        const escrowParams: CreateEscrowParams = {
          seller: params.seller,
          amount: amountForContract.toString(),
          disputeWindow: params.disputeWindow,
          metadata: params.metadata
        }

        const args = escrowService
          ? escrowService.prepareEscrowParams('createEscrow', escrowParams)
          : []

        let config: TransactionConfig

        // Use enhanced function if template or approvers provided
        if (
          params.templateId ||
          (params.approvers && params.approvers.length > 0)
        ) {
          // For createEscrowWithTemplate, we need to add template and approvers
          config = escrowService!.getTransactionConfig(
            'createEscrowWithTemplate',
            [...args, params.templateId || '', params.approvers || []],
            params.autoFund ? totalValue : 0n
          )
        } else {
          // Use basic function for backward compatibility
          config = escrowService!.getTransactionConfig(
            'createEscrow',
            args,
            params.autoFund ? totalValue : 0n
          )
        }

        const hash = await executeTransaction(config)

        // Extract escrowId from the transaction receipt
        let escrowId: number | null = null
        if (hash && escrowService) {
          escrowId = await escrowService.getEscrowIdFromReceipt(
            hash,
            selectedChainId
          )
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
        // Get fee percentage from contract for the current user
        const feePercentage = await calculateFeePercentage(address)

        // Calculate amounts with proper decimal handling for each chain
        const amounts = calculateEscrowAmounts(
          amount,
          feePercentage,
          selectedChainId
        )

        // Use transaction value for msg.value
        const totalValue = amounts.totalAmount.transactionValue

        const params: FundEscrowParams = {
          escrowId
        }

        const args = escrowService
          ? escrowService.prepareEscrowParams('fundEscrow', params)
          : []

        const config = escrowService!.getTransactionConfig(
          'fundEscrow',
          args,
          totalValue
        )

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
        const params: ConfirmDeliveryParams = {
          escrowId
        }

        const args = escrowService
          ? escrowService.prepareEscrowParams('confirmDelivery', params)
          : []

        const config = escrowService!.getTransactionConfig(
          'confirmDelivery',
          args
        )

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
        const params: RaiseDisputeParams = {
          escrowId,
          reason
        }

        const args = escrowService
          ? escrowService.prepareEscrowParams('raiseDispute', params)
          : []

        const config = escrowService!.getTransactionConfig('raiseDispute', args)

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
        const params: MarkDeliveredParams = {
          escrowId
        }

        const args = escrowService
          ? escrowService.prepareEscrowParams('markDelivered', params)
          : []

        const config = escrowService!.getTransactionConfig(
          'markDelivered',
          args
        )

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
        const params: CancelEscrowParams = {
          escrowId
        }

        const args = escrowService
          ? escrowService.prepareEscrowParams('cancelEscrow', params)
          : []

        const config = escrowService!.getTransactionConfig('cancelEscrow', args)

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

  const calculateFeePercentage = useCallback(
    async (userAddress?: string): Promise<number> => {
      if (!userAddress) {
        console.warn('No user address provided, using default fee')
        return 0.025 // Default 2.5% fee as decimal
      }

      if (!escrowService) {
        console.warn('Escrow service not available, using default fee')
        return 0.025 // Default 2.5% fee as decimal
      }

      try {
        // Use the service method to get user fee percentage
        const feePercentage =
          await escrowService.getUserFeePercentage(userAddress)
        return feePercentage / 100 // Convert from percentage to decimal (2.5 -> 0.025)
      } catch (error) {
        console.warn('Failed to get user fee percentage, using default:', error)
        return 0.025 // Default 2.5% fee as decimal
      }
    },
    [escrowService]
  )

  const batchCreateEscrows = useCallback(
    async (params: BatchCreateEscrowsParams) => {
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
        const amountsForContract: bigint[] = []

        for (let i = 0; i < params.amounts.length; i++) {
          // Get fee percentage based on seller's tier
          const feePercentage = await calculateFeePercentage(params.sellers[i])

          // Calculate amounts with proper decimal handling for each chain
          const amounts = calculateEscrowAmounts(
            params.amounts[i],
            feePercentage,
            selectedChainId
          )

          amountsForContract.push(amounts.baseAmount.contractAmount)
          totalValue += amounts.totalAmount.transactionValue
        }

        // Prepare batch params with amounts converted
        const batchParams: BatchCreateEscrowsParams = {
          sellers: params.sellers,
          amounts: amountsForContract.map(a => a.toString()),
          disputeWindows: params.disputeWindows,
          metadatas: params.metadatas
        }

        const args = escrowService
          ? escrowService.prepareEscrowParams('batchCreateEscrows', batchParams)
          : []

        const config = escrowService!.getTransactionConfig(
          'batchCreateEscrows',
          args,
          totalValue
        )

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
    [
      escrowAddress,
      selectedChainId,
      executeTransaction,
      toast,
      calculateFeePercentage
    ]
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
        const config = escrowService!.getTransactionConfig('approveEscrow', [
          BigInt(escrowId)
        ])

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
    isLoading: isExecuting,
    escrowDetails
  }
}
