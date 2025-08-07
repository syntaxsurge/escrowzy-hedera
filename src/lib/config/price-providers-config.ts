/**
 * Configuration for all cryptocurrency price providers
 * Defines priority order, retry settings, and API endpoints
 */

export enum PriceProvider {
  COINGECKO = 'coingecko',
  BINANCE = 'binance',
  KRAKEN = 'kraken',
  CRYPTOCOMPARE = 'cryptocompare',
  COINBASE = 'coinbase'
}

export interface ProviderConfig {
  name: PriceProvider
  displayName: string
  priority: number // Lower number = higher priority
  requiresApiKey: boolean
  rateLimit: {
    requestsPerMinute: number
    requestsPerSecond?: number
  }
  retry: {
    maxRetries: number
    minDelayMs: number
    maxDelayMs: number
    backoffMultiplier: number
  }
  timeout: number // Request timeout in milliseconds
  supportedTokens?: string[] // If limited to specific tokens
  enabled: boolean // Can be toggled based on availability
}

export const PRICE_PROVIDERS_CONFIG: Record<PriceProvider, ProviderConfig> = {
  [PriceProvider.COINGECKO]: {
    name: PriceProvider.COINGECKO,
    displayName: 'CoinGecko',
    priority: 1,
    requiresApiKey: false, // Optional for higher limits
    rateLimit: {
      requestsPerMinute: 50, // With API key: 500
      requestsPerSecond: 1
    },
    retry: {
      maxRetries: 10,
      minDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 1.5
    },
    timeout: 30000,
    enabled: true
  },
  [PriceProvider.BINANCE]: {
    name: PriceProvider.BINANCE,
    displayName: 'Binance',
    priority: 2,
    requiresApiKey: false,
    rateLimit: {
      requestsPerMinute: 1200,
      requestsPerSecond: 20
    },
    retry: {
      maxRetries: 5,
      minDelayMs: 500,
      maxDelayMs: 3000,
      backoffMultiplier: 1.5
    },
    timeout: 10000,
    enabled: true
  },
  [PriceProvider.KRAKEN]: {
    name: PriceProvider.KRAKEN,
    displayName: 'Kraken',
    priority: 3,
    requiresApiKey: false,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerSecond: 1
    },
    retry: {
      maxRetries: 5,
      minDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 1.5
    },
    timeout: 15000,
    enabled: true
  },
  [PriceProvider.CRYPTOCOMPARE]: {
    name: PriceProvider.CRYPTOCOMPARE,
    displayName: 'CryptoCompare',
    priority: 4,
    requiresApiKey: false, // Optional for higher limits
    rateLimit: {
      requestsPerMinute: 100, // Free tier
      requestsPerSecond: 2
    },
    retry: {
      maxRetries: 5,
      minDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 1.5
    },
    timeout: 15000,
    enabled: true
  },
  [PriceProvider.COINBASE]: {
    name: PriceProvider.COINBASE,
    displayName: 'Coinbase',
    priority: 5,
    requiresApiKey: false,
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerSecond: 2
    },
    retry: {
      maxRetries: 5,
      minDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 1.5
    },
    timeout: 15000,
    enabled: true
  }
}

// Get providers sorted by priority
export function getProvidersByPriority(): ProviderConfig[] {
  return Object.values(PRICE_PROVIDERS_CONFIG)
    .filter(provider => provider.enabled)
    .sort((a, b) => a.priority - b.priority)
}

// Get specific provider config
export function getProviderConfig(provider: PriceProvider): ProviderConfig {
  return PRICE_PROVIDERS_CONFIG[provider]
}

// Provider health tracking (in-memory for now)
const providerHealth: Map<
  PriceProvider,
  {
    lastSuccess: number
    consecutiveFailures: number
    isHealthy: boolean
  }
> = new Map()

export function updateProviderHealth(
  provider: PriceProvider,
  success: boolean
): void {
  const health = providerHealth.get(provider) || {
    lastSuccess: 0,
    consecutiveFailures: 0,
    isHealthy: true
  }

  if (success) {
    health.lastSuccess = Date.now()
    health.consecutiveFailures = 0
    health.isHealthy = true
  } else {
    health.consecutiveFailures++
    // Mark unhealthy after 3 consecutive failures
    health.isHealthy = health.consecutiveFailures < 3
  }

  providerHealth.set(provider, health)
}

export function isProviderHealthy(provider: PriceProvider): boolean {
  const health = providerHealth.get(provider)
  if (!health) return true // Assume healthy if no data

  // Also check if last success was too long ago (> 5 minutes)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  if (health.lastSuccess < fiveMinutesAgo && health.consecutiveFailures > 0) {
    return false
  }

  return health.isHealthy
}
