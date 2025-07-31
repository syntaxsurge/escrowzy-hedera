import { and, desc, eq, gte, lte, or, sql } from 'drizzle-orm'

import { BATTLE_CONFIG } from '@/config/battle.config'
import { battleConstants } from '@/config/business-constants'
import { db } from '@/lib/db/drizzle'
import {
  addToQueue,
  findMatchesInQueue,
  removeFromQueue,
  cleanupExpiredQueueEntries,
  updateQueuePositions
} from '@/lib/db/queries/battles'
import {
  battles,
  battleStates,
  battleRounds,
  userGameData,
  userSubscriptions,
  battleInvitations,
  battleSessionRejections
} from '@/lib/db/schema'
import { broadcastQueueUpdate, broadcastBattleStats } from '@/lib/pusher-server'
import { dispatch } from '@/lib/queue/manager'
import type {
  Battle,
  BattleDiscount,
  BattleHistory,
  BattleMatchmakingParams,
  BattleResult,
  BattleStats,
  DailyBattleLimit,
  NewBattle
} from '@/types/battle'

/**
 * Get user's current active battle discount
 */
export async function getActiveDiscount(
  userId: number
): Promise<BattleDiscount | null> {
  try {
    const now = new Date()

    const [activeDiscount] = await db
      .select({
        userId: battles.winnerId,
        discountPercent: battles.feeDiscountPercent,
        expiresAt: battles.discountExpiresAt,
        battleId: battles.id
      })
      .from(battles)
      .where(
        and(eq(battles.winnerId, userId), gte(battles.discountExpiresAt, now))
      )
      .orderBy(desc(battles.createdAt))
      .limit(1)

    if (
      !activeDiscount ||
      !activeDiscount.discountPercent ||
      !activeDiscount.expiresAt
    ) {
      return null
    }

    return {
      userId: activeDiscount.userId!,
      discountPercent: activeDiscount.discountPercent,
      expiresAt: activeDiscount.expiresAt,
      battleId: activeDiscount.battleId
    }
  } catch (error) {
    console.error('Error getting active discount:', error)
    throw error
  }
}

/**
 * Get user's daily battle limit based on subscription
 */
export async function getDailyBattleLimit(
  userId: number
): Promise<DailyBattleLimit> {
  try {
    // Get user's subscription
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.isActive, true)
        )
      )
      .limit(1)

    // Determine max battles based on plan
    let maxBattles: number = BATTLE_CONFIG.FREE_TIER_DAILY_LIMIT
    if (subscription) {
      if (subscription.planId === 'pro') {
        maxBattles = BATTLE_CONFIG.PRO_TIER_DAILY_LIMIT
      } else if (subscription.planId === 'enterprise') {
        maxBattles = BATTLE_CONFIG.ENTERPRISE_TIER_DAILY_LIMIT as number
      }
    }

    // Count today's battles
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todaysBattles = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(battles)
      .where(
        and(
          or(eq(battles.player1Id, userId), eq(battles.player2Id, userId)),
          gte(battles.createdAt, today)
        )
      )

    const battlesUsed = todaysBattles[0]?.count || 0

    // Calculate reset time (next midnight)
    const resetsAt = new Date(today)
    resetsAt.setDate(resetsAt.getDate() + 1)

    return {
      userId,
      battlesUsed,
      maxBattles,
      resetsAt
    }
  } catch (error) {
    console.error('Error getting daily battle limit:', error)
    throw error
  }
}

/**
 * Find a suitable opponent for matchmaking
 */
export async function findMatch(
  params: BattleMatchmakingParams
): Promise<{ userId: number; combatPower: number } | null> {
  const {
    userId,
    combatPower,
    matchRange = BATTLE_CONFIG.DEFAULT_MATCH_RANGE
  } = params

  try {
    // First, clean up any expired queue entries
    await cleanupExpiredQueueEntries()

    // Check if there are compatible opponents already in queue
    const queueMatches = await findMatchesInQueue(
      userId,
      combatPower,
      matchRange
    )

    if (queueMatches.length > 0) {
      const match = queueMatches[0]

      try {
        // Send battle invitation instead of immediate match
        await sendBattleInvitation(
          userId,
          match.userId,
          combatPower,
          match.combatPower
        )

        // Remove both from queue after invitation sent
        await removeFromQueue(userId)
        await removeFromQueue(match.userId)

        // Broadcast queue updates for both users
        await broadcastQueueUpdate(userId, 'matched')
        await broadcastQueueUpdate(match.userId, 'matched')
        await broadcastBattleStats()

        return {
          userId: match.userId,
          combatPower: match.combatPower
        }
      } catch (inviteError) {
        // If invitation fails (e.g., due to constraint), continue to queue
        console.error('Error sending invitation in findMatch:', inviteError)
        // Continue to add user to queue below
      }
    }

    // No match found in queue, add current user to queue
    await addToQueue(userId, combatPower, matchRange)

    // Calculate queue position and estimated wait time
    await updateQueuePositions()

    // Broadcast queue update
    await broadcastQueueUpdate(userId, 'joined')
    await broadcastBattleStats()

    // No match found - user stays in queue waiting for real players
    return null
  } catch (error) {
    console.error('Error finding match:', error)
    // Clean up on error
    await removeFromQueue(userId)
    throw error
  }
}

