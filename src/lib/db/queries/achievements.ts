import { eq, desc, and, sql } from 'drizzle-orm'
import { ZERO_ADDRESS } from 'thirdweb'

import { db } from '../drizzle'
import { achievementNFTs, userGameData, users } from '../schema'

export interface Achievement {
  id: string
  name: string
  description: string
  category: number
  rarity: number
  xpReward: number
  combatPowerReward: number
  exists: boolean
  active: boolean
  metadataURI: string
  totalMinted: number
  maxSupply: number | null
}

// Predefined achievements configuration
export const ACHIEVEMENT_DEFINITIONS: Record<string, Achievement> = {
  FIRST_TRADE: {
    id: 'FIRST_TRADE',
    name: 'First Trade',
    description: 'Complete your first trade on the platform',
    category: 0, // TRADING
    rarity: 0, // COMMON
    xpReward: 100,
    combatPowerReward: 10,
    exists: true,
    active: true,
    metadataURI:
      'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/first-trade.json',
    totalMinted: 0,
    maxSupply: null
  },
  TEN_TRADES: {
    id: 'TEN_TRADES',
    name: '10 Trades Completed',
    description: 'Complete 10 successful trades',
    category: 0, // TRADING
    rarity: 1, // UNCOMMON
    xpReward: 250,
    combatPowerReward: 25,
    exists: true,
    active: true,
    metadataURI: 'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/ten-trades.json',
    totalMinted: 0,
    maxSupply: null
  },
  HUNDRED_TRADES: {
    id: 'HUNDRED_TRADES',
    name: '100 Trades Master',
    description: 'Complete 100 successful trades',
    category: 0, // TRADING
    rarity: 2, // RARE
    xpReward: 500,
    combatPowerReward: 50,
    exists: true,
    active: true,
    metadataURI:
      'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/hundred-trades.json',
    totalMinted: 0,
    maxSupply: null
  },
  THOUSAND_TRADES: {
    id: 'THOUSAND_TRADES',
    name: 'Trading Legend',
    description: 'Complete 1000 successful trades',
    category: 0, // TRADING
    rarity: 4, // LEGENDARY
    xpReward: 2000,
    combatPowerReward: 200,
    exists: true,
    active: true,
    metadataURI:
      'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/thousand-trades.json',
    totalMinted: 0,
    maxSupply: 100
  },
  FIRST_BATTLE: {
    id: 'FIRST_BATTLE',
    name: 'First Battle',
    description: 'Participate in your first battle',
    category: 2, // BATTLE
    rarity: 0, // COMMON
    xpReward: 100,
    combatPowerReward: 10,
    exists: true,
    active: true,
    metadataURI:
      'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/first-battle.json',
    totalMinted: 0,
    maxSupply: null
  },
  FIRST_WIN: {
    id: 'FIRST_WIN',
    name: 'First Victory',
    description: 'Win your first battle',
    category: 2, // BATTLE
    rarity: 0, // COMMON
    xpReward: 150,
    combatPowerReward: 15,
    exists: true,
    active: true,
    metadataURI: 'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/first-win.json',
    totalMinted: 0,
    maxSupply: null
  },
  BATTLE_MASTER: {
    id: 'BATTLE_MASTER',
    name: 'Battle Master',
    description: 'Win 50 battles',
    category: 2, // BATTLE
    rarity: 3, // EPIC
    xpReward: 1000,
    combatPowerReward: 100,
    exists: true,
    active: true,
    metadataURI:
      'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/battle-master.json',
    totalMinted: 0,
    maxSupply: 50
  },
  DISPUTE_RESOLVER: {
    id: 'DISPUTE_RESOLVER',
    name: 'Dispute Resolver',
    description: 'Successfully resolve 10 disputes',
    category: 3, // COMMUNITY
    rarity: 2, // RARE
    xpReward: 400,
    combatPowerReward: 40,
    exists: true,
    active: true,
    metadataURI:
      'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/dispute-resolver.json',
    totalMinted: 0,
    maxSupply: null
  },
  TRUSTED_TRADER: {
    id: 'TRUSTED_TRADER',
    name: 'Trusted Trader',
    description: 'Maintain 5-star rating for 25+ trades',
    category: 0, // TRADING
    rarity: 2, // RARE
    xpReward: 300,
    combatPowerReward: 30,
    exists: true,
    active: true,
    metadataURI:
      'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/trusted-trader.json',
    totalMinted: 0,
    maxSupply: 200
  },
  EARLY_ADOPTER: {
    id: 'EARLY_ADOPTER',
    name: 'Early Adopter',
    description: 'Join the platform in the first month',
    category: 4, // SPECIAL
    rarity: 1, // UNCOMMON
    xpReward: 200,
    combatPowerReward: 20,
    exists: true,
    active: false, // No longer available
    metadataURI:
      'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/early-adopter.json',
    totalMinted: 0,
    maxSupply: 500
  }
}

