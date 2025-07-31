import { eq, and, gte, sql, desc } from 'drizzle-orm'

import { db } from '../drizzle'
import { escrowListings, trades, activityLogs } from '../schema'

/**
 * Track a listing view event
 */
export async function trackListingView(
  listingId: number,
  viewerId?: number
): Promise<void> {
  // Track in activity logs as a view event
  await db.insert(activityLogs).values({
    teamId: 1, // System team ID for analytics
    userId: viewerId || null,
    action: `LISTING_VIEWED:${listingId}`,
    timestamp: new Date(),
    metadata: {
      listingId,
      viewerId,
      type: 'listing_view'
    }
  })
}

/**
 * Get listing analytics for a user
 */
export async function getUserListingAnalytics(userId: number): Promise<{
  totalViews: number
  conversionRate: number
  avgResponseTime: number | null
}> {
  // Get total views across all user's listings
  const viewsResult = await db
    .select({
      count: sql<number>`count(*)`
    })
    .from(activityLogs)
    .where(
      sql`action LIKE 'LISTING_VIEWED:%' 
        AND metadata->>'listingId' IN (
          SELECT id::text FROM escrow_listings WHERE user_id = ${userId}
        )`
    )

  const totalViews = Number(viewsResult[0]?.count || 0)

  // Get conversion rate (accepted trades / total views)
  const acceptedTradesResult = await db
    .select({
      count: sql<number>`count(*)`
    })
    .from(trades)
    .where(
      and(
        eq(trades.sellerId, userId),
        sql`status IN ('completed', 'deposited', 'payment_sent')`
      )
    )

  const acceptedTrades = Number(acceptedTradesResult[0]?.count || 0)
  const conversionRate =
    totalViews > 0 ? Math.round((acceptedTrades / totalViews) * 100) : 0

  // Calculate average response time from messages
  const responseTimeResult = await db
    .select({
      avgMinutes: sql<number>`
        AVG(
          EXTRACT(EPOCH FROM (
            SELECT MIN(m2.created_at)
            FROM messages m2
            WHERE m2.context_id = m1.context_id
              AND m2.sender_id = ${userId}
              AND m2.created_at > m1.created_at
          ) - m1.created_at) / 60
        )
      `
    })
    .from(sql`messages m1`)
    .where(
      sql`m1.context_type = 'trade' 
        AND m1.sender_id != ${userId}
        AND EXISTS (
          SELECT 1 FROM trades t 
          WHERE t.id::text = m1.context_id 
          AND t.seller_id = ${userId}
        )`
    )

  const avgResponseTime = responseTimeResult[0]?.avgMinutes
    ? Math.round(Number(responseTimeResult[0].avgMinutes))
    : null

  return {
    totalViews,
    conversionRate,
    avgResponseTime
  }
}

/**
 * Get listing-specific analytics
 */
export async function getListingAnalytics(listingId: number): Promise<{
  views: number
  uniqueViewers: number
  lastViewedAt: Date | null
}> {
  const result = await db
    .select({
      views: sql<number>`count(*)`,
      uniqueViewers: sql<number>`count(distinct user_id)`,
      lastViewedAt: sql<Date>`max(timestamp)`
    })
    .from(activityLogs)
    .where(sql`action = 'LISTING_VIEWED:${listingId}'`)

  return {
    views: Number(result[0]?.views || 0),
    uniqueViewers: Number(result[0]?.uniqueViewers || 0),
    lastViewedAt: result[0]?.lastViewedAt || null
  }
}

/**
 * Get trending listings based on recent views
 */
export async function getTrendingListings(limit: number = 10): Promise<
  Array<{
    listingId: number
    views: number
    recentViews: number
  }>
> {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const result = await db
    .select({
      listingId: sql<number>`CAST(SUBSTRING(action FROM 'LISTING_VIEWED:(.*)') AS INTEGER)`,
      views: sql<number>`count(*)`,
      recentViews: sql<number>`count(case when timestamp >= ${last24Hours} then 1 end)`
    })
    .from(activityLogs)
    .where(sql`action LIKE 'LISTING_VIEWED:%'`)
    .groupBy(sql`SUBSTRING(action FROM 'LISTING_VIEWED:(.*)')`)
    .orderBy(desc(sql`count(case when timestamp >= ${last24Hours} then 1 end)`))
    .limit(limit)

  return result.map(row => ({
    listingId: Number(row.listingId),
    views: Number(row.views),
    recentViews: Number(row.recentViews)
  }))
}

/**
 * Get platform-wide analytics
 */
export async function getPlatformAnalytics(): Promise<{
  totalListingViews: number
  dailyActiveListings: number
  avgConversionRate: number
  peakHour: number
}> {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Total listing views
  const [viewsResult] = await db
    .select({
      count: sql<number>`count(*)`
    })
    .from(activityLogs)
    .where(sql`action LIKE 'LISTING_VIEWED:%'`)

  // Daily active listings (viewed in last 24h)
  const [activeResult] = await db
    .select({
      count: sql<number>`count(distinct SUBSTRING(action FROM 'LISTING_VIEWED:(.*)'))`
    })
    .from(activityLogs)
    .where(
      and(
        sql`action LIKE 'LISTING_VIEWED:%'`,
        gte(activityLogs.timestamp, last24Hours)
      )
    )

  // Platform-wide conversion rate
  const [listingsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(escrowListings)
    .where(eq(escrowListings.isActive, true))

  const [tradesCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(trades)
    .where(sql`created_at >= ${last24Hours}`)

  const avgConversionRate =
    Number(listingsCount?.count) > 0
      ? Math.round(
          (Number(tradesCount?.count) / Number(listingsCount?.count)) * 100
        )
      : 0

  // Find peak hour from activity
  const [peakHourResult] = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM timestamp)`,
      count: sql<number>`count(*)`
    })
    .from(activityLogs)
    .where(
      and(
        sql`action LIKE 'LISTING_VIEWED:%'`,
        gte(activityLogs.timestamp, last24Hours)
      )
    )
    .groupBy(sql`EXTRACT(HOUR FROM timestamp)`)
    .orderBy(desc(sql`count(*)`))
    .limit(1)

  return {
    totalListingViews: Number(viewsResult?.count || 0),
    dailyActiveListings: Number(activeResult?.count || 0),
    avgConversionRate,
    peakHour: Number(peakHourResult?.hour || 12)
  }
}
