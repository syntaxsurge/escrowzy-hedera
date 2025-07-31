import { NextRequest, NextResponse } from 'next/server'

import { createPublicClient, http, formatEther } from 'viem'

import { withAdminAuth } from '@/lib/api/auth-middleware'
import {
  getEscrowCoreAddress,
  getViemChain,
  ESCROW_CORE_ABI,
  getSupportedChainIds,
  getChainConfig
} from '@/lib/blockchain'

async function handler(
  req: NextRequest,
  _context: { session: any; params?: any }
) {
  try {
    const { searchParams } = new URL(req.url)
    const chainId = parseInt(searchParams.get('chainId') || '')

    const contractAddress = getEscrowCoreAddress(chainId)
    const chain = getViemChain(chainId)

    if (!contractAddress || !chain) {
      const supportedChains = getSupportedChainIds()
        .map(id => getChainConfig(id))
        .filter(config => config && getEscrowCoreAddress(config.chainId))
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
    const [
      stats,
      availableFees,
      feePercentage,
      disputeWindow,
      feeRecipient,
      isPaused
    ] = await Promise.all([
      publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ESCROW_CORE_ABI,
        functionName: 'getEscrowStats'
      }),
      publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ESCROW_CORE_ABI,
        functionName: 'getAvailableFees'
      }),
      publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ESCROW_CORE_ABI,
        functionName: 'baseFeePercentage'
      }),
      publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ESCROW_CORE_ABI,
        functionName: 'defaultDisputeWindow'
      }),
      publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ESCROW_CORE_ABI,
        functionName: 'feeRecipient'
      }),
      publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ESCROW_CORE_ABI,
        functionName: 'paused'
      })
    ])

    const nativeCurrency = chain.nativeCurrency.symbol
    // Type assertion for stats tuple
    const escrowStats = stats as readonly [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint
    ]
    const totalVolume = formatEther(escrowStats[4])
    const totalFeesCollected = formatEther(escrowStats[5])
    const availableFeesFormatted = formatEther(availableFees as bigint)

    // Calculate average values
    const totalEscrows = Number(escrowStats[0])
    const averageEscrowValue =
      totalEscrows > 0 ? parseFloat(totalVolume) / totalEscrows : 0
    const disputeRate =
      totalEscrows > 0 ? (Number(escrowStats[3]) / totalEscrows) * 100 : 0

    return NextResponse.json({
      stats: {
        totalEscrows: Number(escrowStats[0]),
        activeEscrows: Number(escrowStats[1]),
        completedEscrows: Number(escrowStats[2]),
        disputedEscrows: Number(escrowStats[3]),
        totalVolume,
        totalFeesCollected,
        availableFees: availableFeesFormatted,
        averageEscrowValue: averageEscrowValue.toFixed(4),
        disputeRate: disputeRate.toFixed(1),
        averageCompletionTime: 72, // This would need event tracking in production
        nativeCurrency
      },
      settings: {
        feePercentage: Number(feePercentage as bigint) / 100, // Convert basis points to percentage
        disputeWindow: Number(disputeWindow as bigint),
        isPaused: isPaused as boolean,
        feeRecipient: feeRecipient as string
      },
      contractInfo: {
        address: contractAddress,
        chainId,
        chainName: chain.name
      }
    })
  } catch (error) {
    console.error('Error fetching escrow stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract data' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
