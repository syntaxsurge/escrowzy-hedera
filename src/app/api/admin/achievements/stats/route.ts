import { NextResponse } from 'next/server'

import { authenticateAdminRequest } from '@/lib/auth/admin'
import { getAchievementStats } from '@/lib/db/queries/achievements'

export async function GET(request: Request) {
  try {
    const authResult = await authenticateAdminRequest(request)
    if (!authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getAchievementStats()

    // Calculate average per user and recent mints (last 7 days)
    const averagePerUser =
      stats.uniqueHolders > 0 ? stats.totalMinted / stats.uniqueHolders : 0

    // Count recent mints from the past week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const recentMintsCount = stats.recentMints.filter(
      mint => new Date(mint.mintedAt) > oneWeekAgo
    ).length

    return NextResponse.json({
      totalMinted: stats.totalMinted,
      uniqueHolders: stats.uniqueHolders,
      mostCommonAchievement: stats.mostCommonAchievement || 'None',
      recentMints: recentMintsCount,
      totalAchievementTypes: stats.totalAchievementTypes,
      averagePerUser: averagePerUser
    })
  } catch (error) {
    console.error('Error fetching achievement stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievement statistics' },
      { status: 500 }
    )
  }
}
