import {
  eq,
  and,
  gte,
  sql,
  isNull,
  or,
  lt,
  ne,
  lte,
  desc,
  asc
} from 'drizzle-orm'

import { type TableRequest, type TableResponse } from '@/lib/table/table'
import { type Battle } from '@/types/battle'

import { db } from '../drizzle'
import {
  battles,
  users,
  userGameData,
  sessions,
  battleQueue,
  battleStates
} from '../schema'
import { createDateRangeFilter, executeTableQuery } from './table-queries'

export interface BattleWithDetails extends Battle {
  player1?: {
    id: number
    name?: string | null
    walletAddress?: string | null
  }
  player2?: {
    id: number
    name?: string | null
    walletAddress?: string | null
  }
  winner?: {
    id: number
    name?: string | null
    walletAddress?: string | null
  }
}

/**
 * Get battle history with server-side pagination and filtering
 */
export async function getBattleHistoryTable(
  request: TableRequest,
  userId: number
): Promise<TableResponse<BattleWithDetails>> {
  // No search columns for battles - we'll rely on filters
  const searchColumns: string[] = []

  const filterHandlers = {
    result: (value: string) => {
      if (value === 'win') {
        return eq(battles.winnerId, userId)
      } else if (value === 'loss') {
        return and(
          or(eq(battles.player1Id, userId), eq(battles.player2Id, userId)),
          ne(battles.winnerId, userId)
        )
      }
      return undefined
    },
    createdAt: createDateRangeFilter(battles.createdAt),
    dateFrom: (value: string) => {
      if (!value) return undefined
      return gte(battles.createdAt, new Date(value))
    },
    dateTo: (value: string) => {
      if (!value) return undefined
      return lte(battles.createdAt, new Date(value))
    }
  }

  // Base condition - only show battles for this user
  const baseConditions: any[] = [
    or(eq(battles.player1Id, userId), eq(battles.player2Id, userId))
  ]

  // Default sorting by createdAt desc
  const defaultSorting: any[] =
    request.sorting.length === 0
      ? [desc(battles.createdAt)]
      : request.sorting.map(sort => {
          const column = (battles as any)[sort.id]
          if (column) {
            return sort.desc ? desc(column) : asc(column)
          }
          return desc(battles.createdAt)
        })

  const { data, pageCount, totalCount } = await executeTableQuery({
    table: battles,
    request,
    searchColumns: searchColumns as any,
    filterHandlers,
    baseConditions,
    customOrderBy: defaultSorting as any
  })

  // Fetch player details for all battles
  const userIds = new Set<number>()
  data.forEach((battle: any) => {
    userIds.add(battle.player1Id)
    userIds.add(battle.player2Id)
    if (battle.winnerId) userIds.add(battle.winnerId)
  })

  const usersData =
    userIds.size > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            walletAddress: users.walletAddress
          })
          .from(users)
          .where(or(...Array.from(userIds).map(id => eq(users.id, id))))
      : []

  const userMap = new Map(usersData.map(u => [u.id, u]))

  // Fetch battle states for round history
  const battleIds = data.map((b: any) => b.id)
  const battleStatesData =
    battleIds.length > 0
      ? await db
          .select({
            battleId: battleStates.battleId,
            roundHistory: battleStates.roundHistory
          })
          .from(battleStates)
          .where(or(...battleIds.map(id => eq(battleStates.battleId, id))))
      : []

  const battleStateMap = new Map(battleStatesData.map(s => [s.battleId, s]))

  // Enhance battles with user details and round history
  const enhancedBattles: BattleWithDetails[] = data.map((battle: any) => {
    const state = battleStateMap.get(battle.id)
    return {
      ...battle,
      player1: userMap.get(battle.player1Id),
      player2: userMap.get(battle.player2Id),
      winner: battle.winnerId ? userMap.get(battle.winnerId) : undefined,
      roundHistory: state?.roundHistory || []
    }
  })

  return {
    data: enhancedBattles,
    pageCount,
    totalCount
  }
}

/**
 * Get real-time battle statistics
 */
export async function getBattleStats(): Promise<{
  warriorsOnline: number
  activeBattles: number
  inQueue: number
}> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  const now = new Date()

  // Get warriors online (users with active sessions in last 5 minutes)
  const [onlineResult] = await db
    .select({
      count: sql<number>`count(distinct ${sessions.userId})`
    })
    .from(sessions)
    .where(
      and(
        gte(sessions.lastActiveAt, fiveMinutesAgo),
        gte(sessions.expiresAt, now)
      )
    )

  // Get active battles (battles without a winner yet, created in last 5 minutes)
  const [activeBattlesResult] = await db
    .select({
      count: sql<number>`count(*)`
    })
    .from(battles)
    .where(
      and(isNull(battles.winnerId), gte(battles.createdAt, fiveMinutesAgo))
    )

  // Get users in queue (active queue entries that haven't expired)
  const [inQueueResult] = await db
    .select({
      count: sql<number>`count(*)`
    })
    .from(battleQueue)
    .where(
      and(eq(battleQueue.status, 'searching'), gte(battleQueue.expiresAt, now))
    )

  return {
    warriorsOnline: Number(onlineResult?.count || 0),
    activeBattles: Number(activeBattlesResult?.count || 0),
    inQueue: Number(inQueueResult?.count || 0)
  }
}

