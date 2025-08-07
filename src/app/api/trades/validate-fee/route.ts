import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { EscrowCoreService } from '@/services/blockchain/escrow-core.service'

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
    const { amount, chainId, userAddress, clientFee } = body

    if (!amount || !chainId || clientFee === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: amount, chainId, and clientFee'
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

    // Validate the client-provided fee using the service method
    const isValid = await escrowService.validateClientFee(
      address,
      amount,
      clientFee
    )

    if (!isValid) {
      // If validation fails, calculate the correct fee using the service
      const correctFee = await escrowService.calculateUserFee(address, amount)

      return NextResponse.json({
        success: false,
        isValid: false,
        error: 'Invalid fee amount',
        correctFee: {
          feePercentage: correctFee.feePercentage,
          feeAmount: correctFee.feeAmount,
          netAmount: correctFee.netAmount
        },
        providedFee: clientFee
      })
    }

    return NextResponse.json({
      success: true,
      isValid: true,
      message: 'Fee validation successful'
    })
  } catch (error) {
    console.error('Error validating fee:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to validate fee'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details:
          'Unable to validate fee against blockchain. Please ensure contracts are deployed.'
      },
      { status: 500 }
    )
  }
}
