/**
 * Binance price provider
 * Uses public API endpoints - no API key required for basic queries
 */

import { apiEndpoints } from '@/config/api-endpoints'
import { PriceProvider } from '@/lib/config/price-providers-config'
import { fetchPrice } from '@/lib/utils/price-fetcher'

interface BinanceTickerResponse {
  symbol: string
  price: string
}

/**
 * Fetch price from Binance API
 * @param symbol - Token symbol (e.g., BTC, ETH) or trading pair (e.g., BTCUSDT)
 * @param apiKey - Optional API key for higher rate limits
 * @returns USD price or null if not available
 */
export async function getBinancePrice(
  symbol: string,
  apiKey?: string
): Promise<number | null> {
  const headers: Record<string, string> = {}
  if (apiKey) {
    headers['X-MBX-APIKEY'] = apiKey
  }

  // If symbol doesn't end with a quote currency, append USDT
  const tradingPair = symbol.toUpperCase().includes('USD')
    ? symbol.toUpperCase()
    : `${symbol.toUpperCase()}USDT`

  const url = apiEndpoints.external.binance.tickerSymbol(tradingPair)

  return fetchPrice({
    provider: PriceProvider.BINANCE,
    url,
    headers,
    parseResponse: (data: BinanceTickerResponse) => {
      const price = data.price ? parseFloat(data.price) : null
      return price && price > 0 ? price : null
    },
    cacheKey: `binance-price-${tradingPair}`
  })
}
