import { ethers } from 'ethers'

import { getCachedPrice } from '@/lib/api/price-service'
import {
  getNativeCurrencySymbol,
  getCoingeckoPriceId,
  getSubscriptionManagerAddress,
  SUBSCRIPTION_MANAGER_ABI
} from '@/lib/blockchain'
import {
  parseNativeAmount,
  formatNativeAmount
} from '@/lib/utils/token-helpers'

import { BaseContractClientService } from './base-contract-client.service'

// ============================================================================
// Interfaces and Types
// ============================================================================

export interface CreatePlanParams {
  planKey: number
  name: string
  displayName: string
  description: string
  priceUSD: number
  maxMembers: number
  features: string[]
  isActive?: boolean
  sortOrder?: number
  isTeamPlan?: boolean
  feeTierBasisPoints?: number
}

export interface UpdatePlanParams {
  planKey: number
  name: string
  displayName: string
  description: string
  priceUSD: number
  maxMembers: number
  features: string[]
  isActive?: boolean
  sortOrder?: number
  isTeamPlan?: boolean
  feeTierBasisPoints?: number
}

export interface DeletePlanParams {
  planKey: number
}

export interface WithdrawEarningsParams {
  to: string
  amountNative: number
}

export interface SetPlanPriceParams {
  planKey: number
  priceUSD: number
}

export interface ContractPlan {
  planKey: number
  name: string
  displayName: string
  description: string
  priceWei: bigint
  maxMembers: bigint
  features: string[]
  isActive: boolean
  sortOrder: bigint
  isTeamPlan: boolean
  feeTierBasisPoints: bigint
}

export interface ContractEarnings {
  totalNativeEarnings: bigint
  totalNativeWithdrawn: bigint
  availableNativeEarnings: bigint
  recordsCount: bigint
}

// ============================================================================
// SubscriptionManagerService Class
// ============================================================================

export class SubscriptionManagerService extends BaseContractClientService {
  constructor(
    chainId: number,
    signerOrProvider?: ethers.Signer | ethers.Provider
  ) {
    const contractAddress = getSubscriptionManagerAddress(chainId as any)
    super(
      chainId,
      contractAddress,
      SUBSCRIPTION_MANAGER_ABI,
      'SubscriptionManager',
      signerOrProvider
    )
  }

  // ============================================================================
  // Parameter Preparation
  // ============================================================================

  prepareSubscriptionParams(
    method: string,
    params: any,
    responseData?: any
  ): any[] {
    switch (method) {
      case 'createPlan':
      case 'updatePlan': {
        const planParams = params as CreatePlanParams | UpdatePlanParams
        return [
          planParams.planKey,
          planParams.name,
          planParams.displayName,
          planParams.description,
          BigInt(responseData?.priceWei || 0),
          planParams.maxMembers === -1
            ? ethers.MaxUint256
            : BigInt(planParams.maxMembers),
          planParams.features,
          planParams.isActive ?? true,
          BigInt(planParams.sortOrder ?? 0),
          planParams.isTeamPlan ?? false,
          BigInt(planParams.feeTierBasisPoints ?? 0)
        ]
      }

      case 'deletePlan': {
        const deleteParams = params as DeletePlanParams
        return [deleteParams.planKey]
      }

      case 'withdrawEarnings': {
        const withdrawParams = params as WithdrawEarningsParams
        return [
          withdrawParams.to as `0x${string}`,
          BigInt(responseData?.amountWei || 0)
        ]
      }

      case 'setPlanPrice': {
        const priceParams = params as SetPlanPriceParams
        return [priceParams.planKey, BigInt(responseData?.priceWei || 0)]
      }

      default:
        throw new Error(`Unknown SubscriptionManager method: ${method}`)
    }
  }

  encodeContractFunctionData(functionName: string, args: any[]): string {
    return super.encodeContractFunctionData(functionName, args)
  }

  // ============================================================================
  // Conversion Utilities
  // ============================================================================

