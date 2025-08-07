import { NextRequest, NextResponse } from 'next/server'

import { getCachedPrice } from '@/lib/api/price-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, coingeckoId } = body

    if (!symbol && !coingeckoId) {
      return NextResponse.json(
        { error: 'Symbol or CoinGecko ID required' },
        { status: 400 }
      )
    }

    const priceResult = await getCachedPrice(coingeckoId || symbol, {
      symbol,
      coingeckoId
    })

    if (!priceResult || priceResult.price <= 0) {
      return NextResponse.json(
        { error: 'Unable to fetch price' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      price: priceResult.price,
      provider: priceResult.provider,
      timestamp: priceResult.timestamp
    })
  } catch (error) {
    console.error('Price API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    )
  }
}
