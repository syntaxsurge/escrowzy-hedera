import { NextResponse } from 'next/server'

import { authenticateAdminRequest } from '@/lib/auth/admin'
import { getAllAchievements } from '@/lib/db/queries/achievements'

export async function GET(request: Request) {
  try {
    const authResult = await authenticateAdminRequest(request)
    if (!authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const achievements = await getAllAchievements()

    // Transform achievements to match the expected format
    const transformedAchievements = achievements.map((achievement, index) => ({
      id: index + 1,
      name: achievement.name,
      description: achievement.description,
      imageUri: achievement.metadataURI.replace('.json', '.png'),
      totalMinted: achievement.totalMinted,
      maxSupply: achievement.maxSupply,
      isActive: achievement.active,
      createdAt: new Date().toISOString()
    }))

    return NextResponse.json(transformedAchievements)
  } catch (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    )
  }
}