/**
 * Create a new battle between two players (initializes but doesn't determine winner yet)
 */
export async function createBattle(
  player1Id: number,
  player2Id: number
): Promise<BattleResult> {
  try {
    // Get both players' combat power
    const [player1Data, player2Data] = await Promise.all([
      db
        .select({ combatPower: userGameData.combatPower })
        .from(userGameData)
        .where(eq(userGameData.userId, player1Id))
        .limit(1),
      db
        .select({ combatPower: userGameData.combatPower })
        .from(userGameData)
        .where(eq(userGameData.userId, player2Id))
        .limit(1)
    ])

    if (!player1Data[0] || !player2Data[0]) {
      throw new Error('Player game data not found')
    }

    const player1CP = player1Data[0].combatPower
    const player2CP = player2Data[0].combatPower

    // Create battle record with 'preparing' status
    const newBattle: NewBattle = {
      player1Id,
      player2Id,
      player1CP,
      player2CP,
      status: 'preparing',
      winnerId: null,
      feeDiscountPercent: BATTLE_CONFIG.WINNER_DISCOUNT_PERCENT,
      discountExpiresAt: null,
      winnerXP: 50,
      loserXP: 10
    }

    const [createdBattle] = await db
      .insert(battles)
      .values(newBattle)
      .returning()

    // Create battle state for tracking progress
    await db.insert(battleStates).values({
      battleId: createdBattle.id,
      currentRound: 0,
      player1Actions: [],
      player2Actions: [],
      battleLog: []
    })

    // Queue the first battle round to start after countdown
    await dispatch(
      'battle.round',
      {
        battleId: createdBattle.id,
        roundNumber: 1
      },
      {
        delay: battleConstants.COUNTDOWN_DELAY // Start after countdown
      }
    )

    // Return initial battle result (no winner yet)
    return {
      id: createdBattle.id,
      winnerId: null,
      loserId: null,
      winnerCP: 0,
      loserCP: 0,
      player1CP,
      player2CP,
      feeDiscountPercent: BATTLE_CONFIG.WINNER_DISCOUNT_PERCENT,
      discountExpiresAt: null,
      winnerXP: 50,
      loserXP: 10
    }
  } catch (error) {
    console.error('Error creating battle:', error)
    throw error
  }
}

/**
 * Get battle rounds for a specific battle
 */
export async function getBattleRounds(battleId: number) {
  try {
    const rounds = await db
      .select()
      .from(battleRounds)
      .where(eq(battleRounds.battleId, battleId))
      .orderBy(battleRounds.roundNumber)

    return rounds
  } catch (error) {
    console.error('Error getting battle rounds:', error)
    return []
  }
}

/**
 * Get current battle state for a battle
 */
export async function getBattleState(battleId: number) {
  try {
    const [battleState] = await db
      .select()
      .from(battleStates)
      .where(eq(battleStates.battleId, battleId))
      .limit(1)

    return battleState
  } catch (error) {
    console.error('Error getting battle state:', error)
    return null
  }
}

/**
 * Get user's battle history with stats
 */
