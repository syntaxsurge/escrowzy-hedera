import { NextRequest, NextResponse } from 'next/server'

import { rewardsService } from '@/services/rewards'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userIdParam = searchParams.get('userId')

    if (!userIdParam) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const userId = parseInt(userIdParam, 10)

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
