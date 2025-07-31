import 'server-only'

import {
  and,
  count,
  desc,
  asc,
  eq,
  or,
  gte,
  lte,
  inArray,
  aliasedTable
} from 'drizzle-orm'

import { appRoutes } from '@/config/app-routes'
import { feeConstants } from '@/config/business-constants'
import { envServer } from '@/config/env.server'
import { db } from '@/lib/db/drizzle'
import {
  trades,
  users,
  userTradingStats,
  escrowListings,
  ActivityType,
  teamMembers
} from '@/lib/db/schema'
import {
  broadcastTradeUpdate,
  broadcastTradeStatusChange,
  broadcastTradeFunded,
  broadcastTradeCompleted,
  broadcastTradeDisputed
} from '@/lib/pusher-server'
import type {
  CreateTradeInput,
  FundTradeInput,
  ConfirmTradeInput,
  DisputeTradeInput,
  ResolveDisputeInput
} from '@/lib/schemas/trade'
import { TRADE_STATUS, type TradeStatus } from '@/types/listings'
import type {
  Trade,
  TradeWithUsers,
  TradeFilters,
  TradeMetadata,
  TradeResponse,
  TradesListResponse
} from '@/types/trade'
import { canPerformAction } from '@/types/trade'

import { createNotification } from './notification'
import { sendDepositMessage, type TradeMessageData } from './trade-messages'

// Create a new trade
export async function createTrade(
  input: CreateTradeInput & {
    buyerId: number
    chainId: number
    escrowId?: number
  }
): Promise<TradeResponse> {
  try {
    // Get the listing
    const [listing] = await db
      .select()
      .from(escrowListings)
      .where(
        and(
          eq(escrowListings.id, input.listingId),
          eq(escrowListings.isActive, true)
        )
      )
      .limit(1)

    if (!listing) {
      return { success: false, error: 'Listing not found or inactive' }
    }

    // Validate amount is within listing limits
    const amount = parseFloat(input.amount)
    const minAmount = listing.minAmount ? parseFloat(listing.minAmount) : 0
    const maxAmount = listing.maxAmount
      ? parseFloat(listing.maxAmount)
      : Infinity

    if (amount < minAmount || amount > maxAmount) {
      return {
        success: false,
        error: `Amount must be between ${minAmount} and ${maxAmount}`
      }
    }

    // Check if buyer is not the seller
    if (listing.userId === input.buyerId) {
      return { success: false, error: 'Cannot trade with yourself' }
    }

    // Determine buyer and seller based on listing type
    const buyerId =
      listing.listingType === 'sell' ? input.buyerId : listing.userId
    const sellerId =
      listing.listingType === 'sell' ? listing.userId : input.buyerId

    // Create trade metadata
    const metadata: TradeMetadata = {
      originalListingId: listing.id,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      escrowContractAddress: input.escrowId
        ? `escrow-${input.escrowId}`
        : undefined
    }

    // Create the trade
    const [trade] = await db
      .insert(trades)
      .values({
        escrowId: input.escrowId || 0, // Will be updated when escrow created on-chain
        chainId: input.chainId,
        buyerId,
        sellerId,
        amount: input.amount,
        currency: listing.tokenOffered || 'USD',
        listingCategory: 'p2p',
        status: TRADE_STATUS.CREATED,
        metadata
      })
      .returning()

    // Get trade with user details
    const tradeWithUsers = await getTradeWithUsers(trade.id)

    if (!tradeWithUsers) {
      return { success: false, error: 'Failed to retrieve created trade' }
    }

    // Log trade creation activity
    await logTradeActivity(tradeWithUsers, 'Trade created')

    // Update user trading stats
    await updateTradingStats(buyerId, ActivityType.TRADE_CREATED)
    await updateTradingStats(sellerId, ActivityType.TRADE_CREATED)

    // Broadcast real-time update
    await broadcastTradeUpdate(tradeWithUsers, 'created')

    return { success: true, trade: tradeWithUsers }
  } catch (error) {
    console.error('Error creating trade:', error)
    return { success: false, error: 'Failed to create trade' }
  }
}

