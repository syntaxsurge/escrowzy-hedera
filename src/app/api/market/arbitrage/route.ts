import { NextRequest, NextResponse } from 'next/server'

import { eq } from 'drizzle-orm'

import { getCryptoPrice } from '@/lib/api/coingecko'
import { okxDexClient } from '@/lib/api/okx-dex-client'
import { getCoingeckoId } from '@/lib/config/chain-mappings'
import { db } from '@/lib/db/drizzle'
import { escrowListings as listings } from '@/lib/db/schema'

export interface ArbitrageOpportunity {
  listingId: number
  listingPrice: number
  dexPrice: number | null
  coingeckoPrice: number | null
  priceDifference: number
  potentialProfit: number
  type: 'buy' | 'sell'
  chainId: string
  chainName: string
  tokenAddress: string
  tokenSymbol: string
  amount: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const threshold = parseFloat(searchParams.get('threshold') || '2')
    const chainFilter = searchParams.get('chainId')

    // Build query with optional chain filter
    const query = db.select().from(listings).where(eq(listings.isActive, true))
    const activeListings = await query.limit(50)

    const opportunities: ArbitrageOpportunity[] = []

    for (const listing of activeListings) {
      try {
        // Use chainId from listing or default to Ethereum mainnet
        const chainId = listing.chainId || '1'

        // Skip if chain filter is set and doesn't match
        if (chainFilter && chainId !== chainFilter) continue

        const tokenAddress = listing.tokenAddress

        // Skip if no token address is available
        if (!tokenAddress) continue

        let dexPrice: number | null = null
        let coingeckoPrice: number | null = null

        // Fetch OKX DEX price using proper chainIndex parameter
        try {
          const marketData = await okxDexClient.getMarketPriceInfo(
            tokenAddress,
            chainId
          )
          dexPrice = marketData.price ? parseFloat(marketData.price) : null
        } catch (error) {
          console.error('Failed to get OKX DEX price:', error)
        }

        // Try to get CoinGecko price using chain's native currency ID
        const coingeckoId = getCoingeckoId(chainId)
        if (coingeckoId) {
          try {
            coingeckoPrice = await getCryptoPrice(coingeckoId, {
              revalidate: 60
            })
          } catch (error) {
            console.error('Failed to get CoinGecko price:', error)
          }
        }

        const marketPrice = dexPrice || coingeckoPrice
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
            dexPrice,
            coingeckoPrice,
            priceDifference,
            potentialProfit,
            type: listingPrice < marketPrice ? 'buy' : 'sell',
            chainId,
            chainName: okxDexClient.getChainNameFromId(chainId),
            tokenAddress,
            tokenSymbol: listing.tokenOffered || 'UNKNOWN',
            amount: listing.amount || '0'
          })
        }
      } catch (error) {
        console.error(`Error processing listing ${listing.id}:`, error)
      }
    }

    opportunities.sort((a, b) => b.potentialProfit - a.potentialProfit)

    return NextResponse.json({
      success: true,
      data: opportunities.slice(0, 20),
      count: opportunities.length,
      parameters: {
        threshold,
        chainFilter
      }
    })
  } catch (error) {
    console.error('Arbitrage API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch arbitrage opportunities' },
      { status: 500 }
    )
  }
}
