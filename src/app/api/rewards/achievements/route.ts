import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUserAction } from '@/lib/actions/user'
import { rewardsService } from '@/services/rewards'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserAction()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')

    const achievements = await rewardsService.getUserAchievements(user.id)

    // Transform achievements to match the expected format
    const formattedAchievements = achievements.map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon || 'Trophy',
      category: achievement.category || 'general',
      rarity: (achievement.rarity || 'common') as
        | 'common'
        | 'rare'
        | 'epic'
        | 'legendary',
      xpReward: achievement.xpReward,
      nftEligible: achievement.nftEligible || false,
      progress: {
        current: achievement.unlocked ? 1 : 0,
        target: 1
      },
      unlockedAt: achievement.unlockedAt,
      isUnlocked: achievement.unlocked || false,
      isClaimable: false // Can be enhanced based on business logic
    }))

    // Filter by category if provided
    const filteredAchievements = category
      ? formattedAchievements.filter(a => a.category === category)
      : formattedAchievements

    return NextResponse.json(filteredAchievements)
  } catch (error) {
    console.error('Failed to get user achievements:', error)
    return NextResponse.json(
      { error: 'Failed to get user achievements' },
      { status: 500 }
    )
  }
}