// Get user's trades with filters
export async function getUserTrades(
  userId: number,
  filters: TradeFilters
): Promise<TradesListResponse> {
  try {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit

    // Build where conditions
    const conditions = []

    // User role filter
    if (filters.role === 'buyer') {
      conditions.push(eq(trades.buyerId, userId))
    } else if (filters.role === 'seller') {
      conditions.push(eq(trades.sellerId, userId))
    } else {
      conditions.push(
        or(eq(trades.buyerId, userId), eq(trades.sellerId, userId))
      )
    }

    // Status filter
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(trades.status, filters.status))
      } else {
        conditions.push(eq(trades.status, filters.status))
      }
    }

    // Chain filter
    if (filters.chainId) {
      conditions.push(eq(trades.chainId, filters.chainId))
    }

    // Date filters
    if (filters.startDate) {
      conditions.push(gte(trades.createdAt, filters.startDate))
    }
    if (filters.endDate) {
      conditions.push(lte(trades.createdAt, filters.endDate))
    }

    // Amount filters
    if (filters.minAmount) {
      conditions.push(gte(trades.amount, filters.minAmount))
    }
    if (filters.maxAmount) {
      conditions.push(lte(trades.amount, filters.maxAmount))
    }

    // Create aliases for buyer and seller users
    const buyerUsers = aliasedTable(users, 'buyerUsers')
    const sellerUsers = aliasedTable(users, 'sellerUsers')

    // Get trades with pagination
    const [tradesList, totalCount] = await Promise.all([
      db
        .select({
          trade: trades,
          buyer: buyerUsers,
          seller: sellerUsers
        })
        .from(trades)
        .innerJoin(buyerUsers, eq(trades.buyerId, buyerUsers.id))
        .innerJoin(sellerUsers, eq(trades.sellerId, sellerUsers.id))
        .where(and(...conditions))
        .orderBy(desc(trades.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(trades)
        .where(and(...conditions))
    ])

    // Format the response
    const formattedTrades: TradeWithUsers[] = tradesList.map((row: any) => ({
      ...row.trade,
      buyer: row.buyer,
      seller: row.seller,
      metadata: row.trade.metadata as TradeMetadata | null
    }))

    return {
      success: true,
      trades: formattedTrades,
      total: totalCount[0]?.count || 0,
      page,
      limit
    }
  } catch (error) {
    console.error('Error getting user trades:', error)
    return {
      success: false,
      trades: [],
      total: 0,
      page: 1,
      limit: 20,
      error: 'Failed to get trades'
    }
  }
}

// Mark trade as funded (after on-chain escrow funding)
export async function fundTrade(
  input: FundTradeInput & { escrowId?: number },
  userId: number
): Promise<TradeResponse> {
  try {
    const trade = await getTradeWithUsers(input.tradeId)
    if (!trade) {
      return { success: false, error: 'Trade not found' }
    }

    // Check if user is the buyer
    if (trade.buyerId !== userId) {
      return { success: false, error: 'Only buyer can mark trade as funded' }
    }

    // Check if action is allowed
    if (!canPerformAction(trade.status as TradeStatus, 'fund')) {
      return {
        success: false,
        error: `Cannot fund trade in ${trade.status} status`
      }
    }

    // Update trade metadata
    const metadata = (trade.metadata as TradeMetadata) || {}
    metadata.fundedAt = new Date().toISOString()
    if (input.transactionHash) {
      metadata.paymentProof = metadata.paymentProof || []
      metadata.paymentProof.push(input.transactionHash)
    }
    if (input.paymentProof) {
      metadata.paymentProof = [
        ...(metadata.paymentProof || []),
        ...input.paymentProof
      ]
    }

    // Update trade status and escrowId if provided
    const updateData: any = {
      status: TRADE_STATUS.FUNDED,
      metadata
    }

    if (input.escrowId !== undefined) {
      updateData.escrowId = input.escrowId
    }

    const [updatedTrade] = await db
      .update(trades)
      .set(updateData)
      .where(eq(trades.id, input.tradeId))
      .returning()

    // Get updated trade with users
    const updatedTradeWithUsers = await getTradeWithUsers(input.tradeId)

    // Log funding activity
    await logTradeActivity(trade, 'Trade funded')

    // Broadcast real-time updates
    if (updatedTradeWithUsers) {
      await broadcastTradeFunded(updatedTradeWithUsers)
      await broadcastTradeStatusChange(
        updatedTradeWithUsers,
        TRADE_STATUS.CREATED
      )
    }

    return { success: true, trade: updatedTrade }
  } catch (error) {
    console.error('Error funding trade:', error)
    return { success: false, error: 'Failed to fund trade' }
  }
}

