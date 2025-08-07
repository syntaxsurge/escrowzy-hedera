/**
 * Centralized price fetcher utility for all price providers
 * Handles common functionality like retries, caching, and error handling
 */

import { unstable_cache } from 'next/cache'

import {
  PriceProvider,
  getProviderConfig
} from '@/lib/config/price-providers-config'

import { withRetry } from './api-retry'

export interface PriceFetchOptions {
  provider: PriceProvider
  url: string
  headers?: Record<string, string>
  parseResponse: (data: any) => number | null
  cacheKey?: string
  cacheSeconds?: number
  onRetry?: (attempt: number, error: any, delay: number) => void
}

// Default cache duration in seconds
const DEFAULT_CACHE_SECONDS = 300

/**
 * Internal function to fetch price from any provider
 */
async function fetchPriceInternal(
  options: PriceFetchOptions
): Promise<number | null> {
  const config = getProviderConfig(options.provider)

  return withRetry(
    async () => {
      const response = await fetch(options.url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        signal: AbortSignal.timeout(config.timeout)
      })

      if (!response.ok) {
        // Create an error with status for retry logic
        const error: any = new Error(
          `${config.displayName} API error: ${response.status}. URL: ${options.url}`
        )
        error.status = response.status
        throw error
      }

      const data = await response.json()
      const price = options.parseResponse(data)

      if (price === null) {
        console.log(`[${config.displayName}] No price data available`)
        return null
      }

      if (price <= 0) {
        console.error(`[${config.displayName}] Invalid price: ${price}`)
        return null
      }

      return price
    },
    {
      maxRetries: config.retry.maxRetries,
      minRetryDelayMs: config.retry.minDelayMs,
      maxRetryDelayMs: config.retry.maxDelayMs,
      backoffMultiplier: config.retry.backoffMultiplier,
      onRetry:
        options.onRetry ||
        ((attempt, error, delay) => {
          const errorMessage = error?.message || 'Unknown error'
          const status = error?.status || 'N/A'
          console.log(
            `[${config.displayName}] Retrying request after ${delay}ms ` +
              `(attempt ${attempt}/${config.retry.maxRetries}) - ` +
              `Status: ${status}, Error: ${errorMessage}`
          )
        })
    }
  )
}

/**
 * Fetch price with optional caching
 * Automatically handles Next.js server-side caching when available
 */
export async function fetchPrice(
  options: PriceFetchOptions
): Promise<number | null> {
  const cacheSeconds = options.cacheSeconds ?? DEFAULT_CACHE_SECONDS
  const config = getProviderConfig(options.provider)

  // Check if we're in a script/CLI context
  const isScript = process.env.IS_SCRIPT === 'true'

  // Check if we're in a Next.js server environment (not CLI or script)
  const isNextServer =
    typeof window === 'undefined' &&
    typeof process !== 'undefined' &&
    !isScript &&
    typeof unstable_cache === 'function'

  // Use unstable_cache for Next.js server-side caching
  if (isNextServer && options.cacheKey) {
    try {
      const getCachedPrice = unstable_cache(
        async () => fetchPriceInternal(options),
        [options.cacheKey],
        {
          revalidate: cacheSeconds,
          tags: [`price-${config.name}`]
        }
      )
      return getCachedPrice()
    } catch (error) {
      // Fallback to direct fetch if caching fails
      console.warn(
        `[${config.displayName}] Cache failed, fetching directly:`,
        error
      )
      return fetchPriceInternal(options)
    }
  }

  // For client-side or CLI/scripts, fetch directly without caching
  return fetchPriceInternal(options)
}
