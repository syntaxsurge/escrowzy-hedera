import { NextResponse } from 'next/server'

import { eq } from 'drizzle-orm'

import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { userTradingStats } from '@/lib/db/schema'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const params = await context.params
    const userId = parseInt(params.id)

    // Check if user is requesting their own stats
    if (session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get user trading stats
    const [stats] = await db
      .select()
      .from(userTradingStats)
      .where(eq(userTradingStats.userId, userId))
      .limit(1)

    // If no stats exist yet, return default values
    if (!stats) {
      return NextResponse.json({
        success: true,
        data: {
          id: 0,
          userId,
          totalTrades: 0,
          successfulTrades: 0,
          totalVolume: '0',
          avgCompletionTime: null,
          disputesWon: 0,
          disputesLost: 0,
          rating: 5,
          updatedAt: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error in GET /api/users/[id]/trading-stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
