import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { okxDexClient } from '@/lib/api/okx-dex-client'
import { getSession } from '@/lib/auth/session'
import {
  getCachedTokenDecimals,
  toSmallestUnit,
  fromSmallestUnit
} from '@/lib/utils/token-helpers'

const SwapRequestSchema = z.object({
  fromToken: z.string(),
  toToken: z.string(),
  fromAmount: z.string(),
  toAmount: z.string(),
  slippage: z.number().optional().default(0.5),
  userAddress: z.string(),
  chainId: z.number(),
  tx: z
    .object({
      from: z.string(),
      to: z.string(),
      data: z.string(),
      value: z.string(),
      gas: z.string().optional()
    })
    .optional()
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = SwapRequestSchema.parse(body)

    // Get actual token decimals from chain with caching
    const fromDecimals = await getCachedTokenDecimals(
      validatedData.fromToken,
      validatedData.chainId.toString()
    )

    // Convert amount to smallest unit based on actual decimals
    const amountInSmallestUnit = toSmallestUnit(
      validatedData.fromAmount,
      fromDecimals
    )

    // Execute swap using OKX DEX client
    const swapResponse = await okxDexClient.executeSwap({
      chainId: validatedData.chainId.toString(),
      fromTokenAddress: validatedData.fromToken,
      toTokenAddress: validatedData.toToken,
      amount: amountInSmallestUnit,
      slippage: validatedData.slippage.toString(),
      userWalletAddress: validatedData.userAddress
    })

    if (!swapResponse || !swapResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            swapResponse?.error ||
            'Unable to execute swap. Please try again later.',
          message: 'Failed to get swap data from OKX'
        },
        { status: 503 }
      )
    }

    // Extract transaction data from OKX response
    const txData = swapResponse.data?.tx
    if (!txData) {
      return NextResponse.json(
        {
          success: false,
          error: 'No transaction data available',
          message: 'Unable to build transaction'
        },
        { status: 400 }
      )
    }

    // Format transaction for frontend execution
    const formattedTx = {
      from: txData.from || validatedData.userAddress,
      to: txData.to,
      data: txData.data,
      value: txData.value || '0',
      gas: txData.gas,
      gasPrice: txData.gasPrice,
      maxPriorityFeePerGas: txData.maxPriorityFeePerGas,
      minReceiveAmount: txData.minReceiveAmount
    }

    // Get actual toToken decimals
    const toDecimals = await getCachedTokenDecimals(
      validatedData.toToken,
      validatedData.chainId.toString()
    )

    // Convert toAmount back to readable format using actual decimals
    const toAmount = swapResponse.data?.toAmount
    const toAmountReadable = toAmount
      ? fromSmallestUnit(toAmount, toDecimals)
      : validatedData.toAmount

    // Return transaction data for the frontend to execute
    return NextResponse.json({
      success: true,
      tx: formattedTx,
      fromToken: validatedData.fromToken,
      toToken: validatedData.toToken,
      fromAmount: validatedData.fromAmount,
      toAmount: toAmountReadable,
      status: 'ready',
      message: 'Transaction prepared successfully',
      routerAddress: txData.to,
      estimatedGas: txData.gas,
      signatureData: txData.signatureData
    })
  } catch (error) {
    console.error('Swap execution error:', error)

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('No swap data')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unable to prepare swap transaction',
            details: 'Liquidity or price has changed. Please refresh quote.'
          },
          { status: 400 }
        )
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            details: 'Please try again in a few seconds'
          },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute swap',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
