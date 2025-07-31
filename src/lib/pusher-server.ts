import Pusher from 'pusher'

import { pusherChannels, pusherEvents } from '@/config/api-endpoints'
import { envPublic } from '@/config/env.public'
import { envServer } from '@/config/env.server'
import type { TradeWithUsers } from '@/types/trade'

// Initialize Pusher server instance
export const pusherServer =
  envServer.PUSHER_APP_ID &&
  envPublic.NEXT_PUBLIC_PUSHER_KEY &&
  envServer.PUSHER_SECRET &&
  envPublic.NEXT_PUBLIC_PUSHER_CLUSTER
    ? new Pusher({
        appId: envServer.PUSHER_APP_ID,
        key: envPublic.NEXT_PUBLIC_PUSHER_KEY,
        secret: envServer.PUSHER_SECRET,
        cluster: envPublic.NEXT_PUBLIC_PUSHER_CLUSTER,
        useTLS: true
      })
    : null

// Trade-specific broadcast functions
export async function broadcastTradeUpdate(
  trade: TradeWithUsers,
  action: 'created' | 'updated' | 'status_changed' | 'disputed' | 'completed',
  previousStatus?: string
) {
  if (!pusherServer) return

  const channels = [
    pusherChannels.trade(trade.id), // Specific trade channel
    pusherChannels.userTrades(trade.buyerId), // Buyer's channel
    pusherChannels.userTrades(trade.sellerId) // Seller's channel
  ]

  const eventData = {
    trade,
    action,
    previousStatus,
    timestamp: new Date().toISOString()
  }

  try {
    // Broadcast to all relevant channels
    await Promise.all(
      channels.map(channel =>
        pusherServer.trigger(channel, pusherEvents.trade.updated, eventData)
      )
    )

    // Also broadcast to global channel for admins/dashboard
    if (action === 'created') {
      await pusherServer.trigger(
        pusherChannels.tradesGlobal,
        pusherEvents.trade.created,
        { trade }
      )
    } else {
      await pusherServer.trigger(
        pusherChannels.tradesGlobal,
        pusherEvents.trade.updated,
        { trade }
      )
    }
  } catch (error) {
    console.error('Failed to broadcast trade update:', error)
  }
}

export async function broadcastTradeStatusChange(
  tradeIdOrTrade: number | TradeWithUsers,
  newStatusOrPreviousStatus: string,
  previousStatus?: string
) {
  if (!pusherServer) return

  // If it's just an ID, create a minimal event
  if (typeof tradeIdOrTrade === 'number') {
    const eventData = {
      tradeId: tradeIdOrTrade,
      newStatus: newStatusOrPreviousStatus,
      previousStatus: previousStatus,
      timestamp: new Date().toISOString()
    }

    try {
      await pusherServer.trigger(
        pusherChannels.trade(tradeIdOrTrade),
        pusherEvents.trade.statusChanged,
        eventData
      )
    } catch (error) {
      console.error('Failed to broadcast trade status change:', error)
    }
    return
  }

  // Original implementation for full trade object
  const trade = tradeIdOrTrade
  const channels = [
    pusherChannels.trade(trade.id),
    pusherChannels.userTrades(trade.buyerId),
    pusherChannels.userTrades(trade.sellerId)
  ]

  const eventData = {
    tradeId: trade.id,
    newStatus: trade.status,
    previousStatus: newStatusOrPreviousStatus, // In this case, second param is previousStatus
    trade,
    timestamp: new Date().toISOString()
  }

  try {
    await Promise.all(
      channels.map(channel =>
        pusherServer.trigger(
          channel,
          pusherEvents.trade.statusChanged,
          eventData
        )
      )
    )
  } catch (error) {
    console.error('Failed to broadcast trade status change:', error)
  }
}

// Overloaded version that accepts trade ID
export async function broadcastTradeFunded(
  tradeIdOrTrade: number | TradeWithUsers,
  transactionHash?: string
) {
  if (!pusherServer) return

  // If it's just an ID, create a minimal event
  if (typeof tradeIdOrTrade === 'number') {
    const eventData = {
      tradeId: tradeIdOrTrade,
      transactionHash,
      timestamp: new Date().toISOString()
    }

    try {
      // Broadcast to trade-specific channel (others will need to refresh)
      await pusherServer.trigger(
        pusherChannels.trade(tradeIdOrTrade),
        pusherEvents.trade.funded,
        eventData
      )
    } catch (error) {
      console.error('Failed to broadcast trade funded event:', error)
    }
    return
  }

  // Original implementation for full trade object
  const trade = tradeIdOrTrade
  const channels = [
    pusherChannels.trade(trade.id),
    pusherChannels.userTrades(trade.buyerId),
    pusherChannels.userTrades(trade.sellerId)
  ]

  const eventData = {
    tradeId: trade.id,
    trade,
    transactionHash,
    timestamp: new Date().toISOString()
  }

  try {
    await Promise.all(
      channels.map(channel =>
        pusherServer.trigger(channel, pusherEvents.trade.funded, eventData)
      )
    )
  } catch (error) {
    console.error('Failed to broadcast trade funded event:', error)
  }
}

