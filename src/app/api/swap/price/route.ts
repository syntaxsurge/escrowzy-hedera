import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { okxDexClient } from '@/lib/api/okx-dex-client'

const PriceRequestSchema = z.object({
  tokenAddress: z.string(),
  chainId: z.number()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = PriceRequestSchema.parse(body)

    // Get market data from OKX DEX client
    const marketData = await okxDexClient.getMarketData(
      validatedData.tokenAddress,
      validatedData.chainId.toString()
    )

    if (!marketData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to fetch price data',
          price: 0,
          change24h: 0,
          volume24h: 0,
          marketCap: 0
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      price: marketData.price,
      change24h: marketData.priceChange24h || 0,
      volume24h: marketData.volume24h || 0,
      marketCap: marketData.marketCap || 0
    })
  } catch (error) {
    console.error('Price API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch price',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
