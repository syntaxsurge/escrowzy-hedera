import { NATIVE_TOKEN_ADDRESS } from 'thirdweb'

import { getCoingeckoId } from '@/lib/config/chain-mappings'

import { getCryptoPrice } from './coingecko'
import { okxDexClient } from './okx-dex-client'

interface PriceResult {
  price: number | null
  source: 'okx' | 'coingecko' | 'none'
}

/**
 * Get unified price for a token/chain combination
 * Tries OKX DEX first for supported chains, falls back to CoinGecko
 */
export async function getUnifiedPrice(
  chainId: string,
  chainName: string,
  tokenAddress?: string,
  coingeckoId?: string,
  options: {
    revalidate?: number
  } = {}
): Promise<PriceResult> {
  const revalidate = options.revalidate ?? 300 // Default 5 minutes

  console.log('[Unified Price] Getting price for:', {
    chainId,
    chainName,
    tokenAddress,
    coingeckoId
  })

  // Check if chain is supported by OKX DEX
  const okxSupported = await okxDexClient.isChainSupported(chainId)

  if (okxSupported) {
    try {
      // Try OKX DEX first for supported chains
      const okxTokenAddress = !tokenAddress
        ? NATIVE_TOKEN_ADDRESS
        : tokenAddress
      const okxPriceResult = await okxDexClient.getOKXMarketPrice(
        okxTokenAddress,
        chainId
      )

      if (okxPriceResult.price !== null) {
        console.log('[Unified Price] Got OKX price:', okxPriceResult.price)
        return { price: okxPriceResult.price, source: 'okx' }
      }
    } catch (error) {
      console.error('[Unified Price] OKX DEX error:', error)
    }
  }

  // Fallback to CoinGecko
  // Use provided coingeckoId or get from chain config
  const geckoId = coingeckoId || getCoingeckoId(chainId)

  if (geckoId) {
    try {
      const geckoPrice = await getCryptoPrice(geckoId, { revalidate })
      if (geckoPrice !== null) {
        console.log('[Unified Price] Got CoinGecko price:', geckoPrice)
        return { price: geckoPrice, source: 'coingecko' }
      }
    } catch (error) {
      console.error('[Unified Price] CoinGecko error:', error)
    }
  }

  console.log('[Unified Price] No price available')
  return { price: null, source: 'none' }
}
