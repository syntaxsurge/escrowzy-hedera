import { ethers } from 'ethers'

import { ESCROW_CORE_ABI, getEscrowCoreAddress } from '@/lib/blockchain'

import { BaseContractClientService } from './base-contract-client.service'

// ============================================================================
// Enums and Types
// ============================================================================

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

// ============================================================================
// Interfaces
// ============================================================================

export interface CreateEscrowParams {
  seller: string
  amount: string
  disputeWindow?: number
  metadata?: string
  autoFund?: boolean
  templateId?: string
  approvers?: string[]
}

export interface FundEscrowParams {
  escrowId: number
}

export interface MarkDeliveredParams {
  escrowId: number
}

export interface ConfirmDeliveryParams {
  escrowId: number
}

export interface RaiseDisputeParams {
  escrowId: number
  reason: string
}

export interface ResolveDisputeParams {
  escrowId: number
  refundBuyer: boolean
  buyerAmount: bigint
  sellerAmount: bigint
}

export interface CancelEscrowParams {
  escrowId: number
}

export interface BatchCreateEscrowsParams {
  sellers: string[]
  amounts: string[]
  disputeWindows?: number[]
  metadatas?: string[]
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

// ============================================================================
// EscrowCoreService Class
// ============================================================================

export class EscrowCoreService extends BaseContractClientService {
  constructor(
    chainId: number,
    signerOrProvider?: ethers.Signer | ethers.Provider
  ) {
    const contractAddress = getEscrowCoreAddress(chainId as any)
    super(
      chainId,
      contractAddress,
      ESCROW_CORE_ABI,
      'EscrowCore',
      signerOrProvider
    )
  }

  // ============================================================================
  // Parameter Preparation
  // ============================================================================

  prepareEscrowParams(method: string, params: any, _responseData?: any): any[] {
    switch (method) {
      case 'createEscrow': {
        const escrowParams = params as CreateEscrowParams
        return [
          escrowParams.seller as `0x${string}`,
          BigInt(escrowParams.amount),
          BigInt(escrowParams.disputeWindow || 86400),
          escrowParams.metadata || ''
        ]
      }

      case 'fundEscrow': {
        const fundParams = params as FundEscrowParams
        return [BigInt(fundParams.escrowId)]
      }

      case 'markDelivered': {
        const deliverParams = params as MarkDeliveredParams
        return [BigInt(deliverParams.escrowId)]
      }

      case 'confirmDelivery': {
        const confirmParams = params as ConfirmDeliveryParams
        return [BigInt(confirmParams.escrowId)]
      }

      case 'raiseDispute': {
        const disputeParams = params as RaiseDisputeParams
        return [BigInt(disputeParams.escrowId), disputeParams.reason]
      }

      case 'resolveDispute': {
        const resolveParams = params as ResolveDisputeParams
        return [
          BigInt(resolveParams.escrowId),
          resolveParams.refundBuyer,
          resolveParams.buyerAmount,
          resolveParams.sellerAmount
        ]
      }

      case 'cancelEscrow': {
        const cancelParams = params as CancelEscrowParams
        return [BigInt(cancelParams.escrowId)]
      }

      case 'batchCreateEscrows': {
        const batchParams = params as BatchCreateEscrowsParams
        return [
          batchParams.sellers.map(s => s as `0x${string}`),
          batchParams.amounts.map(a => BigInt(a)),
          batchParams.disputeWindows?.map(d => BigInt(d)) || [],
          batchParams.metadatas || []
        ]
      }

      default:
        throw new Error(`Unknown EscrowCore method: ${method}`)
    }
  }

  encodeContractFunctionData(functionName: string, args: any[]): string {
    return super.encodeContractFunctionData(functionName, args)
  }

  // ============================================================================
  // Contract Info
  // ============================================================================

  async getContractInfo() {
    return super.getContractInfo()
  }

  // ============================================================================
  // Escrow Management
  // ============================================================================

  getCreateEscrowConfig(params: CreateEscrowParams) {
    const args = this.prepareEscrowParams('createEscrow', params)
    const value = params.autoFund ? BigInt(params.amount) : BigInt(0)
    return this.getTransactionConfig('createEscrow', args, value)
  }

  getFundEscrowConfig(escrowId: number, amount: string) {
    const args = this.prepareEscrowParams('fundEscrow', { escrowId })
    return this.getTransactionConfig('fundEscrow', args, BigInt(amount))
  }

