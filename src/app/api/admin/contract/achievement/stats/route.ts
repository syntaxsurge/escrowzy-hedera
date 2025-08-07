import { NextRequest, NextResponse } from 'next/server'

import { ZERO_ADDRESS } from 'thirdweb'

import { envPublic } from '@/config/env.public'
import { withAdminAuth } from '@/lib/api/auth-middleware'
import {
  getAchievementNFTAddress,
  getSupportedChainIds,
  getChainConfig,
  getChainNickname
} from '@/lib/blockchain'
import { AchievementNFTService } from '@/services/blockchain/achievement-nft.service'

// Helper function to get human-readable achievement names
function getAchievementName(achievementId: string): string {
  const achievementNames: Record<string, string> = {
    FIRST_TRADE: 'First Trade',
    FIRST_BATTLE: 'First Battle',
    FIRST_WIN: 'First Victory',
    TEN_TRADES: '10 Trades Completed',
    HUNDRED_TRADES: '100 Trades Master',
    THOUSAND_TRADES: 'Trading Legend',
    BATTLE_MASTER: 'Battle Master',
    DISPUTE_RESOLVER: 'Dispute Resolver',
    TRUSTED_TRADER: 'Trusted Trader',
    EARLY_ADOPTER: 'Early Adopter',
    UNKNOWN: 'Unknown Achievement'
  }

  return achievementNames[achievementId] || achievementId
}

async function handler(
  req: NextRequest,
  _context: { session: any; params?: any }
) {
  try {
    const { searchParams } = new URL(req.url)
    const chainId = parseInt(searchParams.get('chainId') || '')

    const contractAddress = getAchievementNFTAddress(chainId)
    const chainName = getChainNickname(chainId)

    if (!contractAddress) {
      const supportedChains = getSupportedChainIds()
        .map(id => getChainConfig(id))
        .filter(config => config && getAchievementNFTAddress(config.chainId))
        .map(config => config.name)

      return NextResponse.json(
        {
          type: 'configuration_error',
          error: 'Smart contract not configured for this network',
          chainId,
          chainName: chainName || `Chain ${chainId}`,
          supportedChains
        },
        { status: 404 }
      )
    }

    // Create service instance
    const achievementService = new AchievementNFTService(chainId)
    if (!achievementService.contractAddress) {
      return NextResponse.json(
        {
          type: 'service_error',
          error: 'Failed to initialize achievement service',
          chainId,
          chainName
        },
        { status: 500 }
      )
    }

    // Fetch all contract data in parallel using the service
    const [stats, isPaused, owner, totalSupply, baseUri, recentEvents] =
      await Promise.all([
        achievementService.getAchievementStats(),
        achievementService.isPaused(),
        achievementService.getOwner(),
        achievementService.totalSupply(),
        achievementService.getBaseURI(),
        achievementService.getRecentMints(10)
      ])

    // Map events to recent mints
    const recentMints = recentEvents.map((event: any) => ({
      tokenId: Number(event.args?.tokenId || 0),
      recipient: event.args?.recipient || ZERO_ADDRESS,
      achievementId: event.args?.achievementId || 'UNKNOWN',
      achievementType: getAchievementName(event.args?.achievementId),
      timestamp: new Date(Number(event.blockNumber || 0) * 1000).toISOString(),
      transactionHash: event.transactionHash
    }))

    // Get most common achievement from all events
    const allEvents =
      await achievementService.getAchievementEvents('AchievementMinted')
    const achievementCounts: Record<string, number> = {}
    allEvents.forEach((event: any) => {
      const achievementId = event.args?.achievementId || 'UNKNOWN'
      achievementCounts[achievementId] =
        (achievementCounts[achievementId] || 0) + 1
    })

    const mostCommonAchievement =
      Object.entries(achievementCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      'None'

    // Calculate additional stats
    const totalMinted = stats.totalMinted
    const uniqueHolders = stats.uniqueHolders
    const totalAchievementTypes = stats.totalAchievementTypes
    const averagePerUser = uniqueHolders > 0 ? totalMinted / uniqueHolders : 0

    // Use default base URI if not set in contract
    const finalBaseUri =
      baseUri || `${envPublic.NEXT_PUBLIC_APP_URL}/api/metadata/`

    return NextResponse.json({
      stats: {
        totalMinted,
        uniqueHolders,
        totalAchievementTypes,
        mostCommonAchievement: getAchievementName(mostCommonAchievement),
        recentMints: recentMints.length,
        averagePerUser: parseFloat(averagePerUser.toFixed(1)),
        totalSupply
      },
      recentMints,
      settings: {
        isPaused,
        owner,
        baseUri: finalBaseUri
      },
      contractInfo: {
        address: contractAddress,
        chainId,
        chainName
      }
    })
  } catch (error) {
    console.error('Error fetching achievement stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract data' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
