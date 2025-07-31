import 'server-only'

import { unstable_cache } from 'next/cache'

import { eq, and, sql } from 'drizzle-orm'

import { getCryptoPrice } from '@/lib/api/coingecko'
import { okxDexClient } from '@/lib/api/okx-dex-client'
import { db } from '@/lib/db/drizzle'
import { escrowListings as listings } from '@/lib/db/schema'

export interface UnifiedMarketData {
  chainIndex: string
  tokenAddress?: string
  symbol?: string
  okxDexPrice: number | null
  coingeckoPrice: number | null
  averagePrice: number | null
  priceSpread: number | null
  volume24h?: number
  liquidityDepth?: number
  marketCap?: number
  priceChange24h?: number
  lastUpdated: Date
}

export interface ArbitrageOpportunity {
  listingId: number
  listingPrice: number
  marketPrice: number
  priceDifference: number
  potentialProfit: number
  type: 'buy' | 'sell'
  chainId: string
  chainName: string
  tokenAddress: string
  tokenSymbol: string
  amount: string
  source: 'okx_dex' | 'coingecko' | 'average'
}

export interface MarketTrend {
  chain: string
  token: string
  currentPrice: number
  previousPrice: number
  priceChange: number
  priceChangePercent: number
  trend: 'up' | 'down' | 'stable'
  timeframe: '1h' | '24h' | '7d'
}

/**
 * Fetches unified market data from multiple sources
 */
export async function getUnifiedMarketData(
  chainId: string,
  tokenAddress?: string,
  coingeckoId?: string
): Promise<UnifiedMarketData> {
  let okxDexPrice: number | null = null
  let coingeckoPrice: number | null = null
  let marketCap: number | undefined
  let priceChange24h: number | undefined
  let volume24h: number | undefined

  // Fetch OKX DEX price using proper API parameters
  if (tokenAddress) {
    try {
      // Use the getMarketPriceInfo for detailed market data
      const marketData = await okxDexClient.getMarketPriceInfo(
        tokenAddress,
        chainId
      )
      okxDexPrice = marketData.price ? parseFloat(marketData.price) : null
      marketCap = marketData.marketCap
        ? parseFloat(marketData.marketCap)
        : undefined
      priceChange24h = marketData.priceChange24H
        ? parseFloat(marketData.priceChange24H)
        : undefined
      volume24h = marketData.volume24H
        ? parseFloat(marketData.volume24H)
        : undefined
    } catch (error) {
      console.error('Failed to fetch OKX DEX price:', error)
    }
  }

  // Fetch CoinGecko price
  if (coingeckoId) {
    try {
      coingeckoPrice = await getCryptoPrice(coingeckoId, {
        revalidate: 60
      })
    } catch (error) {
      console.error('Failed to fetch CoinGecko price:', error)
    }
  }

  // Calculate average and spread
  const averagePrice =
    okxDexPrice && coingeckoPrice
      ? (okxDexPrice + coingeckoPrice) / 2
      : okxDexPrice || coingeckoPrice

  const priceSpread =
    okxDexPrice && coingeckoPrice
      ? Math.abs(okxDexPrice - coingeckoPrice)
      : null

  return {
    chainIndex: chainId,
    tokenAddress,
    okxDexPrice,
    coingeckoPrice,
    averagePrice,
    priceSpread,
    marketCap,
    priceChange24h,
    volume24h,
    lastUpdated: new Date()
  }
}

/**
 * Finds arbitrage opportunities between P2P listings and market prices
 */
export async function findArbitrageOpportunities(
  threshold: number = 2
): Promise<ArbitrageOpportunity[]> {
  const activeListings = await db
    .select()
    .from(listings)
    .where(eq(listings.isActive, true))
    .limit(100)

  const opportunities: ArbitrageOpportunity[] = []

  for (const listing of activeListings) {
    try {
      // Use chainId from listing or default to Ethereum mainnet
      const chainId = listing.chainId || '1'
      const tokenAddress = listing.tokenAddress

      // Skip if no token address is available
      if (!tokenAddress) continue

      const marketData = await getUnifiedMarketData(chainId, tokenAddress)

      const marketPrice = marketData.averagePrice
      if (!marketPrice) continue

      if (!listing.pricePerUnit) continue

      const listingPrice = parseFloat(listing.pricePerUnit)
      const priceDifference = Math.abs(
        ((listingPrice - marketPrice) / marketPrice) * 100
      )

      if (priceDifference >= threshold) {
        const amount = listing.amount ? parseFloat(listing.amount) : 0
        const potentialProfit = Math.abs(listingPrice - marketPrice) * amount

        opportunities.push({
          listingId: listing.id,
          listingPrice,
          marketPrice,
          priceDifference,
          potentialProfit,
          type: listingPrice < marketPrice ? 'buy' : 'sell',
          chainId,
          chainName: okxDexClient.getChainNameFromId(chainId),
          tokenAddress,
          tokenSymbol: listing.tokenOffered || 'UNKNOWN',
          amount: listing.amount || '0',
          source: marketData.okxDexPrice ? 'okx_dex' : 'coingecko'
        })
      }
    } catch (error) {
      console.error(`Error processing listing ${listing.id}:`, error)
    }
  }

  return opportunities.sort((a, b) => b.potentialProfit - a.potentialProfit)
}