  getMarkDeliveredConfig(escrowId: number) {
    const args = this.prepareEscrowParams('markDelivered', { escrowId })
    return this.getTransactionConfig('markDelivered', args)
  }

  getConfirmDeliveryConfig(escrowId: number) {
    const args = this.prepareEscrowParams('confirmDelivery', { escrowId })
    return this.getTransactionConfig('confirmDelivery', args)
  }

  getRaiseDisputeConfig(escrowId: number, reason: string) {
    const args = this.prepareEscrowParams('raiseDispute', {
      escrowId,
      reason
    })
    return this.getTransactionConfig('raiseDispute', args)
  }

  getResolveDisputeConfig(params: ResolveDisputeParams) {
    const args = this.prepareEscrowParams('resolveDispute', params)
    return this.getTransactionConfig('resolveDispute', args)
  }

  getCancelEscrowConfig(escrowId: number) {
    const args = this.prepareEscrowParams('cancelEscrow', { escrowId })
    return this.getTransactionConfig('cancelEscrow', args)
  }

  getBatchCreateEscrowsConfig(params: BatchCreateEscrowsParams) {
    const args = this.prepareEscrowParams('batchCreateEscrows', params)
    const totalValue = params.amounts.reduce(
      (sum, amount) => sum + BigInt(amount),
      BigInt(0)
    )
    return this.getTransactionConfig('batchCreateEscrows', args, totalValue)
  }

  getApproveEscrowConfig(escrowId: number) {
    return this.getTransactionConfig('approveEscrow', [BigInt(escrowId)])
  }

  // ============================================================================
  // Read Functions
  // ============================================================================

