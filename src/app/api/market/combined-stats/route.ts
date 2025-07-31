import { NextRequest, NextResponse } from 'next/server'

import { NATIVE_TOKEN_ADDRESS } from 'thirdweb'

import { getCryptoPrice } from '@/lib/api/coingecko'
import { okxDexClient } from '@/lib/api/okx-dex-client'

export interface MarketStats {
  chain: string
  tokenAddress?: string
  okxDexPrice: number | null
  okxDexError?: {
    type:
      | 'rate_limit'
      | 'chain_not_supported'
      | 'token_not_found'
      | 'api_error'
      | 'credentials_missing'
      | 'network_error'
    message: string
  }
  coingeckoPrice: number | null
  averagePrice: number | null
  priceSpread: number | null
  lastUpdated: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chainName = searchParams.get('chain')
    const tokenAddress = searchParams.get('tokenAddress')
    const coingeckoId = searchParams.get('coingeckoId')

    console.log('[Combined Stats API] Request params:', {
      chainName,
      tokenAddress,
      coingeckoId
    })

    if (!chainName) {
      return NextResponse.json(
        { error: 'Chain name is required' },
        { status: 400 }
      )
    }

    let okxDexPrice: number | null = null
    let okxDexError: MarketStats['okxDexError'] = undefined
    let coingeckoPrice: number | null = null

    // Map chain name to chain ID - handle special cases
    let chainIdForLookup: string | null = null

    // Handle numeric chain IDs passed as chain name
    if (/^\d+$/.test(chainName)) {
      chainIdForLookup = chainName
    } else {
      // Get chain ID from name (now async)
      chainIdForLookup = await okxDexClient.getChainId(chainName)
    }

    console.log('[Combined Stats API] Chain resolution:', {
      inputChainName: chainName,
      resolvedChainId: chainIdForLookup,
      coingeckoId
    })

    // Try to get prices from both sources for better coverage
    // Fetch OKX DEX price if we have a chain ID and either:
    // 1. A specific token address (including 'native')
    // 2. No token address and no coingeckoId (implying native token)
    // But only for chains that OKX actually supports
    if (chainIdForLookup) {
      // Check if this chain is supported by OKX
      const isChainSupported =
        await okxDexClient.isChainSupported(chainIdForLookup)

      if (isChainSupported) {
        // Determine what to fetch from OKX
        let okxTokenAddress: string | undefined

        if (tokenAddress) {
          // Use the provided token address (including 'native' which we'll convert)
          okxTokenAddress =
            tokenAddress === 'native' ? NATIVE_TOKEN_ADDRESS : tokenAddress
        } else if (!coingeckoId) {
          // No token and no coingeckoId means we want native token
          okxTokenAddress = NATIVE_TOKEN_ADDRESS
        }

        // Fetch OKX price if we have something to query
        if (okxTokenAddress) {
          try {
            console.log('[Combined Stats API] Fetching OKX price:', {
              chainId: chainIdForLookup,
              tokenAddress: okxTokenAddress
            })
            const okxResult = await okxDexClient.getCachedTokenPrice(
              okxTokenAddress,
              chainIdForLookup
            )
            okxDexPrice = okxResult.price
            okxDexError = okxResult.error
            console.log('[Combined Stats API] OKX DEX result:', okxResult)
          } catch (error) {
            console.error(
              '[Combined Stats API] Failed to get OKX DEX price:',
              error
            )
          }
        }
      } else {
        // Chain not supported by OKX
        okxDexError = {
          type: 'chain_not_supported' as const,
          message: `Chain ${chainName} is not supported by OKX DEX`
        }
        console.log(
          '[Combined Stats API] Chain not supported by OKX:',
          chainName
        )
      }
    }

    // Always try CoinGecko if we have a coingecko ID
    if (coingeckoId) {
      try {
        coingeckoPrice = await getCryptoPrice(coingeckoId, { revalidate: 300 })
        console.log('[Combined Stats API] CoinGecko price:', coingeckoPrice)
      } catch (error) {
        console.error(
          '[Combined Stats API] Failed to get CoinGecko price:',
          error
        )
      }
    }

    const averagePrice =
      okxDexPrice && coingeckoPrice
        ? (okxDexPrice + coingeckoPrice) / 2
        : okxDexPrice || coingeckoPrice

    const priceSpread =
      okxDexPrice && coingeckoPrice
        ? Math.abs(okxDexPrice - coingeckoPrice)
        : null

    const stats: MarketStats = {
      chain: chainName,
      tokenAddress: tokenAddress || undefined,
      okxDexPrice,
      okxDexError,
      coingeckoPrice,
      averagePrice,
      priceSpread,
      lastUpdated: new Date().toISOString()
    }

    console.log('[Combined Stats API] Final stats:', stats)

    // Return the data directly with cache headers
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
  } catch (error) {
    console.error('Combined market stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market statistics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokens } = body

    if (!tokens || !Array.isArray(tokens)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const statsPromises = tokens.map(
      async (token: {
        chainName: string
        tokenAddress?: string
        coingeckoId?: string
      }) => {
        const chainId = await okxDexClient.getChainId(token.chainName)
        let okxDexPrice: number | null = null
        let coingeckoPrice: number | null = null

        if (chainId && token.tokenAddress) {
          try {
            const priceResult = await okxDexClient.getOKXMarketPrice(
              token.tokenAddress,
              chainId
            )
            okxDexPrice = priceResult.price
          } catch (error) {
            console.error('Failed to get OKX DEX price:', error)
          }
        }

        if (token.coingeckoId) {
          try {
            coingeckoPrice = await getCryptoPrice(token.coingeckoId, {
              revalidate: 60
            })
          } catch (error) {
            console.error('Failed to get CoinGecko price:', error)
          }
        }

        const averagePrice =
          okxDexPrice && coingeckoPrice
            ? (okxDexPrice + coingeckoPrice) / 2
            : okxDexPrice || coingeckoPrice

        const priceSpread =
          okxDexPrice && coingeckoPrice
            ? Math.abs(okxDexPrice - coingeckoPrice)
            : null

        return {
          chain: token.chainName,
          tokenAddress: token.tokenAddress,
          okxDexPrice,
          coingeckoPrice,
          averagePrice,
          priceSpread,
          lastUpdated: new Date().toISOString()
        }
      }
    )

    const stats = await Promise.all(statsPromises)

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Combined market stats batch API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market statistics' },
      { status: 500 }
    )
  }
}