/**
 * Gets market trends for a specific token
 */
export async function getMarketTrends(
  chainId: string,
  tokenAddress?: string,
  coingeckoId?: string,
  timeframe: '1h' | '24h' | '7d' = '24h'
): Promise<MarketTrend | null> {
  try {
    const currentData = await getUnifiedMarketData(
      chainId,
      tokenAddress,
      coingeckoId
    )

    if (!currentData.averagePrice) return null

    // Use actual price change data from OKX if available
    const priceChangePercent = currentData.priceChange24h || 0
    const previousPrice =
      currentData.averagePrice / (1 + priceChangePercent / 100)
    const priceChange = currentData.averagePrice - previousPrice

    return {
      chain: okxDexClient.getChainNameFromId(chainId),
      token: tokenAddress || coingeckoId || 'unknown',
      currentPrice: currentData.averagePrice,
      previousPrice,
      priceChange,
      priceChangePercent,
      trend: priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'stable',
      timeframe
    }
  } catch (error) {
    console.error('Failed to get market trends:', error)
    return null
  }
}

/**
 * Gets aggregated market statistics
 */
export async function getMarketStatistics(chainId: string) {
  const getCachedStats = unstable_cache(
    async () => {
      const [listingsCount, totalVolume] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(listings)
          .where(
            and(eq(listings.isActive, true), eq(listings.chainId, chainId))
          ),
        db
          .select({
            volume: sql<string>`sum(cast(${listings.amount} as numeric) * cast(${listings.pricePerUnit} as numeric))`
          })
          .from(listings)
          .where(
            and(eq(listings.isActive, false), eq(listings.chainId, chainId))
          )
      ])

      // Get native token price for the chain
      const nativeCurrency = okxDexClient.getChainNativeCurrency(chainId)
      const marketData = await getUnifiedMarketData(
        chainId,
        undefined,
        nativeCurrency.symbol.toLowerCase()
      )

      return {
        activeListings: listingsCount[0]?.count || 0,
        totalVolume: totalVolume[0]?.volume || '0',
        currentPrice: marketData.averagePrice,
        priceSpread: marketData.priceSpread,
        volume24h: marketData.volume24h,
        marketCap: marketData.marketCap,
        priceChange24h: marketData.priceChange24h,
        sources: {
          okxDex: marketData.okxDexPrice !== null,
          coingecko: marketData.coingeckoPrice !== null
        }
      }
    },
    [`market-stats-${chainId}`],
    {
      revalidate: 60,
      tags: [`market-stats`]
    }
  )

  return getCachedStats()
}

/**
 * Suggests optimal pricing for new listings
 */
export async function suggestOptimalPrice(
  chainId: string,
  tokenAddress?: string,
  coingeckoId?: string,
  listingType: 'buy' | 'sell' = 'sell'
): Promise<{
  suggestedPrice: number | null
  marketPrice: number | null
  competitiveAdjustment: number
  reason: string
}> {
  try {
    const marketData = await getUnifiedMarketData(
      chainId,
      tokenAddress,
      coingeckoId
    )

    if (!marketData.averagePrice) {
      return {
        suggestedPrice: null,
        marketPrice: null,
        competitiveAdjustment: 0,
        reason: 'No market data available'
      }
    }

    // Get current P2P listings to analyze competition
    const competingListings = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.isActive, true),
          eq(listings.listingType, listingType),
          eq(listings.chainId, chainId),
          tokenAddress ? eq(listings.tokenAddress, tokenAddress) : sql`true`
        )
      )
      .limit(10)

    // Calculate competitive adjustment based on existing listings
    let competitiveAdjustment = 0
    if (competingListings.length > 0) {
      const _avgListingPrice =
        competingListings.reduce(
          (sum: number, l: any) =>
            sum + (l.pricePerUnit ? parseFloat(l.pricePerUnit) : 0),
          0
        ) / competingListings.length

      // Suggest slightly better price than average
      if (listingType === 'sell') {
        competitiveAdjustment = -0.5 // 0.5% cheaper for sells
      } else {
        competitiveAdjustment = 0.5 // 0.5% higher for buys
      }
    }

    const suggestedPrice =
      marketData.averagePrice * (1 + competitiveAdjustment / 100)

    return {
      suggestedPrice,
      marketPrice: marketData.averagePrice,
      competitiveAdjustment,
      reason:
        competingListings.length > 0
          ? `Competitive pricing based on ${competingListings.length} active listings`
          : 'Market-based pricing with no competition'
    }
  } catch (error) {
    console.error('Failed to suggest optimal price:', error)
    return {
      suggestedPrice: null,
      marketPrice: null,
      competitiveAdjustment: 0,
      reason: 'Error calculating suggested price'
    }
  }
}
