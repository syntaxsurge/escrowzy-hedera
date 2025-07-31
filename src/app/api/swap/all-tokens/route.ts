import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { okxDexClient } from '@/lib/api/okx-dex-client'

const AllTokensRequestSchema = z.object({
  chainId: z.number()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = AllTokensRequestSchema.parse(body)

    const tokens = await okxDexClient.getAllTokens(
      validatedData.chainId.toString()
    )

    return NextResponse.json({
      success: true,
      tokens
    })
  } catch (error) {
    console.error('All tokens API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch all tokens',
        tokens: []
      },
      { status: 500 }
    )
  }
}
