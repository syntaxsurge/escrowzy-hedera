import { NextResponse } from 'next/server'

import { eq, sql } from 'drizzle-orm'

import { getCurrentUserAction } from '@/lib/actions/user'
import { db } from '@/lib/db/drizzle'
import { battles, userGameData } from '@/lib/db/schema'

export async function GET() {
  try {
    const user = await getCurrentUserAction()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // Get battle statistics for the current user
    const [stats] = await db
      .select({
        totalBattles: sql<number>`count(*)`,
        battlesWon: sql<number>`count(case when ${battles.winnerId} = ${userId} then 1 end)`,
        battlesLost: sql<number>`count(case when ${battles.winnerId} IS NOT NULL AND ${battles.winnerId} != ${userId} AND (${battles.player1Id} = ${userId} OR ${battles.player2Id} = ${userId}) then 1 end)`,
        activeBattles: sql<number>`0` // No status field in battles table, so default to 0
      })
      .from(battles)
      .where(
        sql`${battles.player1Id} = ${userId} OR ${battles.player2Id} = ${userId}`
      )

    // Get user game data for level, xp, and combat power
    const [gameData] = await db
      .select({
        combatPower: userGameData.combatPower,
        level: userGameData.level,
        xp: userGameData.xp
      })
      .from(userGameData)
      .where(eq(userGameData.userId, userId))

    // Calculate additional stats
    const totalBattles = Number(stats?.totalBattles || 0)
    const battlesWon = Number(stats?.battlesWon || 0)
    const battlesLost = Number(stats?.battlesLost || 0)
    const activeBattles = Number(stats?.activeBattles || 0)

    const winRate = totalBattles > 0 ? (battlesWon / totalBattles) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        totalBattles,
        battlesWon,
        battlesLost,
        activeBattles,
        winRate,
        combatPower: gameData?.combatPower || 100,
        level: gameData?.level || 1,
        xp: gameData?.xp || 0
      }
    })
  } catch (error) {
    console.error('Failed to fetch battle stats:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch battle stats',
        success: false
      },
      { status: 500 }
    )
  }
}
