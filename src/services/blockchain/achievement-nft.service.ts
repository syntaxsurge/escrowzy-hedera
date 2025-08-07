import { ethers } from 'ethers'

import { ACHIEVEMENT_NFT_ABI, getAchievementNFTAddress } from '@/lib/blockchain'

import { BaseContractClientService } from './base-contract-client.service'

// ============================================================================
// Enums and Types
// ============================================================================

export enum AchievementCategory {
  TRADING = 0,
  VOLUME = 1,
  STREAK = 2,
  SPECIAL = 3,
  LEVEL = 4,
  BATTLE = 5
}

// ============================================================================
// Interfaces
// ============================================================================

export interface CreateAchievementParams {
  achievementId: number
  name: string
  description: string
  imageUrl: string
  category: AchievementCategory
  requiredProgress: number
  xpReward: number
  isActive?: boolean
}

export interface MintAchievementParams {
  to: string
  achievementId: number
  progress: number
  earnedAt: number
}

export interface BatchMintAchievementsParams {
  to: string
  achievementIds: number[]
  progresses: number[]
  earnedAts: number[]
}

export interface UpdateUserProgressParams {
  user: string
  achievementId: number
  progress: number
}

export interface IncrementUserProgressParams {
  user: string
  achievementId: number
  amount: number
}

export interface AchievementMetadata {
  achievementId: number
  name: string
  description: string
  imageUrl: string
  category: AchievementCategory
  requiredProgress: number
  xpReward: number
  isActive: boolean
  totalMinted: number
}

export interface UserAchievement {
  tokenId: number
  achievementId: number
  progress: number
  earnedAt: number
  owner: string
}

// ============================================================================
// AchievementNFTService Class
// ============================================================================

export class AchievementNFTService extends BaseContractClientService {
  constructor(
    chainId: number,
    signerOrProvider?: ethers.Signer | ethers.Provider
  ) {
    const contractAddress = getAchievementNFTAddress(chainId as any)
    super(
      chainId,
      contractAddress,
      ACHIEVEMENT_NFT_ABI,
      'AchievementNFT',
      signerOrProvider
    )
  }

  // ============================================================================
  // Parameter Preparation
  // ============================================================================

  prepareAchievementParams(
    method: string,
    params: any,
    _responseData?: any
  ): any[] {
    switch (method) {
      case 'createAchievement': {
        const achievementParams = params as CreateAchievementParams
        return [
          BigInt(achievementParams.achievementId),
          achievementParams.name,
          achievementParams.description,
          achievementParams.imageUrl,
          achievementParams.category,
          BigInt(achievementParams.requiredProgress),
          BigInt(achievementParams.xpReward),
          achievementParams.isActive ?? true
        ]
      }

      case 'mintAchievement': {
        const mintParams = params as MintAchievementParams
        return [
          mintParams.to as `0x${string}`,
          BigInt(mintParams.achievementId),
          BigInt(mintParams.progress),
          BigInt(mintParams.earnedAt)
        ]
      }

      case 'batchMintAchievements': {
        const batchParams = params as BatchMintAchievementsParams
        return [
          batchParams.to as `0x${string}`,
          batchParams.achievementIds.map(id => BigInt(id)),
          batchParams.progresses.map(p => BigInt(p)),
          batchParams.earnedAts.map(t => BigInt(t))
        ]
      }

      case 'updateUserProgress': {
        const progressParams = params as UpdateUserProgressParams
        return [
          progressParams.user as `0x${string}`,
          BigInt(progressParams.achievementId),
          BigInt(progressParams.progress)
        ]
      }

      case 'incrementUserProgress': {
        const incrementParams = params as IncrementUserProgressParams
        return [
          incrementParams.user as `0x${string}`,
          BigInt(incrementParams.achievementId),
          BigInt(incrementParams.amount)
        ]
      }

      default:
        throw new Error(`Unknown AchievementNFT method: ${method}`)
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
  // Achievement Management
  // ============================================================================

  getCreateAchievementConfig(params: CreateAchievementParams) {
    const args = this.prepareAchievementParams('createAchievement', params)
    return this.getTransactionConfig('createAchievement', args)
  }

  getMintAchievementConfig(params: MintAchievementParams) {
    const args = this.prepareAchievementParams('mintAchievement', params)
    return this.getTransactionConfig('mintAchievement', args)
  }

  getBatchMintAchievementsConfig(params: BatchMintAchievementsParams) {
    const args = this.prepareAchievementParams('batchMintAchievements', params)
    return this.getTransactionConfig('batchMintAchievements', args)
  }

  getUpdateUserProgressConfig(params: UpdateUserProgressParams) {
    const args = this.prepareAchievementParams('updateUserProgress', params)
    return this.getTransactionConfig('updateUserProgress', args)
  }

  getIncrementUserProgressConfig(params: IncrementUserProgressParams) {
    const args = this.prepareAchievementParams('incrementUserProgress', params)
    return this.getTransactionConfig('incrementUserProgress', args)
  }

  getSetAchievementActiveConfig(achievementId: number, isActive: boolean) {
    return this.getTransactionConfig('setAchievementActive', [
      BigInt(achievementId),
      isActive
    ])
  }

  getUpdateAchievementMetadataConfig(
    achievementId: number,
    name: string,
    description: string,
    imageUrl: string
  ) {
    return this.getTransactionConfig('updateAchievementMetadata', [
      BigInt(achievementId),
      name,
      description,
      imageUrl
    ])
  }

  // ============================================================================
  // Read Functions
  // ============================================================================

  async getAchievementMetadata(
    achievementId: number
  ): Promise<AchievementMetadata> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const metadata = await this.contract.achievementMetadata(
        BigInt(achievementId)
      )
      return {
        achievementId: Number(metadata.achievementId),
        name: metadata.name,
        description: metadata.description,
        imageUrl: metadata.imageUrl,
        category: metadata.category,
        requiredProgress: Number(metadata.requiredProgress),
        xpReward: Number(metadata.xpReward),
        isActive: metadata.isActive,
        totalMinted: Number(metadata.totalMinted)
      }
    } catch (error) {
      throw error
    }
  }