export async function broadcastTradeCompleted(
  tradeIdOrTrade: number | TradeWithUsers
) {
  if (!pusherServer) return

  // If it's just an ID, create a minimal event
  if (typeof tradeIdOrTrade === 'number') {
    const eventData = {
      tradeId: tradeIdOrTrade,
      timestamp: new Date().toISOString()
    }

    try {
      await pusherServer.trigger(
        pusherChannels.trade(tradeIdOrTrade),
        pusherEvents.trade.completed,
        eventData
      )
    } catch (error) {
      console.error('Failed to broadcast trade completed event:', error)
    }
    return
  }

  // Original implementation
  const trade = tradeIdOrTrade
  const channels = [
    pusherChannels.trade(trade.id),
    pusherChannels.userTrades(trade.buyerId),
    pusherChannels.userTrades(trade.sellerId)
  ]

  const eventData = {
    tradeId: trade.id,
    trade,
    timestamp: new Date().toISOString()
  }

  try {
    await Promise.all(
      channels.map(channel =>
        pusherServer.trigger(channel, pusherEvents.trade.completed, eventData)
      )
    )
  } catch (error) {
    console.error('Failed to broadcast trade completed event:', error)
  }
}

export async function broadcastTradeDisputed(
  trade: TradeWithUsers,
  disputeReason: string
) {
  if (!pusherServer) return

  const channels = [
    pusherChannels.trade(trade.id),
    pusherChannels.userTrades(trade.buyerId),
    pusherChannels.userTrades(trade.sellerId)
  ]

  const eventData = {
    tradeId: trade.id,
    disputeReason,
    trade,
    timestamp: new Date().toISOString()
  }

  try {
    await Promise.all(
      channels.map(channel =>
        pusherServer.trigger(channel, pusherEvents.trade.disputed, eventData)
      )
    )
  } catch (error) {
    console.error('Failed to broadcast trade disputed event:', error)
  }
}

// Battle-specific broadcast functions
export async function broadcastBattleInvitation(
  fromUserId: number,
  toUserId: number,
  invitationData: any
) {
  if (!pusherServer) return

  try {
    // Send to the recipient's personal channel
    await pusherServer.trigger(
      pusherChannels.user(toUserId),
      pusherEvents.battle.invitation,
      {
        ...invitationData,
        timestamp: new Date().toISOString()
      }
    )
  } catch (error) {
    console.error('Failed to broadcast battle invitation:', error)
  }
}

export async function broadcastBattleAccepted(
  fromUserId: number,
  toUserId: number,
  battleData: any
) {
  if (!pusherServer) return

  try {
    // Send battle-started to both users to ensure proper synchronization
    await Promise.all([
      // Sender receives 'battle-accepted' first to clear invitation state
      pusherServer.trigger(
        pusherChannels.user(fromUserId),
        pusherEvents.battle.accepted,
        {
          ...battleData,
          timestamp: new Date().toISOString()
        }
      ),
      // Then both receive 'battle-started' for synchronized transition
      pusherServer.trigger(
        pusherChannels.user(fromUserId),
        pusherEvents.battle.started,
        {
          ...battleData,
          timestamp: new Date().toISOString()
        }
      ),
      pusherServer.trigger(
        pusherChannels.user(toUserId),
        pusherEvents.battle.started,
        {
          ...battleData,
          timestamp: new Date().toISOString()
        }
      )
    ])
  } catch (error) {
    console.error('Failed to broadcast battle accepted:', error)
  }
}

export async function sendBattleEvent(eventType: string, data: any) {
  if (!pusherServer) return

  try {
    const channels: string[] = []

    // Send to both players' channels
    if (data.player1Id) {
      channels.push(pusherChannels.user(data.player1Id))
    }
    if (data.player2Id) {
      channels.push(pusherChannels.user(data.player2Id))
    }

    // Broadcast to all relevant channels
    await Promise.all(
      channels.map(channel =>
        pusherServer.trigger(channel, eventType, {
          ...data,
          timestamp: new Date().toISOString()
        })
      )
    )

    // Also update global battle stats
    if (eventType === 'battle-completed') {
      await broadcastBattleStats()
    }
  } catch (error) {
    console.error(`Failed to send battle event ${eventType}:`, error)
  }
}

export async function broadcastBattleRejected(
  fromUserId: number,
  toUserId: number,
  invitationId: number
) {
  if (!pusherServer) return

  try {
    // Notify the inviter that their invitation was rejected
    await pusherServer.trigger(
      pusherChannels.user(fromUserId),
      pusherEvents.battle.rejected,
      {
        invitationId,
        rejectedBy: toUserId,
        timestamp: new Date().toISOString()
      }
    )
  } catch (error) {
    console.error('Failed to broadcast battle rejected:', error)
  }
}

export async function broadcastBattleStats() {
  if (!pusherServer) return

  try {
    // Broadcast to global battle stats channel
    await pusherServer.trigger(
      pusherChannels.battleStats,
      pusherEvents.battle.statsUpdated,
      {
        timestamp: new Date().toISOString()
      }
    )
  } catch (error) {
    console.error('Failed to broadcast battle stats:', error)
  }
}

export async function broadcastQueueUpdate(
  userId: number,
  status: 'joined' | 'left' | 'matched'
) {
  if (!pusherServer) return

  try {
    // Broadcast to global battle queue channel and user's personal channel
    await Promise.all([
      pusherServer.trigger(
        pusherChannels.battleQueue,
        pusherEvents.battle.queueUpdated,
        {
          userId,
          status,
          timestamp: new Date().toISOString()
        }
      ),
      pusherServer.trigger(
        pusherChannels.user(userId),
        pusherEvents.battle.queueStatus,
        {
          status,
          timestamp: new Date().toISOString()
        }
      )
    ])
  } catch (error) {
    console.error('Failed to broadcast queue update:', error)
  }
}