/**
 * Get all achievements with their minted counts
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  // Get minted counts from database
  const mintedCounts = await db
    .select({
      achievementId: achievementNFTs.achievementId,
      count: sql<number>`count(*)`
    })
    .from(achievementNFTs)
    .groupBy(achievementNFTs.achievementId)

  // Create a map of minted counts
  const mintedMap = new Map<string, number>()
  mintedCounts.forEach(row => {
    mintedMap.set(row.achievementId, Number(row.count))
  })

  // Combine with achievement definitions
  const achievements = Object.values(ACHIEVEMENT_DEFINITIONS).map(
    achievement => ({
      ...achievement,
      totalMinted: mintedMap.get(achievement.id) || 0
    })
  )

  return achievements
}

/**
 * Get achievements for a specific user
 */
export async function getUserAchievements(userId: number): Promise<{
  owned: string[]
  achievements: Achievement[]
}> {
  // Get user's minted achievements
  const userAchievements = await db
    .select({
      achievementId: achievementNFTs.achievementId,
      tokenId: achievementNFTs.tokenId,
      mintedAt: achievementNFTs.mintedAt
    })
    .from(achievementNFTs)
    .where(eq(achievementNFTs.userId, userId))

  const ownedIds = userAchievements.map(a => a.achievementId)

  // Get all achievements with minted status
  const allAchievements = await getAllAchievements()

  return {
    owned: ownedIds,
    achievements: allAchievements
  }
}

/**
 * Record a new achievement mint in the database
 */
export async function recordAchievementMint(
  userId: number,
  achievementId: string,
  tokenId: number,
  txHash: string
): Promise<void> {
  await db
    .insert(achievementNFTs)
    .values({
      userId,
      achievementId,
      tokenId,
      txHash,
      mintedAt: new Date()
    })
    .onConflictDoNothing() // Prevent duplicate entries

  // Update user's game data if achievement grants XP
  const achievement = ACHIEVEMENT_DEFINITIONS[achievementId]
  if (achievement && achievement.xpReward > 0) {
    await db
      .update(userGameData)
      .set({
        xp: sql`${userGameData.xp} + ${achievement.xpReward}`,
        combatPower: sql`${userGameData.combatPower} + ${achievement.combatPowerReward}`,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))
  }
}

/**
 * Get achievement statistics for admin dashboard
 */
export async function getAchievementStats(): Promise<{
  totalMinted: number
  uniqueHolders: number
  totalAchievementTypes: number
  mostCommonAchievement: string | null
  recentMints: Array<{
    userId: number
    userWallet: string
    achievementId: string
    achievementName: string
    mintedAt: Date
  }>
}> {
  // Get total minted and unique holders
  const [statsResult] = await db
    .select({
      totalMinted: sql<number>`count(*)`,
      uniqueHolders: sql<number>`count(distinct user_id)`
    })
    .from(achievementNFTs)

  // Get most common achievement
  const [mostCommon] = await db
    .select({
      achievementId: achievementNFTs.achievementId,
      count: sql<number>`count(*)`
    })
    .from(achievementNFTs)
    .groupBy(achievementNFTs.achievementId)
    .orderBy(desc(sql`count(*)`))
    .limit(1)

  // Get recent mints with user info
  const recentMints = await db
    .select({
      userId: achievementNFTs.userId,
      userWallet: users.walletAddress,
      achievementId: achievementNFTs.achievementId,
      mintedAt: achievementNFTs.mintedAt
    })
    .from(achievementNFTs)
    .leftJoin(users, eq(users.id, achievementNFTs.userId))
    .orderBy(desc(achievementNFTs.mintedAt))
    .limit(10)

  return {
    totalMinted: Number(statsResult?.totalMinted || 0),
    uniqueHolders: Number(statsResult?.uniqueHolders || 0),
    totalAchievementTypes: Object.keys(ACHIEVEMENT_DEFINITIONS).length,
    mostCommonAchievement: mostCommon?.achievementId || null,
    recentMints: recentMints.map(mint => ({
      userId: mint.userId,
      userWallet: mint.userWallet || ZERO_ADDRESS,
      achievementId: mint.achievementId,
      achievementName:
        ACHIEVEMENT_DEFINITIONS[mint.achievementId]?.name || mint.achievementId,
      mintedAt: mint.mintedAt
    }))
  }
}

/**
 * Check if user has a specific achievement
 */
export async function userHasAchievement(
  userId: number,
  achievementId: string
): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(achievementNFTs)
    .where(
      and(
        eq(achievementNFTs.userId, userId),
        eq(achievementNFTs.achievementId, achievementId)
      )
    )

  return Number(result?.count || 0) > 0
}

/**
 * Get achievements by category
 */
export async function getAchievementsByCategory(
  category: number
): Promise<Achievement[]> {
  const allAchievements = await getAllAchievements()
  return allAchievements.filter(a => a.category === category)
}

/**
 * Get achievements by rarity
 */
export async function getAchievementsByRarity(
  rarity: number
): Promise<Achievement[]> {
  const allAchievements = await getAllAchievements()
  return allAchievements.filter(a => a.rarity === rarity)
}
