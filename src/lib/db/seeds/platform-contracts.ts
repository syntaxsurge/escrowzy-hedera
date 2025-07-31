import {
  getSupportedChainIds,
  getChainConfig,
  getSubscriptionManagerAddress,
  getEscrowCoreAddress,
  getAchievementNFTAddress
} from '@/lib/blockchain'

import { db } from '../drizzle'
import { platformContracts } from '../schema'

// Generate contract seeds from blockchain config
const contracts = getSupportedChainIds().flatMap(chainId => {
  const chainConfig = getChainConfig(chainId)
  if (!chainConfig) return []

  const contractSeeds = []

  // Add Subscription Manager if deployed
  const subscriptionAddress = getSubscriptionManagerAddress(chainId)
  if (subscriptionAddress) {
    contractSeeds.push({
      chainId,
      chainName: chainConfig.name,
      contractType: 'SUBSCRIPTION_MANAGER',
      contractAddress: subscriptionAddress,
      isActive: true
    })
  }

  // Add Escrow Core if deployed
  const escrowAddress = getEscrowCoreAddress(chainId)
  if (escrowAddress) {
    contractSeeds.push({
      chainId,
      chainName: chainConfig.name,
      contractType: 'ESCROW_CORE',
      contractAddress: escrowAddress,
      isActive: true
    })
  }

  // Add Achievement NFT if deployed
  const achievementAddress = getAchievementNFTAddress(chainId)
  if (achievementAddress) {
    contractSeeds.push({
      chainId,
      chainName: chainConfig.name,
      contractType: 'ACHIEVEMENT_NFT',
      contractAddress: achievementAddress,
      isActive: true
    })
  }

  return contractSeeds
})

export async function seedPlatformContracts() {
  console.log('Seeding platform contracts...')

  try {
    // Insert or update contracts
    for (const contract of contracts) {
      await db
        .insert(platformContracts)
        .values(contract)
        .onConflictDoUpdate({
          target: [platformContracts.chainId, platformContracts.contractType],
          set: {
            contractAddress: contract.contractAddress,
            isActive: contract.isActive
          }
        })
    }

    console.log('Platform contracts seeded successfully')
  } catch (error) {
    console.error('Error seeding platform contracts:', error)
    throw error
  }
}