  async getEscrowDetails(escrowId: number): Promise<EscrowDetails> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized for read operations')
      }
      const details = await this.contract.escrows(BigInt(escrowId))
      return {
        buyer: details.buyer,
        seller: details.seller,
        amount: details.amount,
        fee: details.fee,
        status: details.status,
        createdAt: details.createdAt,
        fundedAt: details.fundedAt,
        disputeWindow: details.disputeWindow,
        metadata: details.metadata
      }
    } catch (error) {
      throw error
    }
  }

  async getEscrowCount(): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const count = await this.contract.escrowCounter()
      return Number(count)
    } catch (error) {
      throw error
    }
  }

  async getUserEscrows(userAddress: string): Promise<number[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const escrows = await this.contract.getUserEscrows(userAddress)
      return escrows.map((id: bigint) => Number(id))
    } catch (error) {
      throw error
    }
  }

  async getActiveEscrows(): Promise<number[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const escrows = await this.contract.getActiveEscrows()
      return escrows.map((id: bigint) => Number(id))
    } catch (error) {
      throw error
    }
  }

  async isApprover(escrowId: number, address: string): Promise<boolean> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.isApprover(BigInt(escrowId), address)
    } catch (error) {
      throw error
    }
  }

  async getApprovers(escrowId: number): Promise<string[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.getApprovers(BigInt(escrowId))
    } catch (error) {
      throw error
    }
  }

  async getApprovalCount(escrowId: number): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const count = await this.contract.getApprovalCount(BigInt(escrowId))
      return Number(count)
    } catch (error) {
      throw error
    }
  }

  async hasApproved(escrowId: number, approver: string): Promise<boolean> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.hasApproved(BigInt(escrowId), approver)
    } catch (error) {
      throw error
    }
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  async getFeePercentage(): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const feeBasisPoints = await this.contract.platformFeeBasisPoints()
      return Number(feeBasisPoints) / 100
    } catch (error) {
      throw error
    }
  }

  async calculateFee(amount: string): Promise<bigint> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const feeBasisPoints = await this.contract.platformFeeBasisPoints()
      const amountBigInt = BigInt(amount)
      return (amountBigInt * feeBasisPoints) / BigInt(10000)
    } catch (error) {
      throw error
    }
  }

  async getContractBalance(): Promise<bigint> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized')
      }
      return await this.provider.getBalance(this.contractAddress)
    } catch (error) {
      throw error
    }
  }

  /**
   * Get user's fee percentage from the blockchain (via SubscriptionManager)
   * This cannot be tampered with as it's fetched server-side
   */
  async getUserFeePercentage(userAddress: string): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      // Query the fee through EscrowCore which gets it from SubscriptionManager
      const feeBasisPoints = await this.contract.getUserFeePercentage(
        userAddress as `0x${string}`
      )
      // Convert basis points to percentage (250 = 2.5%)
      return Number(feeBasisPoints) / 100
    } catch (error) {
      // If the method doesn't exist on EscrowCore, fall back to platform fee
      console.error('Failed to fetch user-specific fee:', error)
      return this.getFeePercentage()
    }
  }

  /**
   * Calculate fee amount for a specific user
   * This is done server-side to prevent tampering
   */
  async calculateUserFee(
    userAddress: string,
    amount: string | number
  ): Promise<{
    feePercentage: number
    feeAmount: number
    netAmount: number
  }> {
    const feePercentage = await this.getUserFeePercentage(userAddress)
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount
    const feeAmount = amountNum * (feePercentage / 100)
    const netAmount = amountNum - feeAmount

    return {
      feePercentage,
      feeAmount,
      netAmount
    }
  }

  /**
   * Validate that a fee provided by the client matches the blockchain
   * This prevents users from tampering with fee calculations
   */
  async validateClientFee(
    userAddress: string,
    amount: string | number,
    clientProvidedFee: number
  ): Promise<boolean> {
    const { feeAmount } = await this.calculateUserFee(userAddress, amount)

    // Allow small rounding differences (0.01%)
    const tolerance = 0.0001
    const difference = Math.abs(feeAmount - clientProvidedFee)
    const percentDiff = difference / feeAmount

    return percentDiff <= tolerance
  }

  // ============================================================================
  // Admin Stats Functions
  // ============================================================================

  async getEscrowStats(): Promise<{
    totalEscrows: number
    activeEscrows: number
    completedEscrows: number
    disputedEscrows: number
    totalVolume: bigint
    totalFeesCollected: bigint
    averageCompletionTime: bigint
  }> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const stats = await this.contract.getEscrowStats()
      return {
        totalEscrows: Number(stats[0]),
        activeEscrows: Number(stats[1]),
        completedEscrows: Number(stats[2]),
        disputedEscrows: Number(stats[3]),
        totalVolume: stats[4],
        totalFeesCollected: stats[5],
        averageCompletionTime: stats[6]
      }
    } catch (error) {
      throw error
    }
  }

  async getAvailableFees(): Promise<bigint> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.getAvailableFees()
    } catch (error) {
      throw error
    }
  }

  async getBaseFeePercentage(): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const feeBasisPoints = await this.contract.baseFeePercentage()
      return Number(feeBasisPoints) / 100
    } catch (error) {
      throw error
    }
  }

  async getDefaultDisputeWindow(): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const window = await this.contract.defaultDisputeWindow()
      return Number(window)
    } catch (error) {
      throw error
    }
  }

  async getFeeRecipient(): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.feeRecipient()
    } catch (error) {
      throw error
    }
  }

  async isPaused(): Promise<boolean> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.paused()
    } catch (error) {
      throw error
    }
  }

  // ============================================================================
  // Event Decoding
  // ============================================================================

  decodeEventLog(log: { data: string; topics: readonly string[] }): any {
    return super.decodeEventLog(log)
  }

  async getEscrowEvents(
    fromBlock: bigint | 'earliest' = 'earliest',
    toBlock: bigint | 'latest' = 'latest'
  ): Promise<any[]> {
    return super.getContractEvents(undefined, fromBlock, toBlock)
  }

  /**
   * Extract escrowId from transaction receipt
   * Used after creating an escrow to get the generated ID
   */
  async getEscrowIdFromReceipt(
    txHash: string,
    chainId?: number
  ): Promise<number | null> {
    try {
      const effectiveChainId = chainId || this.chainId
      const { getPublicClient } = await import(
        '@/lib/blockchain/blockchain-transaction'
      )
      const publicClient = getPublicClient(effectiveChainId)

      if (!publicClient) {
        console.error('No public client available for chain', effectiveChainId)
        return null
      }

      // Get transaction receipt
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`
      })

      // Find the EscrowCreated event in the logs
      for (const log of receipt.logs) {
        try {
          const decodedLog = this.decodeEventLog({
            data: log.data,
            topics: Array.from(log.topics)
          })

          if (decodedLog?.name === 'EscrowCreated' && decodedLog.args) {
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
}
