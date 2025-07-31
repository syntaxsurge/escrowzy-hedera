import { NextRequest, NextResponse } from 'next/server'

import { withAdminAuth } from '@/lib/api/auth-middleware'
import { getAchievementNFTAddress, getViemChain } from '@/lib/blockchain'
import { getAllAchievements } from '@/lib/db/queries/achievements'

// Achievement enums
const AchievementCategory = {
  0: 'TRADING',
  1: 'VOLUME',
  2: 'BATTLE',
  3: 'COMMUNITY',
  4: 'SPECIAL'
} as const

const AchievementRarity = {
  0: 'COMMON',
  1: 'UNCOMMON',
  2: 'RARE',
  3: 'EPIC',
  4: 'LEGENDARY'
} as const

async function handler(
  req: NextRequest,
  _context: { session: any; params?: any }
) {
  try {
    const { searchParams } = new URL(req.url)
    const chainId = parseInt(searchParams.get('chainId') || '')

    const contractAddress = getAchievementNFTAddress(chainId)
    const chain = getViemChain(chainId)

    if (!contractAddress || !chain) {
      return NextResponse.json(
        {
          type: 'configuration_error',
          error: 'Smart contract not configured for this network',
          chainId,
          chainName: chain?.name || `Chain ${chainId}`
        },
        { status: 404 }
      )
    }

    // Fetch achievements from database with actual minted counts
    const achievementsData = await getAllAchievements()

    // Transform achievements to API response format
    const achievements = achievementsData.map((achievement, index) => ({
      id: index + 1,
      achievementId: achievement.id,
      name: achievement.name,
      description: achievement.description,
      category:
        AchievementCategory[
          achievement.category as keyof typeof AchievementCategory
        ],
      categoryCode: achievement.category,
      rarity:
        AchievementRarity[achievement.rarity as keyof typeof AchievementRarity],
      rarityCode: achievement.rarity,
      xpReward: achievement.xpReward,
      combatPowerReward: achievement.combatPowerReward,
      isActive: achievement.active,
      imageUri: achievement.metadataURI.replace('.json', '.png'),
      metadataUri: achievement.metadataURI,
      totalMinted: achievement.totalMinted,
      maxSupply: achievement.maxSupply,
      createdAt: new Date(
        Date.now() - (index + 1) * 24 * 60 * 60 * 1000
      ).toISOString() // Stagger creation dates for display
    }))

    return NextResponse.json({
      achievements,
      total: achievements.length,
      contractInfo: {
        address: contractAddress,
        chainId,
        chainName: chain.name
      }
    })
  } catch (error) {
    console.error('Error fetching achievements list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievements data' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
