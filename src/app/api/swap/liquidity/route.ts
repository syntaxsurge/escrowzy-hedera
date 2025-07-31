import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { okxDexClient } from '@/lib/api/okx-dex-client'

const LiquidityRequestSchema = z.object({
  chainId: z.number()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = LiquidityRequestSchema.parse(body)

    // Check if chain is supported by OKX
    const chainIdStr = validatedData.chainId.toString()
    if (!okxDexClient.isChainSupported(chainIdStr)) {
      // Return empty liquidity sources for unsupported chains
      return NextResponse.json({
        success: true,
        liquiditySources: [],
        message: 'Chain not supported by OKX DEX'
      })
    }

    const response = await okxDexClient.getLiquiditySources(chainIdStr)

    return NextResponse.json({
      success: true,
      liquiditySources: response.liquiditySources || []
    })
  } catch (error) {
    console.error('Liquidity API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch liquidity sources',
        liquiditySources: []
      },
      { status: 500 }
    )
  }
}
