import { NATIVE_TOKEN_ADDRESS } from 'thirdweb'

import { getCoingeckoId, getChainConfig } from '@/lib/config/chain-mappings'

import { okxDexClient } from './okx-dex-client'
import { getCachedPrice } from './price-service'

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
  _options: {
    revalidate?: number
  } = {}
): Promise<PriceResult> {
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

  // Fallback to price service with multiple providers
  // Use provided coingeckoId or get from chain config
  const geckoId = coingeckoId || getCoingeckoId(chainId)
  const chainConfig = getChainConfig(chainId)

  if (geckoId) {
    try {
      const priceResult = await getCachedPrice(geckoId, {
        symbol: chainConfig?.nativeCurrency?.symbol,
        coingeckoId: geckoId
      })
      if (priceResult?.price !== null && priceResult?.price !== undefined) {
        console.log(
          '[Unified Price] Got price from fallback service:',
          priceResult.price
        )
        return { price: priceResult.price, source: 'coingecko' }
      }
    } catch (error) {
      console.error('[Unified Price] Price service error:', error)
    }
  }

  console.log('[Unified Price] No price available')
  return { price: null, source: 'none' }
}
