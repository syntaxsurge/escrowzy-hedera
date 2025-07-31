import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { okxDexClient } from '@/lib/api/okx-dex-client'

const TokenListRequestSchema = z.object({
  chainId: z.number(),
  query: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = TokenListRequestSchema.parse(body)

    // Check if chain is supported by OKX
    const chainIdStr = validatedData.chainId.toString()

    console.log('Token request:', {
      chainId: chainIdStr,
      query: validatedData.query,
      isSupported: okxDexClient.isChainSupported(chainIdStr)
    })

    if (!okxDexClient.isChainSupported(chainIdStr)) {
      // Return empty token list for unsupported chains
      return NextResponse.json({
        success: true,
        tokens: [],
        message: 'Chain not supported by OKX DEX'
      })
    }

    // If query provided, search tokens; otherwise get all tokens
    const tokens = validatedData.query
      ? await okxDexClient.searchTokens(chainIdStr, validatedData.query)
      : await okxDexClient.getPopularTokens(chainIdStr) // This now returns all tokens

    console.log(`Returning ${tokens.length} tokens for chain ${chainIdStr}`)

    // Ensure we have valid token data
    const validTokens = tokens.filter(
      (token: any) =>
        token.tokenContractAddress && token.tokenSymbol && token.tokenName
    )

    return NextResponse.json({
      success: true,
      tokens: validTokens,
      totalCount: validTokens.length
    })
  } catch (error) {
    console.error('Token list API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tokens',
        tokens: [],
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
