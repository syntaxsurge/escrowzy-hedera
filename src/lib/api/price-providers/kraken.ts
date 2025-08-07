/**
 * Kraken price provider
 * Uses public API endpoints - no API key required
 */

import { apiEndpoints } from '@/config/api-endpoints'
import { PriceProvider } from '@/lib/config/price-providers-config'
import { fetchPrice } from '@/lib/utils/price-fetcher'

interface KrakenTickerResponse {
  error: string[]
  result: {
    [pair: string]: {
      a: string[] // ask [price, whole lot volume, lot volume]
      b: string[] // bid [price, whole lot volume, lot volume]
      c: string[] // last trade closed [price, lot volume]
      v: string[] // volume [today, last 24 hours]
      p: string[] // volume weighted average price [today, last 24 hours]
      t: number[] // number of trades [today, last 24 hours]
      l: string[] // low [today, last 24 hours]
      h: string[] // high [today, last 24 hours]
      o: string // today's opening price
    }
  }
}

/**
 * Convert standard symbol to Kraken format
 * Kraken uses specific symbols like XBT for Bitcoin
 */
function getKrakenPair(symbol: string): string {
  const upperSymbol = symbol.toUpperCase()

  // Special cases for Kraken
  const krakenSymbols: Record<string, string> = {
    BTC: 'XBT',
    DOGE: 'XDG'
  }

  const krakenSymbol = krakenSymbols[upperSymbol] || upperSymbol

  // Kraken pairs often use specific formats
  // For USD pairs, try common formats
  const pairs = [`${krakenSymbol}USD`, `X${krakenSymbol}ZUSD`]

  // Return the first format, Kraken API will handle invalid pairs
  return pairs[0]
}

/**
 * Fetch price from Kraken API
 * @param symbol - Token symbol (e.g., BTC, ETH)
 * @returns USD price or null if not available
 */
export async function getKrakenPrice(symbol: string): Promise<number | null> {
  const pair = getKrakenPair(symbol)
  const url = `${apiEndpoints.external.kraken.ticker}?pair=${pair}`

  return fetchPrice({
    provider: PriceProvider.KRAKEN,
    url,
    parseResponse: (data: KrakenTickerResponse) => {
      if (data.error && data.error.length > 0) {
        console.log(`[Kraken] Error for ${pair}: ${data.error.join(', ')}`)
        return null
      }

      // Find the pair in the result (Kraken may return with different casing)
      const resultPair = Object.keys(data.result || {})[0]
      if (!resultPair) {
        return null
      }

      const ticker = data.result[resultPair]
      // Use the last trade price (most recent)
      const price = ticker?.c?.[0] ? parseFloat(ticker.c[0]) : null
      return price && price > 0 ? price : null
    },
    cacheKey: `kraken-price-${pair}`
  })
}
