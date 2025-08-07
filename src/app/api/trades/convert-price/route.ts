import { NextRequest, NextResponse } from 'next/server'

import { getCachedPrice } from '@/lib/api/price-service'
import {
  getCoingeckoPriceId,
  getNativeCurrencyDecimals,
  getNativeCurrencySymbol
} from '@/lib/blockchain'

export async function POST(request: NextRequest) {
  try {
    const { usdAmount, chainId } = await request.json()

    if (!usdAmount || !chainId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get the CoinGecko ID and symbol for the chain
    const coingeckoId = getCoingeckoPriceId(chainId)
    if (!coingeckoId) {
      return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 })
    }
    const symbol = getNativeCurrencySymbol(chainId)

    // Get the current price of the native token using fallback service
    const priceResult = await getCachedPrice(coingeckoId, {
      symbol,
      coingeckoId
    })

    if (!priceResult || priceResult.price <= 0) {
      return NextResponse.json(
        { error: 'Unable to fetch current price' },
        { status: 500 }
      )
    }

    // Convert USD to native currency
    const usdValue = parseFloat(usdAmount)
    const nativeAmount = usdValue / priceResult.price

    // Get chain-specific decimals for proper formatting
    const decimals = getNativeCurrencyDecimals(chainId)
    // Use half the decimals for display (e.g., 9 for 18-decimal chains, 4 for 8-decimal chains)
    const displayDecimals = Math.ceil(decimals / 2)
    const formattedAmount = nativeAmount.toFixed(displayDecimals)

    return NextResponse.json({
      success: true,
      data: {
        nativeAmount: formattedAmount,
        nativePrice: priceResult.price,
        usdAmount,
        chainId
      }
    })
  } catch (error) {
    console.error('Price conversion error:', error)
    return NextResponse.json(
      { error: 'Failed to convert price' },
      { status: 500 }
    )
  }
}
