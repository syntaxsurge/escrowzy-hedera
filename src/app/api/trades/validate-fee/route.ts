import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { FeeValidationService } from '@/services/blockchain/fee-validation'

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

    // Create fee validation service for the specified chain
    const feeService = new FeeValidationService(chainId)

    // Validate the client-provided fee
    const isValid = await feeService.validateClientFee(
      address,
      amount,
      clientFee
    )

    if (!isValid) {
      // If validation fails, calculate the correct fee
      const correctFee = await feeService.calculateUserFee(address, amount)

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