  async getUserProgress(user: string, achievementId: number): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const progress = await this.contract.userProgress(
        user,
        BigInt(achievementId)
      )
      return Number(progress)
    } catch (error) {
      throw error
    }
  }

  async getUserAchievements(user: string): Promise<number[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const tokenIds = await this.contract.getUserAchievements(user)
      return tokenIds.map((id: bigint) => Number(id))
    } catch (error) {
      throw error
    }
  }

  async getAchievementsByCategory(
    category: AchievementCategory
  ): Promise<number[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const achievementIds =
        await this.contract.getAchievementsByCategory(category)
      return achievementIds.map((id: bigint) => Number(id))
    } catch (error) {
      throw error
    }
  }

  async getAllAchievements(): Promise<number[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const achievementIds = await this.contract.getAllAchievements()
      return achievementIds.map((id: bigint) => Number(id))
    } catch (error) {
      throw error
    }
  }

  async getActiveAchievements(): Promise<number[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const achievementIds = await this.contract.getActiveAchievements()
      return achievementIds.map((id: bigint) => Number(id))
    } catch (error) {
      throw error
    }
  }

  async tokenURI(tokenId: number): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.tokenURI(BigInt(tokenId))
    } catch (error) {
      throw error
    }
  }

  async ownerOf(tokenId: number): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.ownerOf(BigInt(tokenId))
    } catch (error) {
      throw error
    }
  }

  async balanceOf(owner: string): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const balance = await this.contract.balanceOf(owner)
      return Number(balance)
    } catch (error) {
      throw error
    }
  }

  async totalSupply(): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const supply = await this.contract.totalSupply()
      return Number(supply)
    } catch (error) {
      throw error
    }
  }

  async name(): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.name()
    } catch (error) {
      throw error
    }
  }

  async symbol(): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.symbol()
    } catch (error) {
      throw error
    }
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  async hasAchievement(user: string, achievementId: number): Promise<boolean> {
    try {
      const achievements = await this.getUserAchievements(user)
      const metadata = await Promise.all(
        achievements.map(async tokenId => {
          const uri = await this.tokenURI(tokenId)
          return { tokenId, achievementId: this.parseAchievementIdFromURI(uri) }
        })
      )
      return metadata.some(m => m.achievementId === achievementId)
    } catch (_error) {
      return false
    }
  }

  private parseAchievementIdFromURI(uri: string): number {
    try {
      const match = uri.match(/achievement\/(\d+)/)
      return match ? parseInt(match[1]) : 0
    } catch {
      return 0
    }
  }

  async canMintAchievement(
    user: string,
    achievementId: number
  ): Promise<boolean> {
    try {
      const metadata = await this.getAchievementMetadata(achievementId)
      if (!metadata.isActive) return false

      const progress = await this.getUserProgress(user, achievementId)
      if (progress < metadata.requiredProgress) return false

      const hasIt = await this.hasAchievement(user, achievementId)
      return !hasIt
    } catch (_error) {
      return false
    }
  }

  async getNextTokenId(): Promise<number> {
    try {
      const supply = await this.totalSupply()
      return supply + 1
    } catch (error) {
      throw error
    }
  }

  // ============================================================================
  // Admin Stats Functions
  // ============================================================================

  async getAchievementStats(): Promise<{
    totalMinted: number
    uniqueHolders: number
    totalAchievementTypes: number
  }> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      const stats = await this.contract.getAchievementStats()
      return {
        totalMinted: Number(stats[0]),
        uniqueHolders: Number(stats[1]),
        totalAchievementTypes: Number(stats[2])
      }
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

  async getOwner(): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.owner()
    } catch (error) {
      throw error
    }
  }

  async getBaseURI(): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized')
      }
      return await this.contract.baseURI()
    } catch (_error) {
      // Contract might not have baseURI function
      return ''
    }
  }

  // ============================================================================
  // Event Functions
  // ============================================================================

  decodeEventLog(log: { data: string; topics: readonly string[] }): any {
    return super.decodeEventLog(log)
  }

  async getAchievementEvents(
    eventName?: string,
    fromBlock: bigint | 'earliest' = 'earliest',
    toBlock: bigint | 'latest' = 'latest'
  ): Promise<any[]> {
    return super.getContractEvents(eventName, fromBlock, toBlock)
  }

  async getRecentMints(limit: number = 10): Promise<any[]> {
    try {
      const events = await this.getAchievementEvents('AchievementMinted')
      return events.slice(-limit).reverse()
    } catch (error) {
      throw error
    }
  }
}
