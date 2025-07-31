import { NextResponse } from 'next/server'

import { and, count, eq, sql } from 'drizzle-orm'

import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { getUserListingAnalytics } from '@/lib/db/queries/analytics'
import { escrowListings, trades } from '@/lib/db/schema'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get user's listing statistics
    const [activeCount] = await db
      .select({ count: count() })
      .from(escrowListings)
      .where(
        and(
          eq(escrowListings.userId, userId),
          eq(escrowListings.isActive, true)
        )
      )

    const [totalCount] = await db
      .select({ count: count() })
      .from(escrowListings)
      .where(eq(escrowListings.userId, userId))

    // Get buy and sell offers count
    const [buyOffers] = await db
      .select({ count: count() })
      .from(escrowListings)
      .where(
        and(
          eq(escrowListings.userId, userId),
          eq(escrowListings.listingType, 'buy'),
          eq(escrowListings.isActive, true)
        )
      )

    const [sellOffers] = await db
      .select({ count: count() })
      .from(escrowListings)
      .where(
        and(
          eq(escrowListings.userId, userId),
          eq(escrowListings.listingType, 'sell'),
          eq(escrowListings.isActive, true)
        )
      )

    // Get trade statistics
    const tradeStats = await db
      .select({
        completedTrades: sql<number>`count(case when status = 'completed' then 1 end)::int`,
        totalTrades: sql<number>`count(*)::int`,
        totalVolume: sql<string>`coalesce(sum(case when status = 'completed' then amount::numeric else 0 end), 0)::text`,
        monthlyTrades: sql<number>`count(case when created_at >= current_date - interval '30 days' then 1 end)::int`
      })
      .from(trades)
      .where(
        sql`${trades.buyerId} = ${userId} or ${trades.sellerId} = ${userId}`
      )

    const stats = tradeStats[0] || {
      completedTrades: 0,
      totalTrades: 0,
      totalVolume: '0',
      monthlyTrades: 0
    }

    // Calculate success rate
    const successRate =
      stats.totalTrades > 0
        ? Math.round((stats.completedTrades / stats.totalTrades) * 100)
        : 100

    // Get real analytics data from database
    const analytics = await getUserListingAnalytics(userId)
    const { totalViews, conversionRate, avgResponseTime } = analytics

    return NextResponse.json({
      success: true,
      data: {
        activeListings: activeCount?.count || 0,
        totalListings: totalCount?.count || 0,
        totalBuyOffers: buyOffers?.count || 0,
        totalSellOffers: sellOffers?.count || 0,
        completedTrades: stats.completedTrades,
        totalVolume: stats.totalVolume,
        successRate,
        monthlyTrades: stats.monthlyTrades,
        totalViews,
        conversionRate,
        avgResponseTime
      }
    })
  } catch (error) {
    console.error('Error in GET /api/listings/user-stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
