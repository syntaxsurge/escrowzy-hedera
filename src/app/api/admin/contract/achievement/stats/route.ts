import { NextRequest, NextResponse } from 'next/server'

import { ZERO_ADDRESS } from 'thirdweb'
import { createPublicClient, http } from 'viem'

import { envPublic } from '@/config/env.public'
import { withAdminAuth } from '@/lib/api/auth-middleware'
import {
  getAchievementNFTAddress,
  getViemChain,
  ACHIEVEMENT_NFT_ABI,
  getSupportedChainIds,
  getChainConfig
} from '@/lib/blockchain'

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
    const chain = getViemChain(chainId)

    if (!contractAddress || !chain) {
      const supportedChains = getSupportedChainIds()
        .map(id => getChainConfig(id))
        .filter(config => config && getAchievementNFTAddress(config.chainId))
        .map(config => config.name)

      return NextResponse.json(
        {
          type: 'configuration_error',
          error: 'Smart contract not configured for this network',
          chainId,
          chainName: chain?.name || `Chain ${chainId}`,
          supportedChains
        },
        { status: 404 }
      )
    }

    // Create public client for reading contract
    const publicClient = createPublicClient({
      chain,
      transport: http()
    })

    // Fetch all contract data in parallel
    const [stats, paused, owner, totalSupply] = await Promise.all([
      publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ACHIEVEMENT_NFT_ABI,
        functionName: 'getAchievementStats'
      }),
      publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ACHIEVEMENT_NFT_ABI,
        functionName: 'paused'
      }),
      publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ACHIEVEMENT_NFT_ABI,
        functionName: 'owner'
      }),
      publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ACHIEVEMENT_NFT_ABI,
        functionName: 'totalSupply'
      })
    ])

    // Type assertions
    const achievementStats = stats as readonly [bigint, bigint, bigint]
    const isPaused = paused as boolean
    const contractOwner = owner as string
    const supply = totalSupply as bigint

    // Calculate additional stats
    const totalMinted = Number(achievementStats[0])
    const uniqueHolders = Number(achievementStats[1])
    const totalAchievementTypes = Number(achievementStats[2])
    const averagePerUser = uniqueHolders > 0 ? totalMinted / uniqueHolders : 0

    // Query recent mint events from the blockchain
    const recentEvents = await publicClient.getContractEvents({
      address: contractAddress as `0x${string}`,
      abi: ACHIEVEMENT_NFT_ABI,
      eventName: 'AchievementMinted',
      fromBlock: 'earliest',
      toBlock: 'latest'
    })

    // Map events to recent mints (take last 10)
    const recentMints = recentEvents
      .slice(-10)
      .reverse()
      .map((event: any) => ({
        tokenId: Number(event.args?.tokenId || 0),
        recipient: event.args?.recipient || ZERO_ADDRESS,
        achievementId: event.args?.achievementId || 'UNKNOWN',
        achievementType: getAchievementName(event.args?.achievementId),
        timestamp: new Date(Number(event.blockNumber) * 1000).toISOString(),
        transactionHash: event.transactionHash
      }))

    // Get most common achievement from events
    const achievementCounts: Record<string, number> = {}
    recentEvents.forEach((event: any) => {
      const achievementId = event.args?.achievementId || 'UNKNOWN'
      achievementCounts[achievementId] =
        (achievementCounts[achievementId] || 0) + 1
    })

    const mostCommonAchievement =
      Object.entries(achievementCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      'None'

    // Get base URI from contract if available
    let baseUri = `${envPublic.NEXT_PUBLIC_APP_URL}/api/metadata/`
    try {
      const uri = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ACHIEVEMENT_NFT_ABI,
        functionName: 'baseURI'
      })
      if (uri) baseUri = uri as string
    } catch {
      // Contract might not have baseURI function
    }

    return NextResponse.json({
      stats: {
        totalMinted,
        uniqueHolders,
        totalAchievementTypes,
        mostCommonAchievement: getAchievementName(mostCommonAchievement),
        recentMints: recentMints.length,
        averagePerUser: parseFloat(averagePerUser.toFixed(1)),
        totalSupply: Number(supply)
      },
      recentMints,
      settings: {
        isPaused,
        owner: contractOwner,
        baseUri
      },
      contractInfo: {
        address: contractAddress,
        chainId,
        chainName: chain.name
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
