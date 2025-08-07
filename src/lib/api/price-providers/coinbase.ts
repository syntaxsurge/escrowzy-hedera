/**
 * Coinbase price provider
 * Uses public API endpoints - no API key required
 */

import { apiEndpoints } from '@/config/api-endpoints'
import { PriceProvider } from '@/lib/config/price-providers-config'
import { fetchPrice } from '@/lib/utils/price-fetcher'

interface CoinbaseExchangeRatesResponse {
  data: {
    currency: string
    rates: {
      [currency: string]: string
    }
  }
}

/**
 * Fetch price from Coinbase API
 * @param symbol - Token symbol (e.g., BTC, ETH)
 * @returns USD price or null if not available
 */
export async function getCoinbasePrice(symbol: string): Promise<number | null> {
  const upperSymbol = symbol.toUpperCase()
  const url = apiEndpoints.external.coinbase.spotPrice(upperSymbol)

  return fetchPrice({
    provider: PriceProvider.COINBASE,
    url,
    parseResponse: (data: CoinbaseExchangeRatesResponse) => {
      // Coinbase returns the rates where 1 unit of base currency equals X USD
      const usdRate = data.data?.rates?.USD
      if (!usdRate) {
        return null
      }

      const price = parseFloat(usdRate)
      return price && price > 0 ? price : null
    },
    cacheKey: `coinbase-price-${upperSymbol}`
  })
}
