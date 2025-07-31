import { NextRequest, NextResponse } from 'next/server'

import { desc, eq, or, sql } from 'drizzle-orm'

import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { battles, userGameData, achievementNFTs } from '@/lib/db/schema'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Fetch recent battle activity
    const battleActivity = await db
      .select({
        id: battles.id,
        type: sql<string>`CASE WHEN ${battles.winnerId} = ${userId} THEN 'battle_won' ELSE 'battle_lost' END`,
        winnerId: battles.winnerId,
        player1Id: battles.player1Id,
        player2Id: battles.player2Id,
        xpEarned: sql<number>`50`,
        timestamp: battles.createdAt,
        player1Name: sql<string>`''`,
        player2Name: sql<string>`''`
      })
      .from(battles)
      .where(
        or(
          eq(battles.winnerId, userId),
          eq(battles.player1Id, userId),
          eq(battles.player2Id, userId)
        )
      )
      .orderBy(desc(battles.createdAt))
      .limit(Math.floor(limit / 2))

    // Fetch recent gamification data for quests
    const gamificationActivity = await db
      .select({
        id: userGameData.id,
        userId: userGameData.userId,
        questProgress: userGameData.questProgress,
        timestamp: userGameData.updatedAt
      })
      .from(userGameData)
      .where(eq(userGameData.userId, userId))
      .orderBy(desc(userGameData.updatedAt))
      .limit(1)

    // Fetch recent achievements
    const achievementActivity = await db
      .select({
        id: achievementNFTs.id,
        achievementId: achievementNFTs.achievementId,
        tokenId: achievementNFTs.tokenId,
        timestamp: achievementNFTs.mintedAt
      })
      .from(achievementNFTs)
      .where(eq(achievementNFTs.userId, userId))
      .orderBy(desc(achievementNFTs.mintedAt))
      .limit(Math.floor(limit / 4))

    // Format battle activity
    const battleActivityFormatted = battleActivity.map((battle: any) => {
      const isWinner = battle.winnerId === userId
      const opponentName =
        battle.player1Id === userId ? battle.player2Name : battle.player1Name
      return {
        id: `battle-${battle.id}`,
        type: isWinner ? 'battle_won' : 'battle_lost',
        title: isWinner ? 'Battle Won' : 'Battle Lost',
        description: isWinner
          ? `Defeated ${opponentName || 'opponent'} in battle`
          : `Lost to ${opponentName || 'opponent'} in battle`,
        timestamp: battle.timestamp?.toISOString() || new Date().toISOString(),
        xpEarned: isWinner ? battle.xpEarned || 50 : 0
      }
    })

    // Extract completed quests from gamification data
    const questActivityFormatted = gamificationActivity.flatMap((data: any) => {
      if (!data.questProgress || typeof data.questProgress !== 'object')
        return []
      const completedQuests = Object.entries(
        data.questProgress as Record<string, any>
      )
        .filter(([_, quest]: [string, any]) => quest.isCompleted)
        .slice(0, Math.floor(limit / 4))
        .map(([questId, _]) => ({
          id: `quest-${data.id}-${questId}`,
          type: 'quest_completed' as const,
          title: 'Quest Completed',
          description: 'Completed a quest objective',
          timestamp: data.timestamp?.toISOString() || new Date().toISOString(),
          xpEarned: 100
        }))
      return completedQuests
    })

    // Format achievement activity
    const achievementActivityFormatted = achievementActivity.map(
      (achievement: any) => ({
        id: `achievement-${achievement.id}`,
        type: 'achievement_unlocked' as const,
        title: 'Achievement Unlocked',
        description: `Unlocked achievement: ${achievement.achievementId}`,
        timestamp:
          achievement.timestamp?.toISOString() || new Date().toISOString(),
        xpEarned: 200
      })
    )

    // Combine and sort all activities
    const recentActivity = [
      ...battleActivityFormatted,
      ...questActivityFormatted,
      ...achievementActivityFormatted
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit)

    return NextResponse.json(recentActivity)
  } catch (error) {
    console.error('Error fetching battle activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch battle activity' },
      { status: 500 }
    )
  }
}
