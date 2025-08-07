import 'server-only'

import { createPublicClient, http } from 'viem'

import {
  getEscrowCoreAddress,
  getSubscriptionManagerAddress,
  ESCROW_CORE_ABI,
  SUBSCRIPTION_MANAGER_ABI,
  getViemChain
} from '@/lib/blockchain'

/**
 * Server-side service to fetch fee tiers directly from blockchain
 * This ensures fees cannot be tampered with by the client
 */
export class FeeValidationService {
  private publicClient: any
  private subscriptionManagerAddress: string
  private escrowCoreAddress: string

  constructor(chainId: number) {
    const chain = getViemChain(chainId)
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`)
    }

    // Create a public client for reading from the blockchain
    this.publicClient = createPublicClient({
      chain,
      transport: http()
    })

    this.subscriptionManagerAddress = getSubscriptionManagerAddress(chainId)
    this.escrowCoreAddress = getEscrowCoreAddress(chainId)

    if (!this.subscriptionManagerAddress || !this.escrowCoreAddress) {
      throw new Error(`Contracts not deployed on chain ${chainId}`)
    }
  }

  /**
   * Get user's fee percentage directly from the blockchain
   * This cannot be tampered with as it's fetched server-side
   */
  async getUserFeePercentage(userAddress: string): Promise<number> {
    try {
      // First try to get from EscrowCore (which queries SubscriptionManager)
      const feeBasisPoints = await this.publicClient.readContract({
        address: this.escrowCoreAddress as `0x${string}`,
        abi: ESCROW_CORE_ABI,
        functionName: 'getUserFeePercentage',
        args: [userAddress as `0x${string}`]
      })

      // Convert basis points to percentage (250 = 2.5%)
      return Number(feeBasisPoints) / 100
    } catch (error) {
      console.error('Failed to fetch user fee from contract:', error)
      // If contract call fails, we could fall back to fetching from SubscriptionManager directly
      return this.getFeeFromSubscriptionManager(userAddress)
    }
  }

  /**
   * Get fee directly from SubscriptionManager contract
   */
  private async getFeeFromSubscriptionManager(
    userAddress: string
  ): Promise<number> {
    try {
      const feeBasisPoints = await this.publicClient.readContract({
        address: this.subscriptionManagerAddress as `0x${string}`,
        abi: SUBSCRIPTION_MANAGER_ABI,
        functionName: 'getUserFeeTier',
        args: [userAddress as `0x${string}`]
      })

      return Number(feeBasisPoints) / 100
    } catch (error) {
      console.error('Failed to fetch fee from SubscriptionManager:', error)
      throw new Error('Unable to determine user fee tier from blockchain')
    }
  }

  /**
   * Calculate fee amount for a user
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

  /**
   * Get all plan fee tiers from the blockchain
   */
  async getAllPlanFeeTiers(): Promise<Record<number, number>> {
    const tiers: Record<number, number> = {}

    // Fetch fee tiers for known plans (0=Free, 1=Pro, 2=Enterprise, 3=TeamPro, 4=TeamEnterprise)
    for (let planKey = 0; planKey <= 4; planKey++) {
      try {
        const feeBasisPoints = await this.publicClient.readContract({
          address: this.subscriptionManagerAddress as `0x${string}`,
          abi: SUBSCRIPTION_MANAGER_ABI,
          functionName: 'getPlanFeeTier',
          args: [planKey]
        })

        tiers[planKey] = Number(feeBasisPoints) / 100
      } catch {
        // Plan might not exist, skip
      }
    }

    return tiers
  }
}
