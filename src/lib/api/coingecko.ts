import { unstable_cache } from 'next/cache'

import { apiEndpoints } from '@/config/api-endpoints'
import { envServer } from '@/config/env.server'

export interface CoinGeckoPriceOptions {
  apiKey?: string
  revalidate?: number
}

export interface CoinGeckoPriceResponse {
  [key: string]: {
    usd?: number
  }
}

/**
 * Internal function to fetch cryptocurrency price from CoinGecko API
 */
async function fetchCryptoPriceInternal(
  coingeckoId: string,
  apiKey?: string
): Promise<number> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Add API key if available (for higher rate limits)
    if (apiKey) {
      // CoinGecko uses different header names in different contexts
      headers['x-cg-demo-api-key'] = apiKey
      headers['X-CG-API-KEY'] = apiKey
    }

    const response = await fetch(
      apiEndpoints.external.coingecko.price(coingeckoId),
      { headers }
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data: CoinGeckoPriceResponse = await response.json()
    const price = data[coingeckoId]?.usd

    if (!price || price <= 0) {
      throw new Error('Invalid price data received from CoinGecko')
    }

    return price
  } catch (error) {
    console.error('Failed to fetch crypto price:', error)
    throw new Error('Unable to fetch current price')
  }
}

/**
 * Fetch cryptocurrency price from CoinGecko API with caching
 * @param coingeckoId - The CoinGecko ID of the cryptocurrency
 * @param options - Optional configuration including API key and cache settings
 * @returns The USD price of the cryptocurrency
 * @throws Error if unable to fetch price
 */
export async function getCryptoPrice(
  coingeckoId: string,
  options: CoinGeckoPriceOptions = {}
): Promise<number> {
  const apiKey = options.apiKey || envServer.COINGECKO_API_KEY
  const revalidate = options.revalidate ?? 60 // Default to 60 seconds

  // Use unstable_cache for server-side caching
  if (typeof window === 'undefined') {
    const getCachedPrice = unstable_cache(
      async () => fetchCryptoPriceInternal(coingeckoId, apiKey),
      [`coingecko-price-${coingeckoId}`],
      {
        revalidate,
        tags: [`coingecko-${coingeckoId}`]
      }
    )

    return getCachedPrice()
  }

  // For client-side, fetch directly without caching
  return fetchCryptoPriceInternal(coingeckoId, apiKey)
}
