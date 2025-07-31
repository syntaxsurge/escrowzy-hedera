import { eq, and, sql, desc } from 'drizzle-orm'

import {
  ACHIEVEMENTS,
  LEVELS,
  DAILY_QUESTS,
  WEEKLY_QUESTS
} from '@/config/rewards'
import { db } from '@/lib/db/drizzle'
import { userGameData, achievementNFTs, users } from '@/lib/db/schema'
import type { UserGameData, AchievementNFT } from '@/lib/db/schema'

export class RewardsService {
  async getOrCreateGameData(userId: number): Promise<UserGameData> {
    const existing = await db
      .select()
      .from(userGameData)
      .where(eq(userGameData.userId, userId))
      .limit(1)

    if (existing.length > 0) {
      return existing[0]
    }

    // Use onConflictDoNothing to handle race conditions
    const newGameData = await db
      .insert(userGameData)
      .values({ userId })
      .onConflictDoNothing({ target: userGameData.userId })
      .returning()

    // If nothing was returned (conflict occurred), fetch the existing record
    if (newGameData.length === 0) {
      const existingAfterConflict = await db
        .select()
        .from(userGameData)
        .where(eq(userGameData.userId, userId))
        .limit(1)

      if (existingAfterConflict.length > 0) {
        return existingAfterConflict[0]
      }

      // This should rarely happen, but handle it gracefully
      throw new Error(
        `Failed to create or retrieve game data for user ${userId}`
      )
    }

    await this.checkAchievement(userId, 'first_login')

    return newGameData[0]
  }

  async handleDailyLogin(userId: number) {
    const gameData = await this.getOrCreateGameData(userId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastLogin = gameData.lastLoginDate
      ? new Date(gameData.lastLoginDate)
      : null
    if (lastLogin) {
      lastLogin.setHours(0, 0, 0, 0)
    }

    if (lastLogin?.getTime() === today.getTime()) {
      return gameData
    }

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const newStreak =
      lastLogin?.getTime() === yesterday.getTime()
        ? gameData.loginStreak + 1
        : 1

    let xpGained = DAILY_QUESTS.DAILY_LOGIN.xpReward
    let cpGained = 5 // Daily login CP reward
    const updates: Partial<UserGameData> = {
      loginStreak: newStreak,
      lastLoginDate: today,
      totalLogins: gameData.totalLogins + 1,
      xp: gameData.xp + xpGained,
      combatPower: gameData.combatPower + cpGained
    }

    const newAchievements: string[] = []

    if (newStreak === 7) {
      newAchievements.push('week_streak')
      cpGained += 50 // Weekly streak bonus
      updates.combatPower = gameData.combatPower + cpGained
    }
    if (newStreak === 30) {
      newAchievements.push('month_streak')
    }
    if (newStreak === 365) {
      newAchievements.push('year_streak')
    }

    for (const achievementId of newAchievements) {
      await this.checkAchievement(userId, achievementId)
    }

    const questProgress = (gameData.questProgress as Record<string, any>) || {}
    questProgress.daily_login = {
      ...DAILY_QUESTS.DAILY_LOGIN.progress,
      current: 1,
      completedAt: new Date().toISOString()
    }
    updates.questProgress = questProgress

    updates.level = this.calculateLevel(updates.xp!)

    const [updatedData] = await db
      .update(userGameData)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))
      .returning()

