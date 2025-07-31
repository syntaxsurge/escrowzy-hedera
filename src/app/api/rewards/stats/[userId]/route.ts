import { NextRequest, NextResponse } from 'next/server'

import { rewardsService } from '@/services/rewards'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await context.params
    const userId = parseInt(params.userId, 10)

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const stats = await rewardsService.getUserStats(userId)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to get user stats:', error)
    return NextResponse.json(
      { error: 'Failed to get user stats' },
      { status: 500 }
    )
  }
}
