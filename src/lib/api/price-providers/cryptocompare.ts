/**
 * CryptoCompare price provider
 * Requires API key for production use
 */

import { apiEndpoints } from '@/config/api-endpoints'
import { envServer } from '@/config/env.server'
import { PriceProvider } from '@/lib/config/price-providers-config'
import { fetchPrice } from '@/lib/utils/price-fetcher'

interface CryptoComparePriceResponse {
  [currency: string]: number
}

/**
 * Fetch price from CryptoCompare API
 * @param symbol - Token symbol (e.g., BTC, ETH)
 * @param apiKey - Optional API key (required for production)
 * @returns USD price or null if not available
 */
export async function getCryptoComparePrice(
  symbol: string,
  apiKey?: string
): Promise<number | null> {
  const key = apiKey || envServer.CRYPTOCOMPARE_API_KEY

  const headers: Record<string, string> = {}
  if (key) {
    headers['authorization'] = `Apikey ${key}`
  }

  const upperSymbol = symbol.toUpperCase()
  const url = `${apiEndpoints.external.cryptocompare.price}?fsym=${upperSymbol}&tsyms=USD`

  return fetchPrice({
    provider: PriceProvider.CRYPTOCOMPARE,
    url,
    headers,
    parseResponse: (data: CryptoComparePriceResponse) => {
      const price = data.USD
      return price && price > 0 ? price : null
    },
    cacheKey: `cryptocompare-price-${upperSymbol}`
  })
}
