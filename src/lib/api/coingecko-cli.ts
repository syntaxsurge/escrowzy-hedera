/**
 * CLI-safe version of CoinGecko API client
 * This version doesn't use Next.js caching and works in CLI scripts
 */

import { apiEndpoints } from '@/config/api-endpoints'

export interface CoinGeckoPriceResponse {
  [key: string]: {
    usd?: number
  }
}

/**
 * Fetch cryptocurrency price from CoinGecko API (CLI-safe version)
 * @param coingeckoId - The CoinGecko ID of the cryptocurrency
 * @param apiKey - Optional API key for higher rate limits
 * @returns The USD price of the cryptocurrency
 * @throws Error if unable to fetch price
 */
export async function getCryptoPriceCLI(
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
