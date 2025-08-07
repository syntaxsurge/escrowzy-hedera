/**
 * Unified price service with simple fallback mechanism
 * Tries multiple providers sequentially until one succeeds
 */

import { unstable_cache } from 'next/cache'

import { PriceProvider } from '@/lib/config/price-providers-config'

import { getBinancePrice } from './price-providers/binance'
import { getCoinbasePrice } from './price-providers/coinbase'
import { getCoingeckoPrice } from './price-providers/coingecko'
import { getCryptoComparePrice } from './price-providers/cryptocompare'
import { getKrakenPrice } from './price-providers/kraken'

export interface PriceResult {
  price: number
  provider: PriceProvider
  timestamp: number
}

export interface PriceServiceOptions {
  symbol?: string // Trading symbol (e.g., ETH, BTC, HBAR)
  coingeckoId?: string // CoinGecko ID (e.g., ethereum, bitcoin, hedera-hashgraph)
  apiKeys?: {
    coingecko?: string
    cryptocompare?: string
    binance?: string
  }
}

// Default cache duration for all price providers
const DEFAULT_CACHE_SECONDS = 300

// Provider priority order
const PROVIDER_ORDER = [
  PriceProvider.COINGECKO,
  PriceProvider.KRAKEN,
  PriceProvider.CRYPTOCOMPARE,
  PriceProvider.COINBASE,
  PriceProvider.BINANCE
] as const

/**
 * Try to get price from each provider in order until one succeeds
 * Returns immediately on first successful response
 */
async function getPriceWithFallback(
  symbolOrId: string,
  options: PriceServiceOptions = {}
): Promise<PriceResult | null> {
  const { symbol, coingeckoId, apiKeys } = options

  // Use provided values or fall back to symbolOrId
  const tradingSymbol = symbol || symbolOrId
  const geckoId = coingeckoId || symbolOrId

  // Try each provider in order
  for (const provider of PROVIDER_ORDER) {
    try {
      let price: number | null = null

      switch (provider) {
        case PriceProvider.COINGECKO:
          // CoinGecko needs the CoinGecko ID
          price = await getCoingeckoPrice(geckoId, {
            apiKey: apiKeys?.coingecko
          })
          break

        case PriceProvider.KRAKEN:
          // Kraken needs the trading symbol
          price = await getKrakenPrice(tradingSymbol)
          break

        case PriceProvider.CRYPTOCOMPARE:
          // CryptoCompare needs the trading symbol
          price = await getCryptoComparePrice(
            tradingSymbol,
            apiKeys?.cryptocompare
          )
          break

        case PriceProvider.COINBASE:
          // Coinbase needs the trading symbol
          price = await getCoinbasePrice(tradingSymbol)
          break

        case PriceProvider.BINANCE:
          // Binance needs the trading symbol
          price = await getBinancePrice(tradingSymbol, apiKeys?.binance)
          break
      }

      // If we got a valid price, return immediately
      if (price !== null && price > 0) {
        console.log(
          `[PriceService] Got price from ${provider}: $${price} for ${tradingSymbol}/${geckoId}`
        )
        return {
          price,
          provider,
          timestamp: Date.now()
        }
      }
    } catch (error) {
      // Log error but continue to next provider
      console.error(
        `[PriceService] Provider ${provider} failed for ${tradingSymbol}/${geckoId}:`,
        error
      )
    }
  }

  // All providers failed
  console.error(
    `[PriceService] All providers failed for ${tradingSymbol}/${geckoId}`
  )
  return null
}

/**
 * Main entry point for getting prices with caching
 * All price requests should go through this function
 */
export async function getCachedPrice(
  symbolOrId: string,
  options: PriceServiceOptions = {}
): Promise<PriceResult | null> {
  // Check if we're in a script/CLI context
  const isScript = process.env.IS_SCRIPT === 'true'

  // Check if we're in a Next.js server environment and not a script
  const isNextServer =
    typeof window === 'undefined' &&
    typeof process !== 'undefined' &&
    !isScript &&
    typeof unstable_cache === 'function'

  if (isNextServer) {
    try {
      const getCached = unstable_cache(
        async () => getPriceWithFallback(symbolOrId, options),
        [`price-${symbolOrId}`],
        {
          revalidate: DEFAULT_CACHE_SECONDS,
          tags: [`price-${symbolOrId}`]
        }
      )
      return getCached()
    } catch (error) {
      console.warn('[PriceService] Cache failed, fetching directly:', error)
      return getPriceWithFallback(symbolOrId, options)
    }
  }

  // For non-Next.js environments (CLI, scripts), fetch directly
  return getPriceWithFallback(symbolOrId, options)
}
