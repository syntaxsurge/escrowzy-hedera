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

    // Create fee validation service for the specified chain
    const feeService = new FeeValidationService(chainId)

    // Calculate fee securely on the server side
    const feeData = await feeService.calculateUserFee(address, amount)

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

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const chainId = parseInt(searchParams.get('chainId') || '1')

    const address = session.user.walletAddress
    if (!address) {
      return NextResponse.json(
        { success: false, error: 'No wallet address available' },
        { status: 400 }
      )
    }

    // Create fee validation service for the specified chain
    const feeService = new FeeValidationService(chainId)

    // Get user's fee percentage
    const feePercentage = await feeService.getUserFeePercentage(address)

    // Get all plan fee tiers
    const planFeeTiers = await feeService.getAllPlanFeeTiers()

    return NextResponse.json({
      success: true,
      userFeePercentage: feePercentage,
      planFeeTiers,
      chainId,
      userAddress: address
    })
  } catch (error) {
    console.error('Error fetching fee information:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch fee information'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    )
  }
}