// Confirm trade delivery
export async function confirmTrade(
  input: ConfirmTradeInput,
  userId: number
): Promise<TradeResponse> {
  try {
    const trade = await getTradeWithUsers(input.tradeId)
    if (!trade) {
      return { success: false, error: 'Trade not found' }
    }

    // Check if user has permission to confirm
    // For domain trades: buyer confirms domain receipt
    // For P2P trades: seller confirms payment receipt
    if (trade.listingCategory === 'domain') {
      if (trade.buyerId !== userId) {
        return {
          success: false,
          error: 'Only buyer can confirm domain receipt'
        }
      }
    } else {
      if (trade.sellerId !== userId) {
        return {
          success: false,
          error: 'Only seller can confirm payment receipt'
        }
      }
    }

    // Check if action is allowed
    if (!canPerformAction(trade.status as TradeStatus, 'confirm')) {
      return {
        success: false,
        error: `Cannot confirm trade in ${trade.status} status`
      }
    }

    // Update trade metadata
    const metadata = (trade.metadata as TradeMetadata) || {}

    // If releaseTxHash is provided, this means seller confirmed payment AND released funds
    // So we can mark the trade as completed directly
    const isPaymentConfirmWithRelease =
      trade.status === TRADE_STATUS.PAYMENT_SENT && input.releaseTxHash

    if (isPaymentConfirmWithRelease) {
      metadata.completedAt = new Date().toISOString()
      metadata.claimTxHash = input.releaseTxHash // Store the release transaction hash
    }

    if (input.rating) {
      metadata.rating = metadata.rating || {}
      metadata.rating.fromBuyer = input.rating
    }

    // Update trade status - always go to COMPLETED when payment is confirmed
    // since we now release funds automatically
    const newStatus = TRADE_STATUS.COMPLETED

    const [updatedTrade] = await db
      .update(trades)
      .set({
        status: newStatus,
        completedAt: new Date(), // Always set completedAt since trade is completed
        metadata
      })
      .where(eq(trades.id, input.tradeId))
      .returning()

    // Update trading stats for both users
    await updateTradingStats(trade.buyerId, ActivityType.TRADE_COMPLETED, {
      rating: input.rating
    })
    await updateTradingStats(trade.sellerId, ActivityType.TRADE_COMPLETED, {
      rating: input.rating,
      volume: trade.amount
    })

    // Get updated trade with users
    const updatedTradeWithUsers = await getTradeWithUsers(input.tradeId)

    // Log confirmation activity
    await logTradeActivity(
      trade,
      'Payment confirmed and funds released to buyer - trade completed'
    )

    // Broadcast real-time updates
    if (updatedTradeWithUsers) {
      await broadcastTradeCompleted(updatedTradeWithUsers)
      await broadcastTradeStatusChange(
        updatedTradeWithUsers,
        TRADE_STATUS.FUNDED
      )
    }

    return { success: true, trade: updatedTrade }
  } catch (error) {
    console.error('Error confirming trade:', error)
    return { success: false, error: 'Failed to confirm trade' }
  }
}

// Raise dispute
export async function disputeTrade(
  input: DisputeTradeInput,
  userId: number
): Promise<TradeResponse> {
  try {
    const trade = await getTradeWithUsers(input.tradeId)
    if (!trade) {
      return { success: false, error: 'Trade not found' }
    }

    // Check if user is part of the trade
    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      return { success: false, error: 'You are not part of this trade' }
    }

    // Check if action is allowed
    if (!canPerformAction(trade.status as TradeStatus, 'dispute')) {
      return {
        success: false,
        error: `Cannot dispute trade in ${trade.status} status`
      }
    }

    // Update trade metadata
    const metadata = (trade.metadata as TradeMetadata) || {}
    metadata.disputedAt = new Date().toISOString()
    metadata.disputeReason = input.reason
    if (input.evidence) {
      metadata.disputeEvidence = input.evidence
    }
    if (input.evidenceImages) {
      metadata.disputeEvidenceImages = input.evidenceImages
    }

    // Update trade status
    const [updatedTrade] = await db
      .update(trades)
      .set({
        status: TRADE_STATUS.DISPUTED,
        metadata
      })
      .where(eq(trades.id, input.tradeId))
      .returning()

    // Update trading stats
    await updateTradingStats(userId, ActivityType.TRADE_DISPUTED)

    // Get updated trade with users
    const updatedTradeWithUsers = await getTradeWithUsers(input.tradeId)

    // Log dispute activity
    await logTradeActivity(trade, `Trade disputed`)

    // Broadcast real-time updates
    if (updatedTradeWithUsers) {
      const previousStatus = trade.status as string
      await broadcastTradeDisputed(updatedTradeWithUsers, input.reason)
      await broadcastTradeStatusChange(updatedTradeWithUsers, previousStatus)
    }

    return { success: true, trade: updatedTrade }
  } catch (error) {
    console.error('Error disputing trade:', error)
    return { success: false, error: 'Failed to dispute trade' }
  }
}