/**
 * Get user's battle history
 */
export async function getUserBattleHistory(userId: number): Promise<{
  totalBattles: number
  wins: number
  losses: number
  winRate: number
  recentBattles: Array<{
    id: number
    opponentId: number
    opponentName: string | null
    result: 'win' | 'loss' | 'pending'
    createdAt: Date
  }>
}> {
  // Get battle statistics
  const [stats] = await db
    .select({
      totalBattles: sql<number>`count(*)`,
      wins: sql<number>`count(case when winner_id = ${userId} then 1 end)`,
      losses: sql<number>`count(case when winner_id != ${userId} and winner_id is not null then 1 end)`
    })
    .from(battles)
    .where(or(eq(battles.player1Id, userId), eq(battles.player2Id, userId)))

  const totalBattles = Number(stats?.totalBattles || 0)
  const wins = Number(stats?.wins || 0)
  const losses = Number(stats?.losses || 0)
  const winRate = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0

  // Get recent battles with opponent info
  const recentBattlesRaw = await db
    .select({
      id: battles.id,
      player1Id: battles.player1Id,
      player2Id: battles.player2Id,
      winnerId: battles.winnerId,
      createdAt: battles.createdAt,
      player1Name: sql<string>`(SELECT name FROM users WHERE id = ${battles.player1Id})`,
      player2Name: sql<string>`(SELECT name FROM users WHERE id = ${battles.player2Id})`
    })
    .from(battles)
    .where(or(eq(battles.player1Id, userId), eq(battles.player2Id, userId)))
    .orderBy(sql`created_at DESC`)
    .limit(10)

  const recentBattles = recentBattlesRaw.map(battle => {
    const isPlayer1 = battle.player1Id === userId
    const opponentId = isPlayer1 ? battle.player2Id : battle.player1Id
    const opponentName = isPlayer1 ? battle.player2Name : battle.player1Name

    let result: 'win' | 'loss' | 'pending' = 'pending'
    if (battle.winnerId) {
      result = battle.winnerId === userId ? 'win' : 'loss'
    }

    return {
      id: battle.id,
      opponentId,
      opponentName,
      result,
      createdAt: battle.createdAt
    }
  })

  return {
    totalBattles,
    wins,
    losses,
    winRate,
    recentBattles
  }
}

/**
 * Get leaderboard for battles
 */
export async function getBattleLeaderboard(limit: number = 10): Promise<
  Array<{
    userId: number
    userName: string | null
    userWallet: string
    wins: number
    totalBattles: number
    winRate: number
    combatPower: number
  }>
> {
  const result = await db
    .select({
      userId: users.id,
      userName: users.name,
      userWallet: users.walletAddress,
      wins: sql<number>`count(case when b.winner_id = ${users.id} then 1 end)`,
      totalBattles: sql<number>`count(b.id)`,
      combatPower: userGameData.combatPower
    })
    .from(users)
    .innerJoin(userGameData, eq(userGameData.userId, users.id))
    .leftJoin(
      sql`battles b`,
      sql`b.player1_id = ${users.id} OR b.player2_id = ${users.id}`
    )
    .groupBy(
      users.id,
      users.name,
      users.walletAddress,
      userGameData.combatPower
    )
    .having(sql`count(b.id) > 0`)
    .orderBy(sql`count(case when b.winner_id = ${users.id} then 1 end) DESC`)
    .limit(limit)

  return result.map(row => ({
    userId: row.userId,
    userName: row.userName,
    userWallet: row.userWallet,
    wins: Number(row.wins),
    totalBattles: Number(row.totalBattles),
    winRate:
      Number(row.totalBattles) > 0
        ? Math.round((Number(row.wins) / Number(row.totalBattles)) * 100)
        : 0,
    combatPower: row.combatPower
  }))
}

/**
 * Record a new battle
 */
export async function createBattle(
  player1Id: number,
  player2Id: number,
  player1CP: number,
  player2CP: number
): Promise<number> {
  const [battle] = await db
    .insert(battles)
    .values({
      player1Id,
      player2Id,
      player1CP,
      player2CP,
      createdAt: new Date()
    })
    .returning({ id: battles.id })

  return battle.id
}

/**
 * Complete a battle with a winner
 */
