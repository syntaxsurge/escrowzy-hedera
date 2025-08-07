import { NextRequest, NextResponse } from 'next/server'

import { getCryptoPrice } from '@/lib/api/coingecko'
import {
  getCoingeckoPriceId,
  getNativeCurrencyDecimals
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

    // Get the CoinGecko ID for the chain
    const coingeckoId = getCoingeckoPriceId(chainId)
    if (!coingeckoId) {
      return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 })
    }

    // Get the current price of the native token
    const nativePrice = await getCryptoPrice(coingeckoId)

    // Convert USD to native currency
    const usdValue = parseFloat(usdAmount)
    const nativeAmount = usdValue / nativePrice

    // Get chain-specific decimals for proper formatting
    const decimals = getNativeCurrencyDecimals(chainId)
    // Use half the decimals for display (e.g., 9 for 18-decimal chains, 4 for 8-decimal chains)
    const displayDecimals = Math.ceil(decimals / 2)
    const formattedAmount = nativeAmount.toFixed(displayDecimals)

    return NextResponse.json({
      success: true,
      data: {
        nativeAmount: formattedAmount,
        nativePrice,
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