    return { ...updatedData, newAchievements }
  }

  calculateLevel(xp: number): number {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].minXP) {
        return LEVELS[i].level
      }
    }
    return 1
  }

  getLevelInfo(level: number) {
    return LEVELS[level - 1] || LEVELS[0]
  }

  async addXP(userId: number, amount: number, _reason?: string) {
    const gameData = await this.getOrCreateGameData(userId)
    const newXP = gameData.xp + amount
    const newLevel = this.calculateLevel(newXP)

    const leveledUp = newLevel > gameData.level

    const [updated] = await db
      .update(userGameData)
      .set({
        xp: newXP,
        level: newLevel,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))
      .returning()

    if (leveledUp) {
      await this.handleLevelUp(userId, gameData.level, newLevel)
    }

    return { ...updated, leveledUp, xpGained: amount }
  }

  async handleLevelUp(userId: number, oldLevel: number, newLevel: number) {
    const milestones = [5, 10, 20, 30, 50, 75, 100]

    for (const milestone of milestones) {
      if (oldLevel < milestone && newLevel >= milestone) {
        await this.recordMilestone(userId, `level_${milestone}`)
      }
    }
  }

  async checkAchievement(userId: number, achievementId: string) {
    const gameData = await this.getOrCreateGameData(userId)
    const achievements = (gameData.achievements as Record<string, any>) || {}

    if (achievements[achievementId]) {
      return false
    }

    const achievement = Object.values(ACHIEVEMENTS).find(
      a => a.id === achievementId
    )
    if (!achievement) {
      return false
    }

    achievements[achievementId] = {
      unlockedAt: new Date().toISOString(),
      xpRewarded: achievement.xpReward
    }

    await db
      .update(userGameData)
      .set({
        achievements,
        xp: gameData.xp + achievement.xpReward,
        level: this.calculateLevel(gameData.xp + achievement.xpReward),
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))

    if (achievement.nftEligible) {
      await this.queueNFTMint(userId, achievementId)
    }

    return true
  }

  async queueNFTMint(userId: number, achievementId: string) {
    const existing = await db
      .select()
      .from(achievementNFTs)
      .where(
        and(
          eq(achievementNFTs.userId, userId),
          eq(achievementNFTs.achievementId, achievementId)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return existing[0]
    }

    const [nft] = await db
      .insert(achievementNFTs)
      .values({
        userId,
        achievementId
      })
      .returning()

    return nft
  }

  async mintAchievementNFT(
    userId: number,
    achievementId: string,
    tokenId: number,
    txHash: string
  ) {
    const [updated] = await db
      .update(achievementNFTs)
      .set({
        tokenId,
        txHash,
        mintedAt: new Date()
      })
      .where(
        and(
          eq(achievementNFTs.userId, userId),
          eq(achievementNFTs.achievementId, achievementId)
        )
      )
      .returning()

    return updated
  }

  async getUserAchievements(userId: number) {
    const gameData = await this.getOrCreateGameData(userId)
    const achievements = (gameData.achievements as Record<string, any>) || {}

    const nfts = await db
      .select()
      .from(achievementNFTs)
      .where(eq(achievementNFTs.userId, userId))

    const nftMap = nfts.reduce(
      (acc: Record<string, AchievementNFT>, nft: AchievementNFT) => {
        acc[nft.achievementId] = nft
        return acc
      },
      {} as Record<string, AchievementNFT>
    )

    return Object.entries(ACHIEVEMENTS).map(([_key, achievement]) => ({
      ...achievement,
      unlocked: !!achievements[achievement.id],
      unlockedAt: achievements[achievement.id]?.unlockedAt,
      nft: nftMap[achievement.id] || null
    }))
  }

  async getQuestProgress(userId: number) {
    const gameData = await this.getOrCreateGameData(userId)
    const progress = (gameData.questProgress as Record<string, any>) || {}

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dailyQuests = Object.entries(DAILY_QUESTS).map(([_key, quest]) => {
      const questProgress = progress[quest.id] || quest.progress
      const completedToday =
        questProgress.completedAt &&
        new Date(questProgress.completedAt).toDateString() ===
          today.toDateString()

      return {
        ...quest,
        progress: completedToday ? questProgress : quest.progress,
        completed:
          completedToday && questProgress.current >= questProgress.required
      }
    })

    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())

    const weeklyQuests = Object.entries(WEEKLY_QUESTS).map(([_key, quest]) => {
      const questProgress = progress[quest.id] || quest.progress
      const completedThisWeek =
        questProgress.completedAt &&
        new Date(questProgress.completedAt) >= weekStart

      return {
        ...quest,
        progress: completedThisWeek ? questProgress : quest.progress,
        completed:
          completedThisWeek && questProgress.current >= questProgress.required
      }
    })

    return { dailyQuests, weeklyQuests }
  }

  async updateQuestProgress(
    userId: number,
    questId: string,
    increment: number = 1
  ) {
    const gameData = await this.getOrCreateGameData(userId)
    const progress = (gameData.questProgress as Record<string, any>) || {}

    const quest = { ...DAILY_QUESTS, ...WEEKLY_QUESTS }[
      questId as keyof typeof DAILY_QUESTS | keyof typeof WEEKLY_QUESTS
    ]
    if (!quest) return

    const currentProgress = progress[questId] || quest.progress
    currentProgress.current = Math.min(
      currentProgress.current + increment,
      currentProgress.required
    )

    if (
      currentProgress.current >= currentProgress.required &&
      !currentProgress.completedAt
    ) {
      currentProgress.completedAt = new Date().toISOString()
      await this.addXP(userId, quest.xpReward, `Completed quest: ${quest.name}`)
    }

    progress[questId] = currentProgress

    await db
      .update(userGameData)
      .set({
        questProgress: progress,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))
  }

  async getLeaderboard(
    period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time',
    limit: number = 10
  ) {
    let dateFilter = sql`1=1`

    const now = new Date()
    if (period === 'daily') {
      const today = new Date(now.setHours(0, 0, 0, 0))
      dateFilter = sql`${userGameData.updatedAt} >= ${today}`
    } else if (period === 'weekly') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7))
      dateFilter = sql`${userGameData.updatedAt} >= ${weekAgo}`
    } else if (period === 'monthly') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1))
      dateFilter = sql`${userGameData.updatedAt} >= ${monthAgo}`
    }

    const leaderboard = await db
      .select({
        userId: userGameData.userId,
        xp: userGameData.xp,
        level: userGameData.level,
        loginStreak: userGameData.loginStreak,
        userName: users.name,
        walletAddress: users.walletAddress,
        avatarPath: users.avatarPath
      })
      .from(userGameData)
      .leftJoin(users, eq(userGameData.userId, users.id))
      .where(dateFilter)
      .orderBy(desc(userGameData.xp))
      .limit(limit)

    return leaderboard.map((entry: any, index: number) => ({
      ...entry,
      rank: index + 1,
      levelInfo: this.getLevelInfo(entry.level)
    }))
  }

  async getUserRank(userId: number) {
    const userGame = await this.getOrCreateGameData(userId)

    const higherRanked = await db
      .select({ count: sql<number>`count(*)` })
      .from(userGameData)
      .where(sql`${userGameData.xp} > ${userGame.xp}`)

    return higherRanked[0].count + 1
  }

  async getUserStats(userId: number) {
    const gameData = await this.getOrCreateGameData(userId)
    const achievements = await this.getUserAchievements(userId)
    const quests = await this.getQuestProgress(userId)
    const rank = await this.getUserRank(userId)

    const unlockedAchievements = achievements.filter(a => a.unlocked)
    const totalXPFromAchievements = unlockedAchievements.reduce(
      (sum, a) => sum + a.xpReward,
      0
    )

    return {
      gameData,
      levelInfo: this.getLevelInfo(gameData.level),
      achievements: {
        total: achievements.length,
        unlocked: unlockedAchievements.length,
        percentage: Math.round(
          (unlockedAchievements.length / achievements.length) * 100
        ),
        totalXP: totalXPFromAchievements
      },
      quests: {
        daily: {
          total: quests.dailyQuests.length,
          completed: quests.dailyQuests.filter(q => q.completed).length
        },
        weekly: {
          total: quests.weeklyQuests.length,
          completed: quests.weeklyQuests.filter(q => q.completed).length
        }
      },
      rank,
      nextLevelXP: gameData.level < 100 ? LEVELS[gameData.level].minXP : null,
      xpToNextLevel:
        gameData.level < 100 ? LEVELS[gameData.level].minXP - gameData.xp : 0
    }
  }

  async handleTeamJoin(userId: number) {
    await this.checkAchievement(userId, 'first_team')
    await this.addXP(userId, 100, 'Joined a team')
  }

  async handleMessageSent(userId: number) {
    const gameData = await this.getOrCreateGameData(userId)
    const stats = (gameData.stats as Record<string, any>) || {}

    const messageCount = (stats.totalMessages || 0) + 1
    stats.totalMessages = messageCount

    await db
      .update(userGameData)
      .set({
        stats,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))

    if (messageCount === 1) {
      await this.checkAchievement(userId, 'first_message')
    }
    if (messageCount === 100) {
      await this.checkAchievement(userId, 'social_butterfly')
    }

    await this.updateQuestProgress(userId, 'send_messages', 1)
    await this.updateQuestProgress(userId, 'social_week', 1)
  }

  async handleProfileComplete(userId: number) {
    await this.checkAchievement(userId, 'profile_complete')
    await this.addXP(userId, 50, 'Profile completed')
  }

  async handleWalletConnected(userId: number) {
    await this.checkAchievement(userId, 'wallet_connected')
    await this.addXP(userId, 50, 'Wallet connected')
  }

  async handleSubscriptionActivated(userId: number) {
    await this.checkAchievement(userId, 'first_subscription')
    await this.addXP(userId, 200, 'Subscription activated')
  }

  async handleTeamOwnership(userId: number) {
    await this.checkAchievement(userId, 'team_leader')
    await this.addXP(userId, 150, 'Became team owner')
  }

  private async recordMilestone(userId: number, milestone: string) {
    const gameData = await this.getOrCreateGameData(userId)
    const stats = (gameData.stats as Record<string, any>) || {}

    if (!stats.milestones) {
      stats.milestones = []
    }

    stats.milestones.push({
      type: milestone,
      achievedAt: new Date().toISOString()
    })

    await db
      .update(userGameData)
      .set({
        stats,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))
  }

  /**
   * Update user's combat power
   */
  async updateCombatPower(userId: number, amount: number, reason?: string) {
    const { MIN_COMBAT_POWER } = await import('@/config/battle.config').then(
      m => m.BATTLE_CONFIG
    )
    const gameData = await this.getOrCreateGameData(userId)
    const newCombatPower = Math.max(
      MIN_COMBAT_POWER,
      gameData.combatPower + amount
    )

    const [updated] = await db
      .update(userGameData)
      .set({
        combatPower: newCombatPower,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))
      .returning()

    // Record combat power history in stats
    const stats = (gameData.stats as Record<string, any>) || {}
    if (!stats.combatPowerHistory) {
      stats.combatPowerHistory = []
    }
    stats.combatPowerHistory.push({
      amount,
      reason: reason || 'Unknown',
      newTotal: newCombatPower,
      timestamp: new Date().toISOString()
    })

    await db
      .update(userGameData)
      .set({
        stats,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))

    return updated
  }

  /**
   * Handle trade completion and award combat power
   */
  async handleTradeComplete(
    userId: number,
    tradeAmount: number,
    rating?: number,
    completionTimeMinutes?: number
  ) {
    const CP_REWARDS = {
      COMPLETE_TRADE: 10,
      LARGE_TRADE: 25, // >$1000
      PERFECT_RATING: 15, // 5-star review
      FAST_COMPLETION: 20 // <1 hour
    }

    let totalCP = CP_REWARDS.COMPLETE_TRADE

    // Large trade bonus
    if (tradeAmount > 1000) {
      totalCP += CP_REWARDS.LARGE_TRADE
      await this.checkAchievement(userId, 'whale_trader')
    }

    // Perfect rating bonus
    if (rating === 5) {
      totalCP += CP_REWARDS.PERFECT_RATING
    }

    // Fast completion bonus
    if (completionTimeMinutes && completionTimeMinutes < 60) {
      totalCP += CP_REWARDS.FAST_COMPLETION
      await this.checkAchievement(userId, 'speed_trader')
    }

    await this.updateCombatPower(userId, totalCP, 'Trade completion')
    await this.addXP(userId, 50, 'Trade completed')
    await this.updateQuestProgress(userId, 'complete_trades', 1)

    // Update trading stats
    const gameData = await this.getOrCreateGameData(userId)
    const stats = (gameData.stats as Record<string, any>) || {}
    stats.totalTrades = (stats.totalTrades || 0) + 1
    stats.totalVolume = (stats.totalVolume || 0) + tradeAmount

    await db
      .update(userGameData)
      .set({
        stats,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))

    // Check trade-related achievements
    if (stats.totalTrades === 1) {
      await this.checkAchievement(userId, 'first_trade')
    }
    if (stats.totalTrades === 10) {
      await this.checkAchievement(userId, 'trader_veteran')
    }
    if (stats.totalTrades === 100) {
      await this.checkAchievement(userId, 'trade_master')
    }
  }

  /**
   * Handle battle win and update combat power
   */
  async handleBattleWin(userId: number, _opponentCP: number) {
    const { WINNER_CP_GAIN, WINNER_XP_BONUS } = await import(
      '@/config/battle.config'
    ).then(m => m.BATTLE_CONFIG)

    const gameData = await this.getOrCreateGameData(userId)

    // Award combat power for winning
    const cpGained = await this.updateCombatPower(
      userId,
      WINNER_CP_GAIN,
      'Battle victory'
    )
    await this.addXP(userId, WINNER_XP_BONUS, 'Battle won')

    // Update battle stats
    const stats = (gameData.stats as Record<string, any>) || {}
    stats.battleWins = (stats.battleWins || 0) + 1
    stats.battleStreak = (stats.battleStreak || 0) + 1

    await db
      .update(userGameData)
      .set({
        stats,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))

    // Check battle achievements
    if (stats.battleWins === 1) {
      await this.checkAchievement(userId, 'first_battle')
    }
    if (stats.battleWins === 10) {
      await this.checkAchievement(userId, 'arena_veteran')
    }
    if (stats.battleStreak === 5) {
      await this.checkAchievement(userId, 'win_streak')
    }

    // Return the CP gain for display
    return { cpGained: WINNER_CP_GAIN, newCP: cpGained.combatPower }
  }

  /**
   * Handle battle loss and give consolation XP
   */
  async handleBattleLoss(userId: number) {
    const { LOSER_CP_LOSS, LOSER_XP_BONUS, MIN_COMBAT_POWER } = await import(
      '@/config/battle.config'
    ).then(m => m.BATTLE_CONFIG)

    // Get current combat power
    const gameData = await this.getOrCreateGameData(userId)

    // Calculate new CP (ensure it doesn't go below minimum)
    const currentCP = gameData.combatPower
    const newCP = Math.max(MIN_COMBAT_POWER, currentCP - LOSER_CP_LOSS)
    const actualCPLoss = currentCP - newCP

    // Update combat power (with protection for minimum)
    let updated = gameData
    if (actualCPLoss > 0) {
      updated = await this.updateCombatPower(
        userId,
        -actualCPLoss,
        'Battle defeat'
      )
    }

    await this.addXP(userId, LOSER_XP_BONUS, 'Battle participation')

    // Reset win streak
    const stats = (gameData.stats as Record<string, any>) || {}
    stats.battleLosses = (stats.battleLosses || 0) + 1
    stats.battleStreak = 0

    await db
      .update(userGameData)
      .set({
        stats,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))

    // Return the CP loss for display
    return { cpLost: actualCPLoss, newCP: updated.combatPower }
  }

  /**
   * Handle dispute win
   */
  async handleDisputeWin(userId: number) {
    const CP_REWARD = 30

    await this.updateCombatPower(userId, CP_REWARD, 'Dispute won')
    await this.addXP(userId, 50, 'Dispute won')

    const gameData = await this.getOrCreateGameData(userId)
    const stats = (gameData.stats as Record<string, any>) || {}
    stats.disputesWon = (stats.disputesWon || 0) + 1

    await db
      .update(userGameData)
      .set({
        stats,
        updatedAt: new Date()
      })
      .where(eq(userGameData.userId, userId))

    if (stats.disputesWon === 1) {
      await this.checkAchievement(userId, 'dispute_resolver')
    }
  }

  /**
   * Handle weekly streak bonus
   */
  async handleWeeklyStreak(userId: number) {
    const CP_REWARD = 50

    await this.updateCombatPower(userId, CP_REWARD, 'Weekly login streak')
    await this.addXP(userId, 100, 'Weekly streak bonus')
  }

  /**
   * Get user's combat power
   */
  async getCombatPower(userId: number): Promise<number> {
    const gameData = await this.getOrCreateGameData(userId)
    return gameData.combatPower
  }
}

export const rewardsService = new RewardsService()