// Cancel trade
export async function cancelTrade(
  tradeId: number,
  userId: number,
  reason?: string
): Promise<TradeResponse> {
  try {
    const trade = await getTradeWithUsers(tradeId)
    if (!trade) {
      return { success: false, error: 'Trade not found' }
    }

    // Check if user is part of the trade
    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      return { success: false, error: 'You are not part of this trade' }
    }

    // Check if action is allowed
    if (!canPerformAction(trade.status as TradeStatus, 'cancel')) {
      return {
        success: false,
        error: `Cannot cancel trade in ${trade.status} status`
      }
    }

    // Update trade metadata
    const metadata = (trade.metadata as TradeMetadata) || {}
    metadata.notes = reason || 'Trade cancelled by user'

    // Update trade status
    const [updatedTrade] = await db
      .update(trades)
      .set({
        status: TRADE_STATUS.CANCELLED,
        metadata
      })
      .where(eq(trades.id, tradeId))
      .returning()

    // If this is a domain trade, reactivate the original listing
    if (trade.listingCategory === 'domain' && metadata.originalListingId) {
      await db
        .update(escrowListings)
        .set({ isActive: true })
        .where(eq(escrowListings.id, metadata.originalListingId))
    }

    // Log cancellation activity
    await logTradeActivity(trade, 'Trade cancelled')

    return { success: true, trade: updatedTrade }
  } catch (error) {
    console.error('Error cancelling trade:', error)
    return { success: false, error: 'Failed to cancel trade' }
  }
}

// Resolve dispute (admin only)
export async function resolveDispute(
  input: ResolveDisputeInput,
  _adminId: number
): Promise<TradeResponse> {
  try {
    const trade = await getTradeWithUsers(input.tradeId)
    if (!trade) {
      return { success: false, error: 'Trade not found' }
    }

    // Check if trade is in dispute
    if (trade.status !== TRADE_STATUS.DISPUTED) {
      return { success: false, error: 'Trade is not in dispute' }
    }

    // Update trade metadata
    const metadata = (trade.metadata as TradeMetadata) || {}
    metadata.notes = input.notes

    // Determine final status based on resolution
    let finalStatus: TradeStatus = TRADE_STATUS.COMPLETED
    if (input.resolution === 'refund_to_buyer') {
      finalStatus = TRADE_STATUS.CANCELLED
    }

    // Update trade status
    const [updatedTrade] = await db
      .update(trades)
      .set({
        status: finalStatus,
        completedAt: finalStatus === TRADE_STATUS.COMPLETED ? new Date() : null,
        metadata
      })
      .where(eq(trades.id, input.tradeId))
      .returning()

    // Update trading stats based on resolution
    if (input.resolution === 'release_to_seller') {
      await updateTradingStats(trade.sellerId, 'dispute_won')
      await updateTradingStats(trade.buyerId, 'dispute_lost')
    } else if (input.resolution === 'refund_to_buyer') {
      await updateTradingStats(trade.buyerId, 'dispute_won')
      await updateTradingStats(trade.sellerId, 'dispute_lost')
    }

    // Log resolution activity
    await logTradeActivity(trade, `Trade dispute resolved: ${input.resolution}`)

    return { success: true, trade: updatedTrade }
  } catch (error) {
    console.error('Error resolving dispute:', error)
    return { success: false, error: 'Failed to resolve dispute' }
  }
}

// Helper: Get trade with user details
export async function getTradeWithUsers(
  tradeId: number
): Promise<TradeWithUsers | null> {
  // Create aliases for buyer and seller users
  const buyerUsers = aliasedTable(users, 'buyerUsers')
  const sellerUsers = aliasedTable(users, 'sellerUsers')

  const result = await db
    .select({
      trade: trades,
      buyer: buyerUsers,
      seller: sellerUsers
    })
    .from(trades)
    .innerJoin(buyerUsers, eq(trades.buyerId, buyerUsers.id))
    .innerJoin(sellerUsers, eq(trades.sellerId, sellerUsers.id))
    .where(eq(trades.id, tradeId))
    .limit(1)

  if (!result[0]) return null

  return {
    ...result[0].trade,
    buyer: result[0].buyer,
    seller: result[0].seller,
    metadata: result[0].trade.metadata as TradeMetadata | null,
    listingCategory: (result[0].trade.listingCategory || 'p2p') as
      | 'p2p'
      | 'domain'
  }
}