export async function getBattleHistory(
  userId: number,
  limit = 20,
  offset = 0
): Promise<BattleHistory> {
  try {
    // Get battles
    const userBattles = await db
      .select()
      .from(battles)
      .where(or(eq(battles.player1Id, userId), eq(battles.player2Id, userId)))
      .orderBy(desc(battles.createdAt))
      .limit(limit)
      .offset(offset)

    // Calculate stats
    const wins = userBattles.filter((b: Battle) => b.winnerId === userId).length
    const losses = userBattles.filter(
      (b: Battle) =>
        b.winnerId !== userId &&
        (b.player1Id === userId || b.player2Id === userId)
    ).length
    const totalBattles = wins + losses
    const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0

    // Calculate streaks
    let currentStreak = 0
    let bestStreak = 0
    let tempStreak = 0

    for (const battle of userBattles) {
      if (battle.winnerId === userId) {
        tempStreak++
        currentStreak = tempStreak
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    return {
      battles: userBattles,
      totalBattles,
      wins,
      losses,
      winRate,
      currentStreak,
      bestStreak
    }
  } catch (error) {
    console.error('Error getting battle history:', error)
    throw error
  }
}

/**
 * Get battle statistics for a user
 */
export async function getBattleStats(userId: number): Promise<BattleStats> {
  try {
    const userBattles = await db
      .select()
      .from(battles)
      .where(or(eq(battles.player1Id, userId), eq(battles.player2Id, userId)))

    const wins = userBattles.filter((b: Battle) => b.winnerId === userId).length
    const losses = userBattles.filter(
      (b: Battle) =>
        b.winnerId !== userId &&
        (b.player1Id === userId || b.player2Id === userId)
    ).length
    const totalBattles = wins + losses
    const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0

    // Calculate average CP from recent battles
    const recentBattles = userBattles.slice(0, 10)
    const cpValues = recentBattles.map((b: Battle) =>
      b.player1Id === userId ? b.player1CP : b.player2CP
    )
    const averageCP =
      cpValues.length > 0
        ? cpValues.reduce((sum: number, cp: number) => sum + cp, 0) /
          cpValues.length
        : 100

    // Count total discounts earned
    const totalDiscountsEarned = wins

    // Get active discount
    const activeDiscount = await getActiveDiscount(userId)

    return {
      totalBattles,
      wins,
      losses,
      winRate,
      averageCP,
      totalDiscountsEarned,
      activeDiscount: activeDiscount || undefined
    }
  } catch (error) {
    console.error('Error getting battle stats:', error)
    throw error
  }
}

/**
 * Check if user can battle today
 */
export async function canBattleToday(userId: number): Promise<boolean> {
  try {
    const limit = await getDailyBattleLimit(userId)
    return limit.battlesUsed < limit.maxBattles
  } catch (error) {
    console.error('Error checking battle eligibility:', error)
    return false
  }
}

/**
 * Send a battle invitation
 */
export async function sendBattleInvitation(
  fromUserId: number,
  toUserId: number,
  fromUserCP: number,
  toUserCP: number
): Promise<number> {
  try {
    // First, clean up any expired invitations to prevent constraint issues
    await db
      .delete(battleInvitations)
      .where(
        and(
          or(
            and(
              eq(battleInvitations.fromUserId, fromUserId),
              eq(battleInvitations.toUserId, toUserId)
            ),
            and(
              eq(battleInvitations.fromUserId, toUserId),
              eq(battleInvitations.toUserId, fromUserId)
            )
          ),
          eq(battleInvitations.status, 'pending'),
          lte(battleInvitations.expiresAt, new Date())
        )
      )

    // Check for existing pending invitation in both directions
    const existingInvites = await db
      .select()
      .from(battleInvitations)
      .where(
        and(
          or(
            // Check for invitation from current user to target
            and(
              eq(battleInvitations.fromUserId, fromUserId),
              eq(battleInvitations.toUserId, toUserId)
            ),
            // Check for invitation from target to current user
            and(
              eq(battleInvitations.fromUserId, toUserId),
              eq(battleInvitations.toUserId, fromUserId)
            )
          ),
          eq(battleInvitations.status, 'pending'),
          gte(battleInvitations.expiresAt, new Date())
        )
      )
      .limit(1)

    if (existingInvites.length > 0) {
      const existingInvite = existingInvites[0]

      // If there's already an invitation from the target user to us,
      // we should accept it instead of creating a new one
      if (
        existingInvite.fromUserId === toUserId &&
        existingInvite.toUserId === fromUserId
      ) {
        // Accept the existing invitation automatically
        await db
          .update(battleInvitations)
          .set({
            status: 'accepted',
            respondedAt: new Date()
          })
          .where(eq(battleInvitations.id, existingInvite.id))

        // Create the battle
        await createBattle(existingInvite.fromUserId, existingInvite.toUserId)

        return existingInvite.id
      }

      // If it's our own invitation, just return it
      return existingInvite.id
    }

    // Create new invitation with 30 second expiry
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + 30)

    const [invitation] = await db
      .insert(battleInvitations)
      .values({
        fromUserId,
        toUserId,
        fromUserCP,
        toUserCP,
        status: 'pending',
        expiresAt
      })
      .returning()

    return invitation.id
  } catch (error) {
    console.error('Error sending battle invitation:', error)
    throw error
  }
}

/**
 * Accept a battle invitation
 */
export async function acceptBattleInvitation(
  invitationId: number,
  userId: number
): Promise<BattleResult | null> {
  try {
    // Get and validate invitation
    const [invitation] = await db
      .select()
      .from(battleInvitations)
      .where(
        and(
          eq(battleInvitations.id, invitationId),
          eq(battleInvitations.toUserId, userId),
          eq(battleInvitations.status, 'pending'),
          gte(battleInvitations.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!invitation) {
      return null
    }

    // First, delete any existing accepted invitations between these users
    // to avoid unique constraint violation
    await db
      .delete(battleInvitations)
      .where(
        and(
          or(
            and(
              eq(battleInvitations.fromUserId, invitation.fromUserId),
              eq(battleInvitations.toUserId, invitation.toUserId)
            ),
            and(
              eq(battleInvitations.fromUserId, invitation.toUserId),
              eq(battleInvitations.toUserId, invitation.fromUserId)
            )
          ),
          eq(battleInvitations.status, 'accepted')
        )
      )

    // Update invitation status
    await db
      .update(battleInvitations)
      .set({
        status: 'accepted',
        respondedAt: new Date()
      })
      .where(eq(battleInvitations.id, invitationId))

    // Create the battle and return full result
    const result = await createBattle(
      invitation.fromUserId,
      invitation.toUserId
    )

    return result
  } catch (error) {
    console.error('Error accepting battle invitation:', error)
    throw error
  }
}

/**
 * Reject a battle invitation
 */
export async function rejectBattleInvitation(
  invitationId: number,
  userId: number,
  sessionId: string
): Promise<boolean> {
  try {
    // Get invitation
    const [invitation] = await db
      .select()
      .from(battleInvitations)
      .where(
        and(
          eq(battleInvitations.id, invitationId),
          eq(battleInvitations.toUserId, userId),
          eq(battleInvitations.status, 'pending')
        )
      )
      .limit(1)

    if (!invitation) {
      return false
    }

    // Update invitation status
    await db
      .update(battleInvitations)
      .set({
        status: 'rejected',
        respondedAt: new Date()
      })
      .where(eq(battleInvitations.id, invitationId))

    // Add to session rejections
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // Expire after 1 hour

    await db
      .insert(battleSessionRejections)
      .values({
        userId,
        rejectedUserId: invitation.fromUserId,
        sessionId,
        expiresAt
      })
      .onConflictDoNothing()

    return true
  } catch (error) {
    console.error('Error rejecting battle invitation:', error)
    throw error
  }
}

/**
 * Get pending battle invitations for a user
 */
export async function getPendingInvitations(userId: number) {
  try {
    const invitations = await db
      .select()
      .from(battleInvitations)
      .where(
        and(
          eq(battleInvitations.toUserId, userId),
          eq(battleInvitations.status, 'pending'),
          gte(battleInvitations.expiresAt, new Date())
        )
      )
      .orderBy(desc(battleInvitations.createdAt))

    return invitations
  } catch (error) {
    console.error('Error getting pending invitations:', error)
    throw error
  }
}

/**
 * Check if users have rejected each other in current session
 */
export async function hasSessionRejection(
  user1Id: number,
  user2Id: number,
  sessionId: string
): Promise<boolean> {
  try {
    const rejections = await db
      .select()
      .from(battleSessionRejections)
      .where(
        and(
          or(
            and(
              eq(battleSessionRejections.userId, user1Id),
              eq(battleSessionRejections.rejectedUserId, user2Id)
            ),
            and(
              eq(battleSessionRejections.userId, user2Id),
              eq(battleSessionRejections.rejectedUserId, user1Id)
            )
          ),
          eq(battleSessionRejections.sessionId, sessionId),
          gte(battleSessionRejections.expiresAt, new Date())
        )
      )
      .limit(1)

    return rejections.length > 0
  } catch (error) {
    console.error('Error checking session rejection:', error)
    return false
  }
}

/**
 * Clean up expired invitations
 */
export async function cleanupExpiredInvitations(): Promise<void> {
  try {
    await db
      .update(battleInvitations)
      .set({ status: 'expired' })
      .where(
        and(
          eq(battleInvitations.status, 'pending'),
          lte(battleInvitations.expiresAt, new Date())
        )
      )
  } catch (error) {
    console.error('Error cleaning up expired invitations:', error)
  }
}
