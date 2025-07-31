import { NextRequest, NextResponse } from 'next/server'

import { okxDexClient } from '@/lib/api/okx-dex-client'
import { getChainIndex } from '@/lib/config/chain-mappings'

interface TrendingPair {
  from: {
    symbol: string
    address: string
    logo?: string
    price?: number
    priceChange24h?: number
  }
  to: {
    symbol: string
    address: string
    logo?: string
    price?: number
    priceChange24h?: number
  }
  volume24h?: string
  trades24h?: number
  priceChange?: number
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chainId = searchParams.get('chainId') || '1'
    const chainIndex = getChainIndex(chainId)

    // Get trending pairs for the chain
    const trendingPairs = await getTrendingPairs(chainIndex)

    return NextResponse.json({
      success: true,
      chainId,
      pairs: trendingPairs,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Trending pairs API error:', error)

    // Return default trending pairs on error
    return NextResponse.json({
      success: false,
      chainId: request.nextUrl.searchParams.get('chainId') || '1',
      pairs: getDefaultTrendingPairs(
        request.nextUrl.searchParams.get('chainId') || '1'
      ),
      lastUpdated: new Date().toISOString()
    })
  }
}

async function getTrendingPairs(chainIndex: string): Promise<TrendingPair[]> {
  try {
    // Get popular tokens for the chain
    const tokens = await okxDexClient.getAllTokens(chainIndex)

    // Get common trading pairs based on chain
    const pairs = getCommonPairsForChain(chainIndex)

    // Fetch price data for each token in parallel
    const trendingPairs: TrendingPair[] = []

    for (const pair of pairs) {
      const fromToken = tokens.tokens?.find(
        (t: any) =>
          t.tokenSymbol === pair.from ||
          t.tokenContractAddress?.toLowerCase() ===
            pair.fromAddress?.toLowerCase()
      )

      const toToken = tokens.tokens?.find(
        (t: any) =>
          t.tokenSymbol === pair.to ||
          t.tokenContractAddress?.toLowerCase() ===
            pair.toAddress?.toLowerCase()
      )

      if (fromToken && toToken) {
        // Try to get price info for both tokens
        const [fromPrice, toPrice] = await Promise.all([
          okxDexClient
            .getMarketPriceInfo(
              fromToken.tokenContractAddress || '',
              chainIndex
            )
            .catch(() => null),
          okxDexClient
            .getMarketPriceInfo(toToken.tokenContractAddress || '', chainIndex)
            .catch(() => null)
        ])

        trendingPairs.push({
          from: {
            symbol: fromToken.tokenSymbol || pair.from,
            address: fromToken.tokenContractAddress || '',
            logo: fromToken.tokenLogoUrl,
            price: fromPrice ? parseFloat(fromPrice.price || '0') : undefined,
            priceChange24h: fromPrice
              ? parseFloat(fromPrice.priceChange24H || '0')
              : undefined
          },
          to: {
            symbol: toToken.tokenSymbol || pair.to,
            address: toToken.tokenContractAddress || '',
            logo: toToken.tokenLogoUrl,
            price: toPrice ? parseFloat(toPrice.price || '0') : undefined,
            priceChange24h: toPrice
              ? parseFloat(toPrice.priceChange24H || '0')
              : undefined
          },
          volume24h: fromPrice?.volume24H || toPrice?.volume24H,
          priceChange: fromPrice
            ? parseFloat(fromPrice.priceChange24H || '0')
            : undefined
        })
      }
    }

    // Return top 5 pairs
    return trendingPairs.slice(0, 5)
  } catch (error) {
    console.error('Failed to get trending pairs:', error)
    return getDefaultTrendingPairs(chainIndex)
  }
}

function getCommonPairsForChain(chainIndex: string) {
  const commonPairs: Record<
    string,
    Array<{
      from: string
      to: string
      fromAddress?: string
      toAddress?: string
    }>
  > = {
    '1': [
      // Ethereum
      {
        from: 'ETH',
        to: 'USDC',
        fromAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        toAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
      },
      {
        from: 'ETH',
        to: 'USDT',
        fromAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        toAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7'
      },
      {
        from: 'WBTC',
        to: 'ETH',
        fromAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        toAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
      },
      {
        from: 'ETH',
        to: 'DAI',
        fromAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        toAddress: '0x6b175474e89094c44da98b954eedeac495271d0f'
      },
      {
        from: 'USDC',
        to: 'USDT',
        fromAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        toAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7'
      }
    ],
    '56': [
      // BSC
      { from: 'BNB', to: 'USDT' },
      { from: 'BNB', to: 'BUSD' },
      { from: 'CAKE', to: 'BNB' },
      { from: 'BNB', to: 'USDC' },
      { from: 'ETH', to: 'BNB' }
    ],
    '137': [
      // Polygon
      { from: 'MATIC', to: 'USDC' },
      { from: 'MATIC', to: 'USDT' },
      { from: 'WETH', to: 'MATIC' },
      { from: 'MATIC', to: 'DAI' },
      { from: 'USDC', to: 'USDT' }
    ],
    '42161': [
      // Arbitrum
      { from: 'ETH', to: 'USDC' },
      { from: 'ETH', to: 'USDT' },
      { from: 'ARB', to: 'ETH' },
      { from: 'ETH', to: 'WBTC' },
      { from: 'GMX', to: 'ETH' }
    ],
    '10': [
      // Optimism
      { from: 'ETH', to: 'USDC' },
      { from: 'ETH', to: 'USDT' },
      { from: 'OP', to: 'ETH' },
      { from: 'ETH', to: 'DAI' },
      { from: 'WBTC', to: 'ETH' }
    ],
    '43114': [
      // Avalanche
      { from: 'AVAX', to: 'USDC' },
      { from: 'AVAX', to: 'USDT' },
      { from: 'WAVAX', to: 'USDC' },
      { from: 'JOE', to: 'AVAX' },
      { from: 'ETH', to: 'AVAX' }
    ],
    '8453': [
      // Base
      { from: 'ETH', to: 'USDC' },
      { from: 'ETH', to: 'USDbC' },
      { from: 'ETH', to: 'DAI' },
      { from: 'WETH', to: 'USDC' },
      { from: 'cbETH', to: 'ETH' }
    ]
  }

  return commonPairs[chainIndex] || commonPairs['1']
}

function getDefaultTrendingPairs(chainId: string): TrendingPair[] {
  // Default pairs with mock data when API fails
  const defaultPairs: Record<string, TrendingPair[]> = {
    '1': [
      {
        from: {
          symbol: 'ETH',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        },
        to: {
          symbol: 'USDC',
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
        }
      },
      {
        from: {
          symbol: 'ETH',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        },
        to: {
          symbol: 'USDT',
          address: '0xdac17f958d2ee523a2206206994597c13d831ec7'
        }
      },
      {
        from: {
          symbol: 'WBTC',
          address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
        },
        to: {
          symbol: 'ETH',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        }
      },
      {
        from: {
          symbol: 'ETH',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        },
        to: {
          symbol: 'DAI',
          address: '0x6b175474e89094c44da98b954eedeac495271d0f'
        }
      },
      {
        from: {
          symbol: 'USDC',
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
        },
        to: {
          symbol: 'USDT',
          address: '0xdac17f958d2ee523a2206206994597c13d831ec7'
        }
      }
    ]
  }

  return defaultPairs[chainId] || defaultPairs['1']
}
