import { NextResponse } from 'next/server'

import { ZodError } from 'zod'

import { getSession } from '@/lib/auth/session'
import { getBattleHistorySchema } from '@/lib/schemas/battle'
import {
  getBattleHistory,
  getBattleStats,
  getDailyBattleLimit
} from '@/services/battle'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const params = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 20
    }

    // Validate parameters
    const validatedParams = getBattleHistorySchema.parse(params)

    // Calculate offset from page
    const offset = (validatedParams.page - 1) * validatedParams.limit

    // Get battle history
    const history = await getBattleHistory(
      session.user.id,
      validatedParams.limit,
      offset
    )

    // Get additional stats
    const stats = await getBattleStats(session.user.id)
    const dailyLimit = await getDailyBattleLimit(session.user.id)

    return NextResponse.json({
      success: true,
      data: {
        history,
        stats,
        dailyLimit,
        pagination: {
          page: validatedParams.page,
          limit: validatedParams.limit,
          total: history.totalBattles,
          totalPages: Math.ceil(history.totalBattles / validatedParams.limit)
        }
      }
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Error in GET /api/battles/history:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
