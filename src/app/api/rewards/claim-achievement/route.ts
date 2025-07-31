import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUserAction } from '@/lib/actions/user'
import { rewardsService } from '@/services/rewards'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const user = await getCurrentUserAction()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { achievementId } = await request.json()

    if (!achievementId) {
      return NextResponse.json(
        { error: 'Achievement ID is required' },
        { status: 400 }
      )
    }

    // Check if the achievement can be claimed
    const claimed = await rewardsService.checkAchievement(
      user.id,
      achievementId
    )

    if (!claimed) {
      return NextResponse.json(
        { error: 'Achievement already claimed or requirements not met' },
        { status: 400 }
      )
    }

    // Get updated achievements list
    const achievements = await rewardsService.getUserAchievements(user.id)

    // Get updated user stats after claiming
    const stats = await rewardsService.getUserStats(user.id)

    return NextResponse.json({
      success: true,
      data: {
        claimed: true,
        xpEarned: 100, // You might want to get this from the achievement config
        achievements,
        stats
      }
    })
  } catch (error) {
    console.error('Failed to claim achievement:', error)
    return NextResponse.json(
      { error: 'Failed to claim achievement' },
      { status: 500 }
    )
  }
}