// Helper: Get user's primary team
async function getUserPrimaryTeam(userId: number): Promise<number> {
  try {
    const [userTeam] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .limit(1)

    return userTeam?.teamId || 1 // Default to system team (1) if no team found
  } catch (error) {
    console.error('Error getting user team:', error)
    return 1 // Default to system team on error
  }
}

// Helper: Log trade activity
async function logTradeActivity(trade: TradeWithUsers | Trade, action: string) {
  try {
    // Map action strings to ActivityType enum values
    const actionTypeMap: Record<string, ActivityType> = {
      'Trade created': ActivityType.TRADE_CREATED,
      'Trade funded': ActivityType.TRADE_FUNDED,
      'Trade delivered': ActivityType.TRADE_DELIVERED,
      'Payment confirmed and funds released to buyer - trade completed':
        ActivityType.TRADE_COMPLETED,
      'Trade cancelled': ActivityType.TRADE_CANCELLED,
      'Trade refunded': ActivityType.TRADE_REFUNDED
    }

    // Check if action contains "disputed"
    let activityType: ActivityType | string = actionTypeMap[action] || action
    if (action.toLowerCase().includes('disputed')) {
      activityType = ActivityType.TRADE_DISPUTED
    } else if (action.toLowerCase().includes('resolved')) {
      activityType = ActivityType.TRADE_COMPLETED
    }

    // Get team IDs for both parties
    const buyerTeamId = await getUserPrimaryTeam(trade.buyerId)
    const sellerTeamId = await getUserPrimaryTeam(trade.sellerId)

    // Prepare notification messages
    const getNotificationMessage = (role: 'buyer' | 'seller'): string => {
      const tradeId = `#${trade.id}`

      switch (activityType) {
        case ActivityType.TRADE_CREATED:
          return role === 'buyer'
            ? `Your trade ${tradeId} has been created. Please fund the escrow to proceed.`
            : `Trade ${tradeId} has been created. Waiting for buyer to fund the escrow.`

        case ActivityType.TRADE_FUNDED:
          return role === 'buyer'
            ? `You have successfully funded trade ${tradeId}. Waiting for seller to deliver.`
            : `Trade ${tradeId} has been funded. Please deliver the asset to the buyer.`

        case ActivityType.TRADE_DELIVERED:
          return role === 'buyer'
            ? `Seller has marked trade ${tradeId} as delivered. Please confirm receipt.`
            : `You have marked trade ${tradeId} as delivered. Waiting for buyer confirmation.`

        case ActivityType.TRADE_COMPLETED:
          return role === 'buyer'
            ? `Trade ${tradeId} completed successfully. Asset received and funds released.`
            : `Trade ${tradeId} completed successfully. Payment confirmed and funds released.`

        case ActivityType.TRADE_DISPUTED:
          const disputeReason = action.split(': ')[1] || 'No reason provided'
          return role === 'buyer'
            ? `You have disputed trade ${tradeId}: ${disputeReason}`
            : `Trade ${tradeId} has been disputed: ${disputeReason}`

        case ActivityType.TRADE_CANCELLED:
          return role === 'buyer'
            ? `Trade ${tradeId} has been cancelled. Any funds will be refunded.`
            : `Trade ${tradeId} has been cancelled.`

        case ActivityType.TRADE_REFUNDED:
          return role === 'buyer'
            ? `Trade ${tradeId} has been refunded. Funds returned to your wallet.`
            : `Trade ${tradeId} has been refunded to the buyer.`

        default:
          return `Trade ${tradeId}: ${action}`
      }
    }

    const getNotificationTitle = (_role: 'buyer' | 'seller'): string => {
      switch (activityType) {
        case ActivityType.TRADE_CREATED:
          return 'Trade Created'
        case ActivityType.TRADE_FUNDED:
          return 'Trade Funded'
        case ActivityType.TRADE_DELIVERED:
          return 'Asset Delivered'
        case ActivityType.TRADE_COMPLETED:
          return 'Trade Completed'
        case ActivityType.TRADE_DISPUTED:
          return 'Trade Disputed'
        case ActivityType.TRADE_CANCELLED:
          return 'Trade Cancelled'
        case ActivityType.TRADE_REFUNDED:
          return 'Trade Refunded'
        default:
          return 'Trade Update'
      }
    }

    // Create notifications for both parties
    const tradeUrl = appRoutes.trades.history.detail(trade.id.toString())

    // Notification for buyer
    await createNotification({
      userId: trade.buyerId,
      teamId: buyerTeamId,
      action: activityType as string,
      title: getNotificationTitle('buyer'),
      message: getNotificationMessage('buyer'),
      actionUrl: tradeUrl,
      notificationType: 'trade',
      metadata: {
        tradeId: trade.id,
        role: 'buyer',
        sellerId: trade.sellerId,
        amount: trade.amount,
        currency: trade.currency
      }
    })

    // Notification for seller
    await createNotification({
      userId: trade.sellerId,
      teamId: sellerTeamId,
      action: activityType as string,
      title: getNotificationTitle('seller'),
      message: getNotificationMessage('seller'),
      actionUrl: tradeUrl,
      notificationType: 'trade',
      metadata: {
        tradeId: trade.id,
        role: 'seller',
        buyerId: trade.buyerId,
        amount: trade.amount,
        currency: trade.currency
      }
    })

    // Log to console for debugging (can be removed in production)
    if (envServer.NODE_ENV === 'development') {
      console.log(`Trade Activity: ${action} for trade #${trade.id}`)
    }
  } catch (error) {
    // Don't let logging errors break the trade flow
    console.error('Error logging trade activity:', error)
  }
}

