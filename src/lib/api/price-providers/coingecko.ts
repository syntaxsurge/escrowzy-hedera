/**
 * CoinGecko price provider
 * Supports fetching prices by CoinGecko ID
 */

import { apiEndpoints } from '@/config/api-endpoints'
import { envServer } from '@/config/env.server'
import { PriceProvider } from '@/lib/config/price-providers-config'
import { fetchPrice } from '@/lib/utils/price-fetcher'

export interface CoinGeckoPriceOptions {
  apiKey?: string
}

/**
 * Fetch cryptocurrency price from CoinGecko API
 * @param symbolOrId - The symbol or CoinGecko ID of the cryptocurrency
 * @param options - Optional configuration including API key
 * @returns The USD price of the cryptocurrency or null if not available
 */
export async function getCoingeckoPrice(
  symbolOrId: string,
  options: CoinGeckoPriceOptions = {}
): Promise<number | null> {
  const apiKey = options.apiKey || envServer.COINGECKO_API_KEY

  const headers: Record<string, string> = {}
  if (apiKey) {
    // CoinGecko uses different header names in different contexts
    headers['x-cg-demo-api-key'] = apiKey
    headers['X-CG-API-KEY'] = apiKey
  }

  // CoinGecko expects lowercase IDs
  const coingeckoId = symbolOrId.toLowerCase()
  const url = apiEndpoints.external.coingecko.price(coingeckoId)

  return fetchPrice({
    provider: PriceProvider.COINGECKO,
    url,
    headers,
    parseResponse: data => {
      const price = data[coingeckoId]?.usd
      return price && price > 0 ? price : null
    },
    cacheKey: `coingecko-price-${coingeckoId}`
  })
}
