import { eq, and, gte, sql, or } from 'drizzle-orm'

import { db } from '../drizzle'
import { userGameData, trades, battles } from '../schema'

export interface Quest {
  id: string
  name: string
  description: string
  type: 'daily' | 'weekly' | 'special' | 'achievement'
  category: 'battle' | 'trade' | 'social' | 'general'
  xpReward: number
  requirements: {
    type: string
    target: number
    current: number
  }
  isCompleted: boolean
  isClaimable: boolean
  expiresAt?: string
  claimedAt?: string
}

export interface QuestProgress {
  questId: string
  userId: number
  progress: number
  completed: boolean
  claimedAt?: Date
}

/**
 * Get all available quests for a user with their progress
 */
export async function getUserQuests(
  userId: number,
  category?: string
): Promise<Quest[]> {
  // Get user's game data
  const [gameData] = await db
    .select()
    .from(userGameData)
    .where(eq(userGameData.userId, userId))
    .limit(1)

  const questProgress = (gameData?.questProgress as Record<string, any>) || {}

  // Get user's recent activity for dynamic quest progress
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Count today's battles
  const [todayBattles] = await db
    .select({ count: sql<number>`count(*)` })
    .from(battles)
    .where(
      and(
        or(eq(battles.player1Id, userId), eq(battles.player2Id, userId)),
        gte(battles.createdAt, todayStart)
      )
    )

  // Count this week's wins
  const [weekWins] = await db
    .select({ count: sql<number>`count(*)` })
    .from(battles)
    .where(and(eq(battles.winnerId, userId), gte(battles.createdAt, weekStart)))

  // Count trades
  const [totalTrades] = await db
    .select({ count: sql<number>`count(*)` })
    .from(trades)
    .where(or(eq(trades.buyerId, userId), eq(trades.sellerId, userId)))

  // Count completed trades this week
  const [weekTrades] = await db
    .select({ count: sql<number>`count(*)` })
    .from(trades)
    .where(
      and(
        or(eq(trades.buyerId, userId), eq(trades.sellerId, userId)),
        eq(trades.status, 'completed'),
        gte(trades.createdAt, weekStart)
      )
    )

  // Define available quests with real progress
  const allQuests: Quest[] = [
    {
      id: 'daily_battle_1',
      name: 'Daily Warrior',
      description: 'Participate in 3 battles today',
      type: 'daily',
      category: 'battle',
      xpReward: 100,
      requirements: {
        type: 'battles',
        target: 3,
        current: Number(todayBattles.count) || 0
      },
      isCompleted: questProgress['daily_battle_1']?.completed || false,
      isClaimable:
        Number(todayBattles.count) >= 3 &&
        !questProgress['daily_battle_1']?.claimed,
      expiresAt: new Date(
        todayStart.getTime() + 24 * 60 * 60 * 1000
      ).toISOString(),
      claimedAt: questProgress['daily_battle_1']?.claimedAt
    },
    {
      id: 'weekly_wins_1',
      name: 'Victory March',
      description: 'Win 10 battles this week',
      type: 'weekly',
      category: 'battle',
      xpReward: 500,
      requirements: {
        type: 'wins',
        target: 10,
        current: Number(weekWins.count) || 0
      },
      isCompleted: questProgress['weekly_wins_1']?.completed || false,
      isClaimable:
        Number(weekWins.count) >= 10 &&
        !questProgress['weekly_wins_1']?.claimed,
      expiresAt: new Date(
        weekStart.getTime() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      claimedAt: questProgress['weekly_wins_1']?.claimedAt
    },
    {
      id: 'weekly_trades_1',
      name: 'Master Trader',
      description: 'Complete 5 trades this week',
      type: 'weekly',
      category: 'trade',
      xpReward: 300,
      requirements: {
        type: 'trades',
        target: 5,
        current: Number(weekTrades.count) || 0
      },
      isCompleted: questProgress['weekly_trades_1']?.completed || false,
      isClaimable:
        Number(weekTrades.count) >= 5 &&
        !questProgress['weekly_trades_1']?.claimed,
      expiresAt: new Date(
        weekStart.getTime() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      claimedAt: questProgress['weekly_trades_1']?.claimedAt
    },
    {
      id: 'special_first_trade',
      name: 'First Blood',
      description: 'Complete your first trade',
      type: 'special',
      category: 'trade',
      xpReward: 250,
      requirements: {
        type: 'trades',
        target: 1,
        current: Number(totalTrades.count) || 0
      },
      isCompleted: questProgress['special_first_trade']?.completed || false,
      isClaimable:
        Number(totalTrades.count) >= 1 &&
        !questProgress['special_first_trade']?.claimed,
      claimedAt: questProgress['special_first_trade']?.claimedAt
    },
    {
      id: 'special_veteran',
      name: 'Veteran Trader',
      description: 'Complete 100 total trades',
      type: 'achievement',
      category: 'trade',
      xpReward: 2000,
      requirements: {
        type: 'trades',
        target: 100,
        current: Number(totalTrades.count) || 0
      },
      isCompleted: questProgress['special_veteran']?.completed || false,
      isClaimable:
        Number(totalTrades.count) >= 100 &&
        !questProgress['special_veteran']?.claimed,
      claimedAt: questProgress['special_veteran']?.claimedAt
    }
  ]

  // Filter by category if provided
  if (category) {
    return allQuests.filter(q => q.category === category)
  }

  return allQuests
}

/**
 * Claim quest reward
 */
export async function claimQuestReward(
  userId: number,
  questId: string
): Promise<{
  success: boolean
  xpEarned?: number
  message: string
}> {
  // Get user's current game data
  const [gameData] = await db
    .select()
    .from(userGameData)
    .where(eq(userGameData.userId, userId))
    .limit(1)

  if (!gameData) {
    // Create game data if it doesn't exist
    await db.insert(userGameData).values({
      userId,
      xp: 0,
      level: 1,
      combatPower: 100,
      loginStreak: 0,
      totalLogins: 0,
      achievements: {},
      questProgress: {},
      stats: {}
    })

    return {
      success: false,
      message: 'User game data not initialized'
    }
  }

  const questProgress = (gameData.questProgress as Record<string, any>) || {}

  // Check if quest is already claimed
  if (questProgress[questId]?.claimed) {
    return {
      success: false,
      message: 'Quest reward already claimed'
    }
  }

  // Get quest details
  const quests = await getUserQuests(userId)
  const quest = quests.find(q => q.id === questId)

  if (!quest) {
    return {
      success: false,
      message: 'Quest not found'
    }
  }

  if (!quest.isClaimable) {
    return {
      success: false,
      message: 'Quest requirements not met'
    }
  }

  // Update quest progress
  const updatedQuestProgress = {
    ...questProgress,
    [questId]: {
      completed: true,
      claimed: true,
      claimedAt: new Date().toISOString()
    }
  }

  // Calculate level up if needed
  const newXp = gameData.xp + quest.xpReward
  const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1
  const newCombatPower = 100 + (newLevel - 1) * 50

  // Update game data
  await db
    .update(userGameData)
    .set({
      xp: newXp,
      level: newLevel,
      combatPower: newCombatPower,
      questProgress: updatedQuestProgress,
      updatedAt: new Date()
    })
    .where(eq(userGameData.userId, userId))

  return {
    success: true,
    xpEarned: quest.xpReward,
    message: `Quest "${quest.name}" completed! Earned ${quest.xpReward} XP`
  }
}

/**
 * Get user's quest statistics
 */
export async function getUserQuestStats(userId: number): Promise<{
  totalQuests: number
  completedQuests: number
  totalXpEarned: number
  currentStreak: number
}> {
  const [gameData] = await db
    .select()
    .from(userGameData)
    .where(eq(userGameData.userId, userId))
    .limit(1)

  if (!gameData) {
    return {
      totalQuests: 0,
      completedQuests: 0,
      totalXpEarned: 0,
      currentStreak: 0
    }
  }

  const questProgress = (gameData.questProgress as Record<string, any>) || {}
  const completedQuests = Object.values(questProgress).filter(
    (q: any) => q.claimed
  ).length

  return {
    totalQuests: Object.keys(questProgress).length,
    completedQuests,
    totalXpEarned: gameData.xp,
    currentStreak: gameData.loginStreak
  }
}

/**
 * Reset daily quests (should be called by a cron job)
 */
export async function resetDailyQuests(): Promise<void> {
  const allUsers = await db.select().from(userGameData)

  for (const user of allUsers) {
    const questProgress = (user.questProgress as Record<string, any>) || {}

    // Reset daily quests
    Object.keys(questProgress).forEach(questId => {
      if (questId.startsWith('daily_')) {
        delete questProgress[questId]
      }
    })

    await db
      .update(userGameData)
      .set({ questProgress })
      .where(eq(userGameData.userId, user.userId))
  }
}

/**
 * Reset weekly quests (should be called by a cron job)
 */
export async function resetWeeklyQuests(): Promise<void> {
  const allUsers = await db.select().from(userGameData)

  for (const user of allUsers) {
    const questProgress = (user.questProgress as Record<string, any>) || {}

    // Reset weekly quests
    Object.keys(questProgress).forEach(questId => {
      if (questId.startsWith('weekly_')) {
        delete questProgress[questId]
      }
    })

    await db
      .update(userGameData)
      .set({ questProgress })
      .where(eq(userGameData.userId, user.userId))
  }
}