export async function completeBattle(
  battleId: number,
  winnerId: number,
  feeDiscountPercent?: number
): Promise<void> {
  const updateData: any = {
    winnerId
  }

  if (feeDiscountPercent) {
    updateData.feeDiscountPercent = feeDiscountPercent
    updateData.discountExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }

  await db.update(battles).set(updateData).where(eq(battles.id, battleId))

  // Update winner's stats
  await db
    .update(userGameData)
    .set({
      xp: sql`${userGameData.xp} + 50`,
      combatPower: sql`${userGameData.combatPower} + 5`,
      updatedAt: new Date()
    })
    .where(eq(userGameData.userId, winnerId))
}

/**
 * Add user to battle queue
 */
export async function addToQueue(
  userId: number,
  combatPower: number,
  matchRange: number = 20
): Promise<{ id: number }> {
  const minCP = Math.floor(combatPower * (1 - matchRange / 100))
  const maxCP = Math.ceil(combatPower * (1 + matchRange / 100))
  const expiresAt = new Date(Date.now() + 30 * 1000) // 30 seconds timeout

  // Remove any existing queue entry for this user
  await removeFromQueue(userId)

  const [queueEntry] = await db
    .insert(battleQueue)
    .values({
      userId,
      combatPower,
      minCP,
      maxCP,
      matchRange,
      expiresAt,
      status: 'searching'
    })
    .returning({ id: battleQueue.id })

  return queueEntry
}

/**
 * Remove user from battle queue
 */
export async function removeFromQueue(userId: number): Promise<void> {
  await db.delete(battleQueue).where(eq(battleQueue.userId, userId))
}

/**
 * Find matches in queue
 */
export async function findMatchesInQueue(
  userId: number,
  combatPower: number,
  matchRange: number = 20
): Promise<
  Array<{
    userId: number
    combatPower: number
    queueId: number
  }>
> {
  const minCP = Math.floor(combatPower * (1 - matchRange / 100))
  const maxCP = Math.ceil(combatPower * (1 + matchRange / 100))
  const now = new Date()

  // Find compatible opponents in queue
  const matches = await db
    .select({
      userId: battleQueue.userId,
      combatPower: battleQueue.combatPower,
      queueId: battleQueue.id
    })
    .from(battleQueue)
    .where(
      and(
        ne(battleQueue.userId, userId),
        eq(battleQueue.status, 'searching'),
        gte(battleQueue.expiresAt, now),
        // Check if their CP is in our range
        lte(battleQueue.combatPower, maxCP),
        gte(battleQueue.combatPower, minCP),
        // Check if our CP is in their range
        gte(battleQueue.maxCP, minCP),
        lte(battleQueue.minCP, maxCP)
      )
    )
    .orderBy(sql`RANDOM()`)
    .limit(1)

  return matches
}

/**
 * Mark queue entries as matched
 */
export async function markAsMatched(
  user1Id: number,
  user2Id: number
): Promise<void> {
  await db.transaction(async tx => {
    await tx
      .update(battleQueue)
      .set({
        status: 'matched',
        matchedWithUserId: user2Id
      })
      .where(eq(battleQueue.userId, user1Id))

    await tx
      .update(battleQueue)
      .set({
        status: 'matched',
        matchedWithUserId: user1Id
      })
      .where(eq(battleQueue.userId, user2Id))
  })
}

/**
 * Clean up expired queue entries
 */
export async function cleanupExpiredQueueEntries(): Promise<void> {
  const now = new Date()
  await db
    .delete(battleQueue)
    .where(
      and(lt(battleQueue.expiresAt, now), eq(battleQueue.status, 'searching'))
    )
}

/**
 * Update queue positions and estimated wait times
 */
export async function updateQueuePositions(): Promise<void> {
  const now = new Date()

  // Get all active queue entries ordered by join time
  const queueEntries = await db
    .select({
      id: battleQueue.id,
      userId: battleQueue.userId,
      searchStartedAt: battleQueue.searchStartedAt
    })
    .from(battleQueue)
    .where(
      and(eq(battleQueue.status, 'searching'), gte(battleQueue.expiresAt, now))
    )
    .orderBy(battleQueue.searchStartedAt)

  // Update each entry with its position
  for (let i = 0; i < queueEntries.length; i++) {
    const position = i + 1
    const estimatedWait = Math.max(10, position * 15) // 15 seconds per position, min 10 seconds

    await db
      .update(battleQueue)
      .set({
        queuePosition: position,
        estimatedWaitTime: estimatedWait
      })
      .where(eq(battleQueue.id, queueEntries[i].id))
  }
}

/**
 * Update session activity
 */
export async function updateSessionActivity(
  sessionToken: string
): Promise<void> {
  await db
    .update(sessions)
    .set({
      lastActiveAt: new Date()
    })
    .where(eq(sessions.sessionToken, sessionToken))
}
