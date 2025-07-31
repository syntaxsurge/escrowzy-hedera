import { SQL, and, asc, desc, ilike, or, sql, eq } from 'drizzle-orm'

import type { TradeWithUsers } from '@/types/trade'

import { db } from '../drizzle'
import { trades, users } from '../schema'
import { type TableRequest, type TableResponse } from './table-queries'

export interface DisputedTradeWithUsers extends TradeWithUsers {
  buyerName: string | null
  buyerEmail: string | null
  buyerWalletAddress: string | null
  sellerName: string | null
  sellerEmail: string | null
  sellerWalletAddress: string | null
  disputedAt: string
}

export async function getDisputesWithPagination(
  request: TableRequest
): Promise<TableResponse<DisputedTradeWithUsers>> {
  const { pagination, globalFilter, columnFilters, sorting } = request
  const { pageIndex, pageSize } = pagination

  const conditions: SQL[] = [
    // Only show disputed trades
    eq(trades.status, 'disputed')
  ]

  if (globalFilter) {
    conditions.push(
      or(
        sql`CAST(${trades.id} AS TEXT) ILIKE ${`%${globalFilter}%`}`,
        ilike(trades.currency, `%${globalFilter}%`)
      )!
    )
  }

  if (columnFilters) {
    columnFilters.forEach((filter: any) => {
      if (filter.id === 'listingCategory' && filter.value) {
        conditions.push(eq(trades.listingCategory, String(filter.value)))
      }
    })
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Build order by clause from sorting or use default
  const orderByClause: SQL[] = []

  if (sorting && sorting.length > 0) {
    sorting.forEach(sort => {
      const { id, desc: isDesc } = sort

      if (id === 'id') {
        orderByClause.push(isDesc ? desc(trades.id) : asc(trades.id))
      } else if (id === 'amount') {
        orderByClause.push(
          isDesc
            ? desc(sql`CAST(${trades.amount} AS DECIMAL)`)
            : asc(sql`CAST(${trades.amount} AS DECIMAL)`)
        )
      } else if (id === 'listingCategory') {
        orderByClause.push(
          isDesc ? desc(trades.listingCategory) : asc(trades.listingCategory)
        )
      } else if (id === 'disputedAt') {
        orderByClause.push(
          isDesc
            ? desc(sql`(trades.metadata->>'disputedAt')::timestamp`)
            : asc(sql`(trades.metadata->>'disputedAt')::timestamp`)
        )
      }
    })
  }

  // Default sort by dispute date (most recent first) if no sorting specified
  if (orderByClause.length === 0) {
    orderByClause.push(desc(sql`(trades.metadata->>'disputedAt')::timestamp`))
  }

  // Aliases for buyer and seller
  const buyerAlias = sql`buyer`
  const sellerAlias = sql`seller`

  const baseQuery = db
    .select({
      // Trade fields
      id: trades.id,
      escrowId: trades.escrowId,
      chainId: trades.chainId,
      buyerId: trades.buyerId,
      sellerId: trades.sellerId,
      amount: trades.amount,
      currency: trades.currency,
      listingCategory: trades.listingCategory,
      status: trades.status,
      depositDeadline: trades.depositDeadline,
      metadata: trades.metadata,
      createdAt: trades.createdAt,
      // Buyer fields
      buyerName: sql<string | null>`${buyerAlias}.name`,
      buyerEmail: sql<string | null>`${buyerAlias}.email`,
      buyerWalletAddress: sql<string | null>`${buyerAlias}.wallet_address`,
      // Seller fields
      sellerName: sql<string | null>`${sellerAlias}.name`,
      sellerEmail: sql<string | null>`${sellerAlias}.email`,
      sellerWalletAddress: sql<string | null>`${sellerAlias}.wallet_address`
    })
    .from(trades)
    .leftJoin(
      sql`${users} AS ${buyerAlias}`,
      sql`${buyerAlias}.id = ${trades.buyerId}`
    )
    .leftJoin(
      sql`${users} AS ${sellerAlias}`,
      sql`${sellerAlias}.id = ${trades.sellerId}`
    )

  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(trades)
      .where(whereClause)
      .then(res => res[0]?.count || 0),
    baseQuery
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(pageIndex * pageSize)
  ])

  const totalCount = Number(countResult)
  const pageCount = Math.ceil(totalCount / pageSize)

  // Format the data to match the expected structure
  const formattedData = data.map(row => {
    const metadata = row.metadata as any
    const disputedAt = metadata?.disputedAt || row.createdAt

    return {
      ...row,
      buyer: row.buyerId
        ? {
            id: row.buyerId,
            name: row.buyerName || null,
            email: row.buyerEmail || null,
            walletAddress: row.buyerWalletAddress || null
          }
        : null,
      seller: row.sellerId
        ? {
            id: row.sellerId,
            name: row.sellerName || null,
            email: row.sellerEmail || null,
            walletAddress: row.sellerWalletAddress || null
          }
        : null,
      // Add missing date fields that TradeWithUsers expects
      depositedAt: null,
      paymentSentAt: null,
      paymentConfirmedAt: null,
      completedAt: null,
      updatedAt: row.createdAt, // Use createdAt as fallback
      disputedAt: disputedAt // Extract disputed date for sorting
    }
  }) as any as DisputedTradeWithUsers[]

  return {
    data: formattedData,
    pageCount,
    totalCount
  }
}

export async function resolveDispute(
  tradeId: number,
  resolution: 'release_to_seller' | 'refund_to_buyer' | 'split',
  notes: string,
  splitPercentage?: number
) {
  const [trade] = await db
    .select()
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1)

  if (!trade || trade.status !== 'disputed') {
    throw new Error('Trade not found or not in disputed status')
  }

  const metadata = (trade.metadata as any) || {}
  metadata.disputeResolution = {
    resolution,
    notes,
    splitPercentage,
    resolvedAt: new Date().toISOString()
  }

  const [updatedTrade] = await db
    .update(trades)
    .set({
      status: 'completed',
      metadata
    })
    .where(eq(trades.id, tradeId))
    .returning()

  return updatedTrade
}
