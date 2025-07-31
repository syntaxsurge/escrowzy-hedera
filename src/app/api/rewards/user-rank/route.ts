import { NextRequest, NextResponse } from 'next/server'

import { sql } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { userGameData } from '@/lib/db/schema'
import { rewardsService } from '@/services/rewards'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const userIdNum = parseInt(userId, 10)

    // Get user's current XP
    const userGame = await rewardsService.getOrCreateGameData(userIdNum)

    if (!userGame) {
      return NextResponse.json(
        { error: 'User game data not found' },
        { status: 404 }
      )
    }

    // Count how many users have more XP than this user
    const [result] = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(userGameData)
      .where(sql`${userGameData.xp} > ${userGame.xp}`)

    const rank = Number(result?.count || 0) + 1

    // Get total number of users with game data for context
    const [totalResult] = await db
      .select({
        total: sql<number>`count(*)`
      })
      .from(userGameData)

    const totalUsers = Number(totalResult?.total || 0)

    return NextResponse.json({
      rank,
      totalUsers,
      xp: userGame.xp,
      level: userGame.level
    })
  } catch (error) {
    console.error('Failed to get user rank:', error)
    return NextResponse.json(
      { error: 'Failed to get user rank' },
      { status: 500 }
    )
  }
}