// Helper: Update user trading stats
async function updateTradingStats(
  userId: number,
  event: ActivityType | string,
  data?: Record<string, any>
) {
  try {
    // Get or create user trading stats
    let [stats] = await db
      .select()
      .from(userTradingStats)
      .where(eq(userTradingStats.userId, userId))
      .limit(1)

    if (!stats) {
      // Create initial stats
      ;[stats] = await db
        .insert(userTradingStats)
        .values({
          userId,
          totalTrades: 0,
          successfulTrades: 0,
          totalVolume: '0',
          disputesWon: 0,
          disputesLost: 0,
          rating: 5
        })
        .returning()
    }

    // Update based on event
    const updates: Partial<typeof userTradingStats.$inferInsert> = {
      updatedAt: new Date()
    }

    switch (event) {
      case ActivityType.TRADE_CREATED:
        updates.totalTrades = stats.totalTrades + 1
        break

      case ActivityType.TRADE_COMPLETED:
        updates.successfulTrades = stats.successfulTrades + 1
        if (data?.volume) {
          const currentVolume = parseFloat(stats.totalVolume)
          const newVolume = currentVolume + parseFloat(data.volume)
          updates.totalVolume = newVolume.toString()
        }
        if (data?.rating) {
          // Calculate new average rating
          const totalRatings = stats.successfulTrades
          const currentTotal = stats.rating * totalRatings
          const newAverage = (currentTotal + data.rating) / (totalRatings + 1)
          updates.rating = Math.round(newAverage * 10) / 10
        }
        break

      case ActivityType.TRADE_DISPUTED:
        // Just increment the total trades that had disputes
        // We handle won/lost separately
        break

      case 'dispute_won':
        updates.disputesWon = stats.disputesWon + 1
        break

      case 'dispute_lost':
        updates.disputesLost = stats.disputesLost + 1
        break
    }

    await db
      .update(userTradingStats)
      .set(updates)
      .where(eq(userTradingStats.userId, userId))
      .execute()
  } catch (error) {
    console.error('Error updating trading stats:', error)
  }
}

