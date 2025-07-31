import { NextRequest, NextResponse } from 'next/server'

import { okxDexClient } from '@/lib/api/okx-dex-client'
import { getChainIndex } from '@/lib/config/chain-mappings'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chainId = searchParams.get('chainId') || '1'
    const chainIndex = getChainIndex(chainId)

    // Fetch multiple data points in parallel
    const [liquiditySources, nativeTokenPrice, supportedChains] =
      await Promise.all([
        // Get liquidity sources
        okxDexClient
          .getLiquiditySources(chainIndex)
          .catch(() => ({ liquiditySources: [] })),
        // Get native token price (ETH, BNB, MATIC, etc.)
        getNativeTokenPrice(chainIndex),
        // Get supported chains count
        okxDexClient.getSupportedChains().catch(() => ({ chains: [] }))
      ])

    // Calculate stats
    const activeLiquiditySources =
      liquiditySources.liquiditySources?.length || 0
    const supportedChainsCount = supportedChains.chains?.length || 0

    // Get native token symbol based on chainId
    const nativeSymbol = getNativeTokenSymbol(chainId)

    return NextResponse.json({
      success: true,
      stats: {
        // Network Stats
        nativeTokenPrice: nativeTokenPrice.price || 0,
        nativeTokenSymbol: nativeSymbol,
        nativeToken24hChange: nativeTokenPrice.priceChange24h || 0,

        // DEX Aggregator Stats
        activeLiquiditySources,
        supportedChains: supportedChainsCount,

        // Gas Stats (will be fetched from gas-price endpoint)
        estimatedGasPrice: await getEstimatedGasPrice(chainId),

        // Market Activity
        totalProtocols: activeLiquiditySources,

        // Last updated
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Market stats API error:', error)

    // Return default values on error
    return NextResponse.json({
      success: false,
      stats: {
        nativeTokenPrice: 0,
        nativeTokenSymbol: 'ETH',
        nativeToken24hChange: 0,
        activeLiquiditySources: 0,
        supportedChains: 0,
        estimatedGasPrice: '0',
        totalProtocols: 0,
        lastUpdated: new Date().toISOString()
      }
    })
  }
}

async function getNativeTokenPrice(chainIndex: string) {
  try {
    // Get native token address based on chain
    const nativeTokenAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

    // Fetch price info from OKX
    const response = await okxDexClient.getMarketPriceInfo(
      nativeTokenAddress,
      chainIndex
    )

    return {
      price: parseFloat(response.price || '0'),
      priceChange24h: parseFloat(response.priceChange24H || '0'),
      volume24h: parseFloat(response.volume24H || '0'),
      marketCap: parseFloat(response.marketCap || '0')
    }
  } catch (error) {
    console.error('Failed to fetch native token price:', error)

    // Fallback prices for common chains
    const fallbackPrices: Record<string, number> = {
      '1': 3500, // ETH
      '56': 300, // BNB
      '137': 0.8, // MATIC
      '42161': 3500, // Arbitrum ETH
      '10': 3500, // Optimism ETH
      '43114': 25, // AVAX
      '8453': 3500 // Base ETH
    }

    return {
      price: fallbackPrices[chainIndex] || 0,
      priceChange24h: 0,
      volume24h: 0,
      marketCap: 0
    }
  }
}

function getNativeTokenSymbol(chainId: string): string {
  const symbols: Record<string, string> = {
    '1': 'ETH',
    '56': 'BNB',
    '137': 'MATIC',
    '42161': 'ETH',
    '10': 'ETH',
    '43114': 'AVAX',
    '8453': 'ETH',
    '250': 'FTM',
    '25': 'CRO',
    '324': 'ETH',
    '59144': 'ETH',
    '534352': 'ETH'
  }

  return symbols[chainId] || 'ETH'
}

async function getEstimatedGasPrice(chainId: string): Promise<string> {
  // This will be properly implemented in the gas-price endpoint
  // For now, return estimated values
  const gasEstimates: Record<string, string> = {
    '1': '25', // ETH mainnet
    '56': '3', // BSC
    '137': '30', // Polygon
    '42161': '0.1', // Arbitrum
    '10': '0.01', // Optimism
    '43114': '25', // Avalanche
    '8453': '0.01' // Base
  }

  return gasEstimates[chainId] || '10'
}
