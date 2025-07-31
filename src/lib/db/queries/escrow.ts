import { eq, desc, and, or, sql } from 'drizzle-orm'
import { ZERO_ADDRESS } from 'thirdweb'

import { db } from '../drizzle'
import { trades, users } from '../schema'

export interface EscrowData {
  id: string
  escrowId: number | null
  chainId: number
  buyer: string
  seller: string
  buyerId: number
  sellerId: number
  amount: string
  currency: string
  fee: string
  status: string
  createdAt: Date
  fundedAt?: Date | null
  completedAt?: Date | null
  cancelledAt?: Date | null
  disputeWindow?: number
  metadata?: any
  transactionHash?: string
  contractAddress?: string
}

export interface EscrowFilter {
  status?: string
  buyer?: string
  seller?: string
  chainId?: number
  limit?: number
  offset?: number
}

/**
 * Get escrow by ID with full details including user wallet addresses
 */
export async function getEscrowById(
  escrowId: string
): Promise<EscrowData | null> {
  // Extract numeric ID from escrow_123 format
  const numericId = parseInt(escrowId.replace('escrow_', ''))

  if (isNaN(numericId)) {
    return null
  }

  const [trade] = await db
    .select({
      id: trades.id,
      escrowId: trades.escrowId,
      chainId: trades.chainId,
      buyerId: trades.buyerId,
      sellerId: trades.sellerId,
      amount: trades.amount,
      currency: trades.currency,
      status: trades.status,
      createdAt: trades.createdAt,
      depositedAt: trades.depositedAt,
      completedAt: trades.completedAt,
      metadata: trades.metadata,
      depositDeadline: trades.depositDeadline,
      buyerWallet: users.walletAddress,
      sellerWallet:
        sql<string>`(SELECT wallet_address FROM users WHERE id = ${trades.sellerId})`.as(
          'sellerWallet'
        )
    })
    .from(trades)
    .leftJoin(users, eq(users.id, trades.buyerId))
    .where(eq(trades.escrowId, numericId))
    .limit(1)

  if (!trade) {
    return null
  }

  // Calculate fee (1% of amount)
  const fee = (parseFloat(trade.amount) * 0.01).toFixed(6)

  return {
    id: `escrow_${trade.escrowId}`,
    escrowId: trade.escrowId,
    chainId: trade.chainId,
    buyer: trade.buyerWallet || ZERO_ADDRESS,
    seller: trade.sellerWallet || ZERO_ADDRESS,
    buyerId: trade.buyerId,
    sellerId: trade.sellerId,
    amount: trade.amount,
    currency: trade.currency,
    fee,
    status: trade.status.toUpperCase(),
    createdAt: trade.createdAt,
    fundedAt: trade.depositedAt,
    completedAt: trade.completedAt,
    cancelledAt: null,
    disputeWindow: trade.depositDeadline
      ? Math.floor(
          (trade.depositDeadline.getTime() - trade.createdAt.getTime()) / 1000
        )
      : 86400,
    metadata: trade.metadata
  }
}

/**
 * List escrows with filtering and pagination
 */
