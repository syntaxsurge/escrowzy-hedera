import 'server-only'
import { ethers } from 'ethers'

import { getCryptoPrice } from '@/lib/api/coingecko'
import {
  getNativeCurrencySymbol,
  getCoingeckoPriceId,
  getSupportedChainIds,
  getRpcUrl,
  getSubscriptionManagerAddress,
  getChainNickname,
  SUBSCRIPTION_MANAGER_ABI
} from '@/lib/blockchain'

interface ContractPlan {
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
}

export interface CreatePlanParams {
  planKey: number
  name: string
  displayName: string
  description: string
  priceUSD: number // Price in USD, will be converted to wei
  maxMembers: number
  features: string[]
  isActive: boolean
  sortOrder: number
  isTeamPlan: boolean
}

interface ContractEarnings {
  totalNativeEarnings: bigint
  totalNativeWithdrawn: bigint
  availableNativeEarnings: bigint
  recordsCount: bigint
}

export class ContractPlanService {
  private contract: ethers.Contract
  private provider: ethers.Provider
  private signer?: ethers.Signer
  private contractAddress: string
  private chainId: number

  constructor(
    chainId: number,
    signerOrProvider?: ethers.Signer | ethers.Provider
  ) {
    this.chainId = chainId
    this.contractAddress = getSubscriptionManagerAddress(chainId as any)

    if (!this.contractAddress) {
      throw new Error(`Contract address not configured for chain ${chainId}`)
    }

    if (signerOrProvider) {
      if ('getAddress' in signerOrProvider) {
        // It's a signer
        this.signer = signerOrProvider as ethers.Signer
        this.provider = signerOrProvider.provider!
      } else {
        // It's a provider
        this.provider = signerOrProvider as ethers.Provider
      }
    } else {
      // Use default provider
      if (!getSupportedChainIds().includes(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`)
      }

      const rpcUrl = getRpcUrl(chainId as any)
      this.provider = new ethers.JsonRpcProvider(rpcUrl)
    }

    this.contract = new ethers.Contract(
      this.contractAddress,
      SUBSCRIPTION_MANAGER_ABI,
      this.signer || this.provider
    )
  }

  // Convert USD price to Wei using CoinGecko API with fallback
  async convertUSDToWei(usdAmount: number): Promise<bigint> {
    if (usdAmount === 0) {
      return BigInt(0)
    }

    try {
      const coingeckoId = getCoingeckoPriceId(this.chainId)

      // Use centralized getCryptoPrice function with revalidate option
      const nativePrice = await getCryptoPrice(coingeckoId, {
        revalidate: 60 // Cache for 1 minute
      })

      const nativeAmount = usdAmount / nativePrice
      // Convert to wei (18 decimals)
      return ethers.parseEther(nativeAmount.toFixed(18))
    } catch (error) {
      // Re-throw the error instead of using fallback prices
      throw new Error(
        `Failed to convert USD to Wei: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Contract info
  async getContractInfo() {
    return {
      address: this.contractAddress,
      chainId: this.chainId,
      chainName: getChainNickname(this.chainId),
      nativeCurrency: getNativeCurrencySymbol(this.chainId),
      abi: SUBSCRIPTION_MANAGER_ABI
    }
  }

  // Plan management
  async getAllPlans(): Promise<ContractPlan[]> {
    try {
      // Try the getAllPlans method first
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
        isTeamPlan: plan.isTeamPlan || false
      }))
    } catch (_error) {
      // If getAllPlans is not available, fallback to getAllActivePlans
      return await this.getActivePlans()
    }
  }

  async getActivePlans(): Promise<ContractPlan[]> {
    try {
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
        isTeamPlan: plan.isTeamPlan || false
      }))
    } catch (error) {
      throw error
    }
  }

  async getPlan(planKey: number): Promise<ContractPlan> {
    try {
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
        isTeamPlan: plan.isTeamPlan || false
      }
    } catch (error) {
      throw error
    }
  }

  async createPlan(params: CreatePlanParams): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for creating plans')
    }

    try {
      const priceWei = await this.convertUSDToWei(params.priceUSD)

      const tx = await this.contract.createPlan(
        params.planKey,
        params.name,
        params.displayName,
        params.description,
        priceWei,
        params.maxMembers === -1 ? ethers.MaxUint256 : params.maxMembers,
        params.features,
        params.isActive,
        params.sortOrder,
        params.isTeamPlan
      )

      await tx.wait()
      return tx.hash
    } catch (error) {
      throw error
    }
  }

  async updatePlan(params: CreatePlanParams): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for updating plans')
    }

    try {
      const priceWei = await this.convertUSDToWei(params.priceUSD)

      const tx = await this.contract.updatePlan(
        params.planKey,
        params.name,
        params.displayName,
        params.description,
        priceWei,
        params.maxMembers === -1 ? ethers.MaxUint256 : params.maxMembers,
        params.features,
        params.isActive,
        params.sortOrder,
        params.isTeamPlan
      )

      await tx.wait()
      return tx.hash
    } catch (error) {
      throw error
    }
  }

  async deletePlan(planKey: number): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for deleting plans')
    }

    try {
      const tx = await this.contract.deletePlan(planKey)
      await tx.wait()
      return tx.hash
    } catch (error) {
      throw error
    }
  }

  async setPlanPrice(planKey: number, priceUSD: number): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for setting plan price')
    }

    try {
      const priceWei = await this.convertUSDToWei(priceUSD)
      const tx = await this.contract.setPlanPrice(planKey, priceWei)
      await tx.wait()
      return tx.hash
    } catch (error) {
      throw error
    }
  }

  // Earnings management
  async getEarningsSummary(): Promise<ContractEarnings> {
    try {
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

  async withdrawEarnings(to: string, amountWei: bigint): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for withdrawing earnings')
    }

    try {
      const tx = await this.contract.withdrawEarnings(to, amountWei)
      await tx.wait()
      return tx.hash
    } catch (error) {
      throw error
    }
  }

  // Utility functions
  async planExists(planKey: number): Promise<boolean> {
    try {
      return await this.contract.planExistsCheck(planKey)
    } catch (_error) {
      return false
    }
  }

  // Convert Wei to USD for display
  async convertWeiToUSD(weiAmount: bigint): Promise<number> {
    // Return 0 for 0 wei
    if (weiAmount === BigInt(0)) {
      return 0
    }

    try {
      const coingeckoId = getCoingeckoPriceId(this.chainId)

      // Use centralized getCryptoPrice function with revalidate option
      const nativePrice = await getCryptoPrice(coingeckoId, {
        revalidate: 60 // Cache for 1 minute
      })

      const nativeAmount = Number(ethers.formatEther(weiAmount))
      return nativeAmount * nativePrice
    } catch (error) {
      throw new Error(
        `Failed to convert Wei to USD: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Format price for display
  async formatPriceForDisplay(weiAmount: bigint): Promise<string> {
    const usdAmount = await this.convertWeiToUSD(weiAmount)
    return `$${usdAmount.toFixed(2)}`
  }

  // Get next available plan key
  async getNextAvailablePlanKey(): Promise<number> {
    try {
      const allPlanKeys = await this.contract.getAllPlanKeys()
      const usedKeys = allPlanKeys.map((key: any) => Number(key))

      // Find the first available key starting from 3 (0, 1, 2 are reserved)
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
}

// Factory function to create service instance
export function createContractPlanService(
  chainId: number,
  signerOrProvider?: ethers.Signer | ethers.Provider
): ContractPlanService | null {
  try {
    const contractAddress = getSubscriptionManagerAddress(chainId as any)
    if (!contractAddress) {
      return null
    }

    return new ContractPlanService(chainId, signerOrProvider)
  } catch (_error) {
    return null
  }
}
