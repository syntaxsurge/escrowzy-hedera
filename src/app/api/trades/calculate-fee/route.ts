import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { withEscrowValidation } from '@/lib/blockchain/contract-validation'
import { EscrowCoreService } from '@/services/blockchain/escrow-core.service'
import { SubscriptionManagerService } from '@/services/blockchain/subscription-manager.service'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { amount, chainId, userAddress } = body

    if (!amount || !chainId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: amount and chainId'
        },
        { status: 400 }
      )
    }

    // Use the user's wallet address if provided, otherwise use session wallet
    const address = userAddress || session.user.walletAddress
    if (!address) {
      return NextResponse.json(
        { success: false, error: 'No wallet address available' },
        { status: 400 }
      )
    }

    // Create escrow service for the specified chain
    const escrowService = new EscrowCoreService(chainId)
    if (!escrowService.contractAddress) {
      return NextResponse.json(
        { success: false, error: 'Service not available for this chain' },
        { status: 400 }
      )
    }

    // Calculate fee securely on the server side using the service method
    const feeData = await escrowService.calculateUserFee(address, amount)

    return NextResponse.json({
      success: true,
      feePercentage: feeData.feePercentage,
      feeAmount: feeData.feeAmount,
      netAmount: feeData.netAmount,
      chainId,
      userAddress: address
    })
  } catch (error) {
    console.error('Error calculating fee:', error)

    // Return specific error message if available
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to calculate fee'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details:
          'Unable to fetch fee tier from blockchain. Please ensure contracts are deployed on the selected network.'
      },
      { status: 500 }
    )
  }
}

// GET endpoint using centralized validation
export const GET = withEscrowValidation(
  async ({ escrowService, chainId, session }) => {
    const address = session.user.walletAddress
    if (!address) {
      throw new Error('No wallet address available')
    }

    // Get user's fee percentage using the service
    const feePercentage = await escrowService.getUserFeePercentage(address)

    // Get all plan fee tiers from subscription service
    const subscriptionService = new SubscriptionManagerService(chainId)
    const planFeeTiers = subscriptionService.contractAddress
      ? await subscriptionService.getAllPlanFeeTiers()
      : {}

    return {
      userFeePercentage: feePercentage,
      planFeeTiers,
      chainId,
      userAddress: address
    }
  }
)