// Deposit to escrow (called by seller after trade accepted)
export async function depositToEscrow(input: {
  tradeId: number
  transactionHash: string
  escrowId: number
  userId: number
}): Promise<TradeResponse> {
  try {
    // Get the trade
    const [trade] = await db
      .select()
      .from(trades)
      .where(eq(trades.id, input.tradeId))
      .limit(1)

    if (!trade) {
      return { success: false, error: 'Trade not found' }
    }

    // Check if user is the seller
    if (trade.sellerId !== input.userId) {
      return { success: false, error: 'Only seller can deposit to escrow' }
    }

    // Check trade status
    if (trade.status !== TRADE_STATUS.AWAITING_DEPOSIT) {
      return { success: false, error: 'Trade is not awaiting deposit' }
    }

    // Check deposit deadline
    if (trade.depositDeadline && new Date() > new Date(trade.depositDeadline)) {
      // Mark trade as timed out
      await db
        .update(trades)
        .set({ status: TRADE_STATUS.DEPOSIT_TIMEOUT })
        .where(eq(trades.id, input.tradeId))

      return { success: false, error: 'Deposit deadline has passed' }
    }

    // Update trade with escrow details
    const metadata = (trade.metadata as TradeMetadata) || {}
    metadata.cryptoDepositTxHash = input.transactionHash

    // Calculate fee using config
    const amount = parseFloat(trade.amount)
    const feePercent = feeConstants.BASE_PERCENTAGE / 100 // Convert percentage to decimal
    const feeAmount = amount * feePercent
    const netAmount = amount - feeAmount

    metadata.escrowFeeAmount = feeAmount.toFixed(6)
    metadata.escrowNetAmount = netAmount.toFixed(6)

    const [updatedTrade] = await db
      .update(trades)
      .set({
        escrowId: input.escrowId,
        status: TRADE_STATUS.FUNDED,
        depositedAt: new Date(),
        metadata
      })
      .where(eq(trades.id, input.tradeId))
      .returning()

    // Broadcast update
    await broadcastTradeFunded(input.tradeId, input.transactionHash)

    // Send automatic message to trade chat
    const tradeMessageData: TradeMessageData = {
      tradeId: trade.id,
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.currency,
      chainId: trade.chainId,
      metadata
    }
    await sendDepositMessage(tradeMessageData, input.transactionHash)

    return { success: true, trade: updatedTrade }
  } catch (error) {
    console.error('Error depositing to escrow:', error)
    return { success: false, error: 'Failed to process deposit' }
  }
}

// Mark payment as sent (called by buyer after deposit)
export async function markPaymentSent(input: {
  tradeId: number
  userId: number
  paymentProof?: string
  notes?: string
}): Promise<TradeResponse> {
  try {
    // Get the trade
    const [trade] = await db
      .select()
      .from(trades)
      .where(eq(trades.id, input.tradeId))
      .limit(1)

    if (!trade) {
      return { success: false, error: 'Trade not found' }
    }

    // Check if user has permission to mark payment/transfer as sent
    // For domain trades: seller marks domain transfer
    // For P2P trades: buyer marks payment sent
    if (trade.listingCategory === 'domain') {
      if (trade.sellerId !== input.userId) {
        return {
          success: false,
          error: 'Only seller can mark domain as transferred'
        }
      }
    } else {
      if (trade.buyerId !== input.userId) {
        return { success: false, error: 'Only buyer can mark payment as sent' }
      }
    }

    // Check trade status
    if (trade.status !== TRADE_STATUS.FUNDED) {
      return { success: false, error: 'Trade must be funded first' }
    }

    // Update trade metadata
    const metadata = (trade.metadata as any) || {}
    if (input.paymentProof) {
      metadata.paymentProof = input.paymentProof
    }
    if (input.notes) {
      metadata.paymentNotes = input.notes
    }

    const [updatedTrade] = await db
      .update(trades)
      .set({
        status: TRADE_STATUS.PAYMENT_SENT,
        paymentSentAt: new Date(),
        metadata
      })
      .where(eq(trades.id, input.tradeId))
      .returning()

    // Broadcast update
    await broadcastTradeStatusChange(input.tradeId, TRADE_STATUS.PAYMENT_SENT)

    return { success: true, trade: updatedTrade }
  } catch (error) {
    console.error('Error marking payment as sent:', error)
    return { success: false, error: 'Failed to update payment status' }
  }
}

// Confirm payment received (called by seller)
export async function confirmPaymentReceived(input: {
  tradeId: number
  userId: number
}): Promise<TradeResponse> {
  try {
    // Get the trade
    const [trade] = await db
      .select()
      .from(trades)
      .where(eq(trades.id, input.tradeId))
      .limit(1)

    if (!trade) {
      return { success: false, error: 'Trade not found' }
    }

    // Check if user is the seller
    if (trade.sellerId !== input.userId) {
      return { success: false, error: 'Only seller can confirm payment' }
    }

    // Check trade status
    if (trade.status !== TRADE_STATUS.PAYMENT_SENT) {
      return { success: false, error: 'Payment has not been marked as sent' }
    }

    const [updatedTrade] = await db
      .update(trades)
      .set({
        status: TRADE_STATUS.COMPLETED,
        paymentConfirmedAt: new Date(),
        completedAt: new Date()
      })
      .where(eq(trades.id, input.tradeId))
      .returning()

    // Update user stats
    await updateTradingStats(trade.buyerId, ActivityType.TRADE_COMPLETED, {
      volume: trade.amount
    })
    await updateTradingStats(trade.sellerId, ActivityType.TRADE_COMPLETED, {
      volume: trade.amount
    })

    // Broadcast completion
    await broadcastTradeCompleted(input.tradeId)

    return { success: true, trade: updatedTrade }
  } catch (error) {
    console.error('Error confirming payment:', error)
    return { success: false, error: 'Failed to confirm payment' }
  }
}

