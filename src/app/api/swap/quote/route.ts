import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { okxDexClient } from '@/lib/api/okx-dex-client'
import {
  getCachedTokenDecimals,
  toSmallestUnit,
  fromSmallestUnit
} from '@/lib/utils/token-helpers'

const QuoteRequestSchema = z.object({
  fromToken: z.string(),
  toToken: z.string(),
  fromAmount: z.string(),
  chainId: z.number(),
  slippage: z.number().optional().default(0.5)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = QuoteRequestSchema.parse(body)

    // Debug logging for quote parameters
    console.log('Quote request parameters:', {
      fromToken: validatedData.fromToken,
      toToken: validatedData.toToken,
      fromAmount: validatedData.fromAmount,
      chainId: validatedData.chainId,
      slippage: validatedData.slippage
    })

    // Validate amount
    const amountValue = parseFloat(validatedData.fromAmount)
    if (isNaN(amountValue) || amountValue <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid amount',
          details: 'Amount must be a positive number'
        },
        { status: 400 }
      )
    }

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

    console.log('Converted amount:', {
      originalAmount: validatedData.fromAmount,
      decimals: fromDecimals,
      smallestUnit: amountInSmallestUnit
    })

    // Get quote from OKX DEX client
    const quoteResponse = await okxDexClient.getSwapQuote({
      chainId: validatedData.chainId.toString(),
      fromTokenAddress: validatedData.fromToken,
      toTokenAddress: validatedData.toToken,
      amount: amountInSmallestUnit,
      slippage: validatedData.slippage.toString()
    })

    console.log('OKX quote response:', {
      success: !!quoteResponse,
      toAmount: quoteResponse?.toAmount,
      priceImpact: quoteResponse?.priceImpact,
      route: quoteResponse?.route
    })

    if (!quoteResponse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to fetch quote. Please try again later.',
          message: 'No liquidity available for this trade'
        },
        { status: 503 }
      )
    }

    // Get actual toToken decimals
    const toDecimals = quoteResponse.toToken?.decimal
      ? parseInt(quoteResponse.toToken.decimal)
      : await getCachedTokenDecimals(
          validatedData.toToken,
          validatedData.chainId.toString()
        )

    console.log('Converting toAmount:', {
      rawAmount: quoteResponse.toAmount,
      toToken: validatedData.toToken,
      toDecimals,
      quoteResponseToToken: quoteResponse.toToken
    })

    // Convert toAmount back to readable format using actual decimals
    const toAmountReadable = quoteResponse.toAmount
      ? fromSmallestUnit(quoteResponse.toAmount, toDecimals)
      : '0'

    console.log('Converted toAmount:', {
      readable: toAmountReadable,
      toDecimals
    })

    // Calculate minimum amount after slippage
    const minAmount = toAmountReadable
      ? (
          parseFloat(toAmountReadable) *
          (1 - validatedData.slippage / 100)
        ).toString()
      : '0'

    const responseData = {
      fromToken: validatedData.fromToken,
      toToken: validatedData.toToken,
      fromAmount: validatedData.fromAmount,
      toAmount: toAmountReadable,
      priceImpact: quoteResponse.priceImpact || 0,
      estimatedGas: quoteResponse.estimatedGas || '0',
      route: quoteResponse.route || 'Direct',
      exchangeRate: quoteResponse.exchangeRate || '0',
      liquiditySources: quoteResponse.liquiditySources || [],
      minReceiveAmount: minAmount,
      estimateGasFee: quoteResponse.estimateGasFee || '0',
      quoteCompareList: quoteResponse.quoteCompareList || [],
      fromTokenInfo: quoteResponse.fromToken,
      toTokenInfo: quoteResponse.toToken
    }

    console.log('Sending quote response:', {
      toAmount: responseData.toAmount,
      route: responseData.route,
      priceImpact: responseData.priceImpact
    })

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Quote API error:', error)

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('No quote available')) {
        return NextResponse.json(
          {
            success: false,
            error: 'No liquidity available for this pair',
            details: 'Try a different token pair or smaller amount'
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
        error: 'Failed to fetch quote',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