export async function listEscrows(filter: EscrowFilter): Promise<{
  escrows: EscrowData[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}> {
  const limit = Math.min(filter.limit || 10, 100)
  const offset = filter.offset || 0

  // Build where conditions
  const conditions = []

  if (filter.status) {
    conditions.push(eq(trades.status, filter.status.toLowerCase()))
  }

  if (filter.chainId) {
    conditions.push(eq(trades.chainId, filter.chainId))
  }

  if (filter.buyer) {
    const [buyerUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.walletAddress, filter.buyer))
      .limit(1)

    if (buyerUser) {
      conditions.push(eq(trades.buyerId, buyerUser.id))
    }
  }

  if (filter.seller) {
    const [sellerUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.walletAddress, filter.seller))
      .limit(1)

    if (sellerUser) {
      conditions.push(eq(trades.sellerId, sellerUser.id))
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(trades)
    .where(whereClause)

  // Get paginated results
  const results = await db
    .select({
      id: trades.id,
      escrowId: trades.escrowId,
      chainId: trades.chainId,
      buyerId: trades.buyerId,
      sellerId: trades.sellerId,
      amount: trades.amount,
      currency: trades.currency,
      status: trades.status,
      createdAt: trades.createdAt,
      depositedAt: trades.depositedAt,
      completedAt: trades.completedAt,
      metadata: trades.metadata,
      buyerWallet: users.walletAddress,
      sellerWallet:
        sql<string>`(SELECT wallet_address FROM users WHERE id = ${trades.sellerId})`.as(
          'sellerWallet'
        )
    })
    .from(trades)
    .leftJoin(users, eq(users.id, trades.buyerId))
    .where(whereClause)
    .orderBy(desc(trades.createdAt))
    .limit(limit)
    .offset(offset)

  const escrows = results.map(trade => {
    const fee = (parseFloat(trade.amount) * 0.01).toFixed(6)

    return {
      id: `escrow_${trade.escrowId || trade.id}`,
      escrowId: trade.escrowId,
      chainId: trade.chainId,
      buyer: trade.buyerWallet || ZERO_ADDRESS,
      seller: trade.sellerWallet || ZERO_ADDRESS,
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.currency,
      fee,
      status: trade.status.toUpperCase(),
      createdAt: trade.createdAt,
      fundedAt: trade.depositedAt,
      completedAt: trade.completedAt,
      metadata: trade.metadata
    }
  })

  return {
    escrows,
    pagination: {
      total: Number(count),
      limit,
      offset,
      hasMore: offset + limit < Number(count)
    }
  }
}

/**
 * Create a new escrow record in the database
 */
export async function createEscrow(data: {
  buyerId: number
  sellerId: number
  amount: string
  currency: string
  chainId: number
  contractAddress: string
  disputeWindow?: number
  metadata?: any
  teamId?: number
}): Promise<EscrowData> {
  const [trade] = await db
    .insert(trades)
    .values({
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      amount: data.amount,
      currency: data.currency,
      chainId: data.chainId,
      listingCategory: 'p2p',
      status: 'created',
      metadata: data.metadata,
      depositDeadline: data.disputeWindow
        ? new Date(Date.now() + data.disputeWindow * 1000)
        : new Date(Date.now() + 86400000) // 24 hours default
    })
    .returning()

  // Get wallet addresses
  const [buyer, seller] = await Promise.all([
    db
      .select({ walletAddress: users.walletAddress })
      .from(users)
      .where(eq(users.id, data.buyerId))
      .limit(1),
    db
      .select({ walletAddress: users.walletAddress })
      .from(users)
      .where(eq(users.id, data.sellerId))
      .limit(1)
  ])

  const fee = (parseFloat(data.amount) * 0.01).toFixed(6)

  return {
    id: `escrow_${trade.id}`,
    escrowId: trade.escrowId || trade.id,
    chainId: trade.chainId,
    buyer: buyer[0]?.walletAddress || ZERO_ADDRESS,
    seller: seller[0]?.walletAddress || ZERO_ADDRESS,
    buyerId: trade.buyerId,
    sellerId: trade.sellerId,
    amount: trade.amount,
    currency: trade.currency,
    fee,
    status: 'CREATED',
    createdAt: trade.createdAt,
    disputeWindow: data.disputeWindow || 86400,
    metadata: trade.metadata,
    contractAddress: data.contractAddress
  }
}

/**
 * Update escrow status
 */
export async function updateEscrowStatus(
  escrowId: number,
  status: string,
  additionalData?: {
    transactionHash?: string
    metadata?: any
  }
): Promise<boolean> {
  const updateData: any = { status: status.toLowerCase() }

  if (status === 'FUNDED') {
    updateData.depositedAt = new Date()
  } else if (status === 'COMPLETED') {
    updateData.completedAt = new Date()
  }

  if (additionalData?.metadata) {
    updateData.metadata = additionalData.metadata
  }

  await db.update(trades).set(updateData).where(eq(trades.escrowId, escrowId))

  return true
}

/**
 * Get user escrow statistics
 */
export async function getUserEscrowStats(userId: number): Promise<{
  totalEscrows: number
  completedEscrows: number
  disputedEscrows: number
  totalVolume: string
  avgCompletionTime: number
}> {
  const stats = await db
    .select({
      totalEscrows: sql<number>`count(*)`,
      completedEscrows: sql<number>`count(case when status = 'completed' then 1 end)`,
      disputedEscrows: sql<number>`count(case when status = 'disputed' then 1 end)`,
      totalVolume: sql<string>`coalesce(sum(cast(amount as decimal)), 0)`,
      avgCompletionMinutes: sql<number>`
        avg(
          case when completed_at is not null 
          then extract(epoch from (completed_at - created_at)) / 60 
          end
        )`
    })
    .from(trades)
    .where(or(eq(trades.buyerId, userId), eq(trades.sellerId, userId)))

  return {
    totalEscrows: Number(stats[0].totalEscrows) || 0,
    completedEscrows: Number(stats[0].completedEscrows) || 0,
    disputedEscrows: Number(stats[0].disputedEscrows) || 0,
    totalVolume: stats[0].totalVolume || '0',
    avgCompletionTime: Math.round(Number(stats[0].avgCompletionMinutes) || 0)
  }
}
