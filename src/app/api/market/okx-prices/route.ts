import { NextRequest, NextResponse } from 'next/server'

import { okxDexClient } from '@/lib/api/okx-dex-client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chainName = searchParams.get('chain')
    const tokenAddress = searchParams.get('tokenAddress')
    const fromToken = searchParams.get('fromToken')

    if (!chainName) {
      return NextResponse.json(
        { error: 'Chain name is required' },
        { status: 400 }
      )
    }

    const chainId = await okxDexClient.getChainId(chainName)
    if (!chainId) {
      return NextResponse.json({ error: 'Invalid chain name' }, { status: 400 })
    }

    if (tokenAddress || fromToken) {
      // Use fromToken if tokenAddress is not provided (for backward compatibility)
      const tokenToPrice = tokenAddress || fromToken
      if (!tokenToPrice) {
        return NextResponse.json(
          { error: 'Token address is required' },
          { status: 400 }
        )
      }

      const price = await okxDexClient.getOKXMarketPrice(chainId, tokenToPrice)

      return NextResponse.json({
        success: true,
        data: {
          chainId,
          tokenAddress: tokenToPrice,
          price
        }
      })
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  } catch (error) {
    console.error('OKX DEX price API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OKX DEX prices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chainName, tokenAddresses } = body

    if (!chainName || !tokenAddresses || !Array.isArray(tokenAddresses)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const chainId = await okxDexClient.getChainId(chainName)
    if (!chainId) {
      return NextResponse.json({ error: 'Invalid chain name' }, { status: 400 })
    }

    const prices = await Promise.all(
      tokenAddresses.map(async (tokenAddress: string) => {
        const price = await okxDexClient.getOKXMarketPrice(
          chainId,
          tokenAddress
        )
        return {
          tokenAddress,
          price
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: prices
    })
  } catch (error) {
    console.error('OKX DEX batch price API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OKX DEX prices' },
      { status: 500 }
    )
  }
}
