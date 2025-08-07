import { NextRequest, NextResponse } from 'next/server'

import { withAdminAuth } from '@/lib/api/auth-middleware'
import {
  getEscrowCoreAddress,
  getSupportedChainIds,
  getChainConfig,
  getChainNickname,
  getNativeCurrencySymbol
} from '@/lib/blockchain'
import { formatNativeAmount } from '@/lib/utils/token-helpers'
import { EscrowCoreService } from '@/services/blockchain/escrow-core.service'

async function handler(
  req: NextRequest,
  _context: { session: any; params?: any }
) {
  try {
    const { searchParams } = new URL(req.url)
    const chainId = parseInt(searchParams.get('chainId') || '')

    const contractAddress = getEscrowCoreAddress(chainId)
    const chainName = getChainNickname(chainId)

    if (!contractAddress) {
      const supportedChains = getSupportedChainIds()
        .map(id => getChainConfig(id))
        .filter(config => config && getEscrowCoreAddress(config.chainId))
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
    const escrowService = new EscrowCoreService(chainId)
    if (!escrowService.contractAddress) {
      return NextResponse.json(
        {
          type: 'service_error',
          error: 'Failed to initialize escrow service',
          chainId,
          chainName
        },
        { status: 500 }
      )
    }

    // Fetch all contract data in parallel using the service
    const [
      stats,
      availableFees,
      feePercentage,
      disputeWindow,
      feeRecipient,
      isPaused
    ] = await Promise.all([
      escrowService.getEscrowStats(),
      escrowService.getAvailableFees(),
      escrowService.getBaseFeePercentage(),
      escrowService.getDefaultDisputeWindow(),
      escrowService.getFeeRecipient(),
      escrowService.isPaused()
    ])

    const nativeCurrency = getNativeCurrencySymbol(chainId)
    const totalVolume = formatNativeAmount(stats.totalVolume, chainId)
    const totalFeesCollected = formatNativeAmount(
      stats.totalFeesCollected,
      chainId
    )
    const availableFeesFormatted = formatNativeAmount(availableFees, chainId)

    // Calculate average values
    const totalEscrows = stats.totalEscrows
    const averageEscrowValue =
      totalEscrows > 0 ? parseFloat(totalVolume) / totalEscrows : 0
    const disputeRate =
      totalEscrows > 0 ? (stats.disputedEscrows / totalEscrows) * 100 : 0

    return NextResponse.json({
      stats: {
        totalEscrows: stats.totalEscrows,
        activeEscrows: stats.activeEscrows,
        completedEscrows: stats.completedEscrows,
        disputedEscrows: stats.disputedEscrows,
        totalVolume,
        totalFeesCollected,
        availableFees: availableFeesFormatted,
        averageEscrowValue: averageEscrowValue.toFixed(4),
        disputeRate: disputeRate.toFixed(1),
        averageCompletionTime: 72, // This would need event tracking in production
        nativeCurrency
      },
      settings: {
        feePercentage,
        disputeWindow,
        isPaused,
        feeRecipient
      },
      contractInfo: {
        address: contractAddress,
        chainId,
        chainName
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