export async function getTradesForTable(
  userId: number,
  params: {
    page: number
    limit: number
    sortBy: string
    sortOrder: 'asc' | 'desc'
    globalFilter?: string
  }
) {
  try {
    const offset = (params.page - 1) * params.limit

    // Aliases for buyer and seller
    const buyer = aliasedTable(users, 'buyer')
    const seller = aliasedTable(users, 'seller')

    // Build where conditions - only check user is buyer or seller
    const conditions = []
    conditions.push(or(eq(trades.buyerId, userId), eq(trades.sellerId, userId)))

    // Get total count
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(trades)
      .where(and(...conditions))

    // Determine the sorting column
    let orderByColumn
    switch (params.sortBy) {
      case 'id':
        orderByColumn = trades.id
        break
      case 'amount':
        orderByColumn = trades.amount
        break
      case 'status':
        orderByColumn = trades.status
        break
      case 'listingCategory':
        orderByColumn = trades.listingCategory
        break
      case 'buyerId':
        orderByColumn = trades.buyerId
        break
      case 'createdAt':
      default:
        orderByColumn = trades.createdAt
        break
    }

    // Apply sort order
    const sortFn = params.sortOrder === 'asc' ? asc : desc

    // Get paginated data with user joins
    const results = await db
      .select({
        trade: trades,
        buyer: buyer,
        seller: seller
      })
      .from(trades)
      .leftJoin(buyer, eq(trades.buyerId, buyer.id))
      .leftJoin(seller, eq(trades.sellerId, seller.id))
      .where(and(...conditions))
      .orderBy(sortFn(orderByColumn))
      .limit(params.limit)
      .offset(offset)

    // Transform results to match TradeWithUsers type
    const data = results.map(({ trade, buyer, seller }) => ({
      ...trade,
      buyer,
      seller
    })) as TradeWithUsers[]

    const pageCount = Math.ceil(totalCount / params.limit)

    return {
      data,
      pageCount,
      totalCount
    }
  } catch (error) {
    console.error('Error getting trades for table:', error)
    return {
      data: [],
      pageCount: 0,
      totalCount: 0
    }
  }
}

export async function getTradeStats(userId: number) {
  try {
    // Define pending statuses
    const pendingStatuses = [
      TRADE_STATUS.CREATED,
      TRADE_STATUS.AWAITING_DEPOSIT,
      TRADE_STATUS.FUNDED,
      TRADE_STATUS.PAYMENT_SENT,
      TRADE_STATUS.PAYMENT_CONFIRMED,
      TRADE_STATUS.DELIVERED,
      TRADE_STATUS.CONFIRMED
    ]

    // Get all user trades
    const userTrades = await db
      .select()
      .from(trades)
      .where(or(eq(trades.buyerId, userId), eq(trades.sellerId, userId)))

    // Calculate stats
    const totalTrades = userTrades.length
    const pendingTrades = userTrades.filter(t =>
      pendingStatuses.includes(t.status as any)
    ).length
    const completedTrades = userTrades.filter(
      t => t.status === TRADE_STATUS.COMPLETED
    ).length
    const disputedTrades = userTrades.filter(
      t => t.status === TRADE_STATUS.DISPUTED
    ).length

    const totalVolume = userTrades
      .filter(t => t.status === TRADE_STATUS.COMPLETED)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)

    const successRate =
      totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 100

    return {
      totalTrades,
      pendingTrades,
      completedTrades,
      disputedTrades,
      totalVolume,
      successRate
    }
  } catch (error) {
    console.error('Error getting trade stats:', error)
    return {
      totalTrades: 0,
      pendingTrades: 0,
      completedTrades: 0,
      disputedTrades: 0,
      totalVolume: 0,
      successRate: 100
    }
  }
}
