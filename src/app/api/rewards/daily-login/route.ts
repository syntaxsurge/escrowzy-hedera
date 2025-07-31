import { NextRequest, NextResponse } from 'next/server'

import { rewardsService } from '@/services/rewards'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const result = await rewardsService.handleDailyLogin(userId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to handle daily login:', error)
    return NextResponse.json(
      { error: 'Failed to handle daily login' },
      { status: 500 }
    )
  }
}
