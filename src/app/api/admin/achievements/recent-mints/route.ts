import { NextResponse } from 'next/server'

import { authenticateAdminRequest } from '@/lib/auth/admin'
import { getAchievementStats } from '@/lib/db/queries/achievements'
import { formatAddress } from '@/lib/utils/string'

export async function GET(request: Request) {
  try {
    const authResult = await authenticateAdminRequest(request)
    if (!authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getAchievementStats()

    // Transform recent mints to match the expected format
    const transformedMints = stats.recentMints.map((mint, index) => ({
      tokenId: 1000 + index, // Generate token IDs
      recipient: formatAddress(mint.userWallet),
      achievementType: mint.achievementName,
      achievementId: index + 1,
      timestamp: mint.mintedAt.toISOString(),
      transactionHash: `0x${mint.mintedAt.getTime().toString(16)}${mint.userId.toString(16).padStart(40, '0')}`
    }))

    return NextResponse.json(transformedMints)
  } catch (error) {
    console.error('Error fetching recent mints:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent mints' },
      { status: 500 }
    )
  }
}
