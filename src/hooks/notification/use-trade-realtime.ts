'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

import {
  pusherChannels,
  pusherEvents,
  pusherSystemEvents
} from '@/config/api-endpoints'
import { pusherClient } from '@/lib/pusher'
import type { TradeWithUsers } from '@/types/trade'

interface UseTradeRealtimeProps {
  tradeId?: number
  userId?: number
  onTradeUpdate?: (trade: TradeWithUsers) => void
  onStatusChange?: (tradeId: number, newStatus: string) => void
}

interface TradeRealtimeEvent {
  trade: TradeWithUsers
  action: 'created' | 'updated' | 'status_changed' | 'disputed' | 'completed'
  previousStatus?: string
}

export function useTradeRealtime({
  tradeId,
  userId,
  onTradeUpdate,
  onStatusChange
}: UseTradeRealtimeProps = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const channelsRef = useRef<Set<any>>(new Set())

  useEffect(() => {
    if (!pusherClient) {
      setIsConnected(false)
      return
    }

    const channels: string[] = []

    // Subscribe to specific trade channel if tradeId is provided
    if (tradeId) {
      channels.push(pusherChannels.trade(tradeId))
    }

    // Subscribe to user's trades channel if userId is provided
    if (userId) {
      channels.push(pusherChannels.userTrades(userId))
    }

    // Subscribe to channels
    channels.forEach(channelName => {
      const channel = pusherClient!.subscribe(channelName)
      channelsRef.current.add(channel)

      channel.bind(pusherSystemEvents.subscriptionSucceeded, () => {
        setIsConnected(true)
      })

      channel.bind(pusherSystemEvents.subscriptionError, () => {
        setIsConnected(false)
      })

      // Listen for trade updates
      channel.bind(pusherEvents.trade.updated, (event: TradeRealtimeEvent) => {
        setLastUpdate(new Date())

        if (onTradeUpdate) {
          onTradeUpdate(event.trade)
        }

        if (onStatusChange && event.action === 'status_changed') {
          onStatusChange(event.trade.id, event.trade.status)
        }
      })

      // Listen for trade status changes
      channel.bind(
        pusherEvents.trade.statusChanged,
        (event: {
          tradeId: number
          newStatus: string
          previousStatus: string
          trade: TradeWithUsers
        }) => {
          setLastUpdate(new Date())

          if (onTradeUpdate) {
            onTradeUpdate(event.trade)
          }

          if (onStatusChange) {
            onStatusChange(event.tradeId, event.newStatus)
          }
        }
      )

      // Listen for trade funded events
      channel.bind(
        pusherEvents.trade.funded,
        (event: { tradeId: number; trade: TradeWithUsers }) => {
          setLastUpdate(new Date())

          if (onTradeUpdate) {
            onTradeUpdate(event.trade)
          }
        }
      )

      // Listen for trade completion
      channel.bind(
        pusherEvents.trade.completed,
        (event: { tradeId: number; trade: TradeWithUsers }) => {
          setLastUpdate(new Date())

          if (onTradeUpdate) {
            onTradeUpdate(event.trade)
          }
        }
      )

      // Listen for dispute events
      channel.bind(
        pusherEvents.trade.disputed,
        (event: {
          tradeId: number
          disputeReason: string
          trade: TradeWithUsers
        }) => {
          setLastUpdate(new Date())

          if (onTradeUpdate) {
            onTradeUpdate(event.trade)
          }
        }
      )
    })

    // Cleanup function
    return () => {
      channelsRef.current.forEach(channel => {
        channel.unbind_all()
        pusherClient?.unsubscribe(channel.name)
      })
      channelsRef.current.clear()
    }
  }, [tradeId, userId, onTradeUpdate, onStatusChange])

  const triggerManualUpdate = useCallback(() => {
    setLastUpdate(new Date())
  }, [])

  return {
    isConnected,
    lastUpdate,
    triggerManualUpdate
  }
}

// Hook for listening to all trades (for admin or dashboard overview)
export function useAllTradesRealtime(
  onNewTrade?: (trade: TradeWithUsers) => void,
  onTradeUpdate?: (trade: TradeWithUsers) => void
) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!pusherClient) {
      setIsConnected(false)
      return
    }

    const channelName = pusherChannels.tradesGlobal

    if (channelRef.current?.name === channelName) {
      return
    }

    if (channelRef.current) {
      pusherClient.unsubscribe(channelRef.current.name)
    }

    const channel = pusherClient.subscribe(channelName)
    channelRef.current = channel

    channel.bind(pusherSystemEvents.subscriptionSucceeded, () => {
      setIsConnected(true)
    })

    channel.bind(pusherSystemEvents.subscriptionError, () => {
      setIsConnected(false)
    })

    // Listen for new trades
    channel.bind(
      pusherEvents.trade.created,
      (event: { trade: TradeWithUsers }) => {
        if (onNewTrade) {
          onNewTrade(event.trade)
        }
      }
    )

    // Listen for trade updates
    channel.bind(
      pusherEvents.trade.updated,
      (event: { trade: TradeWithUsers }) => {
        if (onTradeUpdate) {
          onTradeUpdate(event.trade)
        }
      }
    )

    return () => {
      if (pusherClient && channel) {
        channel.unbind_all()
        pusherClient.unsubscribe(channelName)
      }
      channelRef.current = null
    }
  }, [onNewTrade, onTradeUpdate])

  return {
    isConnected
  }
}