  async convertUSDToWei(usdAmount: number): Promise<bigint> {
    if (usdAmount === 0) {
      return BigInt(0)
    }

    try {
      const coingeckoId = getCoingeckoPriceId(this.chainId)
      const symbol = getNativeCurrencySymbol(this.chainId)

      const priceResult = await getCachedPrice(coingeckoId, {
        symbol,
        coingeckoId
      })

      if (!priceResult || priceResult.price <= 0) {
        throw new Error('Unable to fetch current price')
      }

      const nativeAmount = usdAmount / priceResult.price
      return parseNativeAmount(nativeAmount.toString(), this.chainId)
    } catch (error) {
      throw new Error(
        `Failed to convert USD to Wei: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async convertWeiToUSD(weiAmount: bigint): Promise<number> {
    if (weiAmount === BigInt(0)) {
      return 0
    }

    try {
      const coingeckoId = getCoingeckoPriceId(this.chainId)
      const symbol = getNativeCurrencySymbol(this.chainId)

      const priceResult = await getCachedPrice(coingeckoId, {
        symbol,
        coingeckoId
      })

      if (!priceResult || priceResult.price <= 0) {
        throw new Error('Unable to fetch current price')
      }

      const nativeAmount = Number(formatNativeAmount(weiAmount, this.chainId))
      return nativeAmount * priceResult.price
    } catch (error) {
      throw new Error(
        `Failed to convert Wei to USD: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async formatPriceForDisplay(weiAmount: bigint): Promise<string> {
    const usdAmount = await this.convertWeiToUSD(weiAmount)
    return `$${usdAmount.toFixed(2)}`
  }

  // ============================================================================
  // Contract Info
  // ============================================================================

  async getContractInfo() {
    return super.getContractInfo()
  }

  // ============================================================================
  // Plan Management
  // ============================================================================

  async getAllPlans(): Promise<ContractPlan[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const plans = await this.contract.getAllPlans()
      return plans.map((plan: any) => ({
        planKey: Number(plan.planKey),
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        priceWei: plan.priceWei,
        maxMembers: plan.maxMembers,
        features: plan.features,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
        isTeamPlan: plan.isTeamPlan || false,
        feeTierBasisPoints: plan.feeTierBasisPoints
      }))
    } catch (_error) {
      return await this.getActivePlans()
    }
  }

  async getActivePlans(): Promise<ContractPlan[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const plans = await this.contract.getAllActivePlans()
      return plans.map((plan: any) => ({
        planKey: Number(plan.planKey),
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        priceWei: plan.priceWei,
        maxMembers: plan.maxMembers,
        features: plan.features,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
        isTeamPlan: plan.isTeamPlan || false,
        feeTierBasisPoints: plan.feeTierBasisPoints
      }))
    } catch (error) {
      throw error
    }
  }

  async getPlan(planKey: number): Promise<ContractPlan> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const plan = await this.contract.getPlan(planKey)
      return {
        planKey: Number(plan.planKey),
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        priceWei: plan.priceWei,
        maxMembers: plan.maxMembers,
        features: plan.features,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
        isTeamPlan: plan.isTeamPlan || false,
        feeTierBasisPoints: plan.feeTierBasisPoints
      }
    } catch (error) {
      throw error
    }
  }

  async getCreatePlanConfig(params: CreatePlanParams) {
    const priceWei = await this.convertUSDToWei(params.priceUSD)
    const args = this.prepareSubscriptionParams('createPlan', params, {
      priceWei: priceWei.toString()
    })
    return this.getTransactionConfig('createPlan', args)
  }

  async getUpdatePlanConfig(params: UpdatePlanParams) {
    const priceWei = await this.convertUSDToWei(params.priceUSD)
    const args = this.prepareSubscriptionParams('updatePlan', params, {
      priceWei: priceWei.toString()
    })
    return this.getTransactionConfig('updatePlan', args)
  }

  getDeletePlanConfig(planKey: number) {
    const args = this.prepareSubscriptionParams('deletePlan', { planKey })
    return this.getTransactionConfig('deletePlan', args)
  }

  async getSetPlanPriceConfig(planKey: number, priceUSD: number) {
    const priceWei = await this.convertUSDToWei(priceUSD)
    const args = this.prepareSubscriptionParams(
      'setPlanPrice',
      { planKey, priceUSD },
      { priceWei: priceWei.toString() }
    )
    return this.getTransactionConfig('setPlanPrice', args)
  }

  // ============================================================================
  // Earnings Management
  // ============================================================================

  async getEarningsSummary(): Promise<ContractEarnings> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const summary = await this.contract.getEarningsSummary()
      return {
        totalNativeEarnings: summary.totalNativeEarnings,
        totalNativeWithdrawn: summary.totalNativeWithdrawn,
        availableNativeEarnings: summary.availableNativeEarnings,
        recordsCount: summary.recordsCount
      }
    } catch (error) {
      throw error
    }
  }

  getWithdrawEarningsConfig(to: string, amountWei: bigint) {
    return this.getTransactionConfig('withdrawEarnings', [to, amountWei])
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  async planExists(planKey: number): Promise<boolean> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.planExistsCheck(planKey)
    } catch (_error) {
      return false
    }
  }

  async getNextAvailablePlanKey(): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const allPlanKeys = await this.contract.getAllPlanKeys()
      const usedKeys = allPlanKeys.map((key: any) => Number(key))

      for (let i = 3; i < 256; i++) {
        if (!usedKeys.includes(i)) {
          return i
        }
      }

      throw new Error('No available plan keys')
    } catch (error) {
      throw error
    }
  }

  /**
   * Get all plan fee tiers from the blockchain
   */
  async getAllPlanFeeTiers(): Promise<Record<number, number>> {
    const tiers: Record<number, number> = {}

    // Fetch fee tiers for known plans (0=Free, 1=Pro, 2=Enterprise, 3=TeamPro, 4=TeamEnterprise)
    for (let planKey = 0; planKey <= 4; planKey++) {
      try {
        const plan = await this.getPlan(planKey)
        tiers[planKey] = Number(plan.feeTierBasisPoints) / 100
      } catch {
        // Plan might not exist, skip
      }
    }

    return tiers
  }

  /**
   * Get user's fee tier from their subscription
   */
  async getUserFeeTier(userAddress: string): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const feeBasisPoints = await this.contract.getUserFeeTier(
        userAddress as `0x${string}`
      )
      return Number(feeBasisPoints) / 100
    } catch (error) {
      console.error('Failed to fetch user fee tier:', error)
      // Default to highest fee if unable to fetch
      return 2.5
    }
  }

  // ============================================================================
  // Event Decoding
  // ============================================================================

  decodeEventLog(log: { data: string; topics: readonly string[] }): any {
    return super.decodeEventLog(log)
  }
}
