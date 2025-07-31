import { NextRequest, NextResponse } from 'next/server'

import { desc, eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { userGameData, users, battles } from '@/lib/db/schema'
import { rewardsService } from '@/services/rewards'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'general'
    const timeframe = searchParams.get('timeframe') || 'all_time'
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Map timeframe to period for backward compatibility
    const period =
      timeframe === 'weekly'
        ? 'weekly'
        : timeframe === 'monthly'
          ? 'monthly'
          : timeframe === 'all-time'
            ? 'all_time'
            : 'all_time'

    if (type === 'battle') {
      // Get battle-specific leaderboard with battle stats
      const leaderboardData = await db
        .select({
          userId: userGameData.userId,
          xp: userGameData.xp,
          level: userGameData.level,
          combatPower: userGameData.combatPower,
          userName: users.name,
          walletAddress: users.walletAddress,
          email: users.email
        })
        .from(userGameData)
        .leftJoin(users, eq(userGameData.userId, users.id))
        .orderBy(desc(userGameData.combatPower), desc(userGameData.xp))
        .limit(limit)

      // Get battle stats for each user
      const userIds = leaderboardData.map(entry => entry.userId)
      const battleStatsPromises = userIds.map(async userId => {
        const [stats] = await db
          .select({
            totalBattles: sql<number>`count(*)`,
            battlesWon: sql<number>`count(case when ${battles.winnerId} = ${userId} then 1 end)`
          })
          .from(battles)
          .where(
            sql`${battles.player1Id} = ${userId} OR ${battles.player2Id} = ${userId}`
          )

        const totalBattles = Number(stats?.totalBattles || 0)
        const battlesWon = Number(stats?.battlesWon || 0)
        const winRate = totalBattles > 0 ? (battlesWon / totalBattles) * 100 : 0

        return {
          userId,
          totalBattles,
          battlesWon,
          battlesLost: totalBattles - battlesWon,
          winRate
        }
      })

      const battleStatsArray = await Promise.all(battleStatsPromises)
      const battleStatsMap = battleStatsArray.reduce(
        (acc, stats) => {
          acc[stats.userId] = stats
          return acc
        },
        {} as Record<number, any>
      )

      const result = leaderboardData.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        user: {
          id: entry.userId,
          displayName: entry.userName,
          username: entry.userName,
          walletAddress: entry.walletAddress
        },
        battleStats: {
          totalBattles: battleStatsMap[entry.userId]?.totalBattles || 0,
          battlesWon: battleStatsMap[entry.userId]?.battlesWon || 0,
          winRate: battleStatsMap[entry.userId]?.winRate || 0,
          combatPower: entry.combatPower || 100
        },
        xp: entry.xp || 0,
        level: entry.level || 1
      }))

      return NextResponse.json(result)
    } else {
      // Use existing general leaderboard
      const leaderboard = await rewardsService.getLeaderboard(
        period as 'daily' | 'weekly' | 'monthly' | 'all_time',
        limit
      )

      return NextResponse.json(leaderboard)
    }
  } catch (error) {
    console.error('Failed to get leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    )
  }
}
