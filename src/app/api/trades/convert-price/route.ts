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
    const decimals = getNativeCurrencyDecimals(chainId)

    // Format with appropriate decimals
    const formattedAmount = nativeAmount.toFixed(decimals)

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
