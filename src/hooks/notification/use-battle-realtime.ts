'use client'

import { useEffect, useCallback, useState } from 'react'

import { mutate } from 'swr'

import {
  apiEndpoints,
  pusherChannels,
  pusherEvents,
  pusherSystemEvents
} from '@/config/api-endpoints'
import { useToast } from '@/hooks/use-toast'
import { pusherClient } from '@/lib/pusher'

interface BattleRealtimeEvents {
  onInvitationReceived?: (data: any) => void
  onInvitationAccepted?: (data: any) => void
  onInvitationRejected?: (data: any) => void
  onBattleStarted?: (data: any) => void
  onBattleUpdate?: (data: any) => void
  onBattleCompleted?: (data: any) => void
  onBattleTimeout?: (data: any) => void
  onQueueStatusChanged?: (data: any) => void
  onStatsUpdated?: () => void
  onOpponentAction?: (data: any) => void
}

export function useBattleRealtime(
  userId?: number,
  events?: BattleRealtimeEvents
) {
  const { toast } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Handle connection state
  const handleConnectionStateChange = useCallback((state: any) => {
    const connected = state.current === 'connected'
    setIsConnected(connected)
    setConnectionError(
      connected ? null : 'Connection lost. Attempting to reconnect...'
    )
  }, [])

  // Setup Pusher subscriptions
  useEffect(() => {
    if (!pusherClient || !userId) return

    // Subscribe to user's personal channel
    const userChannel = pusherClient.subscribe(pusherChannels.user(userId))

    // Subscribe to global battle channels
    const statsChannel = pusherClient.subscribe(pusherChannels.battleStats)
    const queueChannel = pusherClient.subscribe(pusherChannels.battleQueue)

    // Connection state monitoring
    pusherClient.connection.bind('state_change', handleConnectionStateChange)

    // User-specific events
    userChannel.bind(pusherEvents.battle.invitation, (data: any) => {
      // Update invitations cache
      mutate(apiEndpoints.battles.invitations)

      // Show toast notification
      const displayName =
        data.fromUser?.name ||
        data.fromUser?.email ||
        `${data.fromUser?.walletAddress?.slice(0, 6)}...${data.fromUser?.walletAddress?.slice(-4)}` ||
        'A warrior'

      toast({
        title: '⚔️ Battle Challenge!',
        description: `${displayName} wants to battle you!`,
        variant: 'default'
      })

      // Call custom handler if provided
      events?.onInvitationReceived?.(data)
    })

    userChannel.bind(pusherEvents.battle.accepted, (data: any) => {
      // Battle was accepted by opponent
      toast({
        title: '⚔️ Battle Accepted!',
        description: 'Your opponent accepted the challenge. Battle starting!',
        variant: 'default'
      })

      events?.onInvitationAccepted?.(data)

      // Refresh battle data
      mutate(apiEndpoints.battles.invitations)
      mutate(apiEndpoints.battles.dailyLimit)
      mutate(apiEndpoints.battles.history)
      mutate(apiEndpoints.battles.current)
    })

    userChannel.bind(pusherEvents.battle.rejected, (data: any) => {
      // Battle was rejected by opponent
      toast({
        title: 'Challenge Declined',
        description: 'Your opponent declined the battle challenge.',
        variant: 'default'
      })

      events?.onInvitationRejected?.(data)

      // Refresh invitations
      mutate(apiEndpoints.battles.invitations)
    })

    userChannel.bind(pusherEvents.battle.started, (data: any) => {
      // Battle is starting (for the accepter)
      toast({
        title: '⚔️ Battle Starting!',
        description: 'Get ready to fight!',
        variant: 'default'
      })

      events?.onBattleStarted?.(data)

      // Refresh battle data
      mutate(apiEndpoints.battles.dailyLimit)
      mutate(apiEndpoints.battles.history)
      // Battle state is updated via the event, no need to poll
    })

    userChannel.bind(pusherEvents.battle.update, (data: any) => {
      // Handle different types of battle updates
      if (data.type === 'energy-update') {
        // Energy update from a player action
        events?.onOpponentAction?.(data)
      } else {
        // Battle round update
        events?.onBattleUpdate?.(data)
      }

      // Battle state is updated via the event, no need to poll
    })

    userChannel.bind(pusherEvents.battle.completed, (data: any) => {
      // Battle has completed
      events?.onBattleCompleted?.(data)

      // Refresh all battle data
      mutate(apiEndpoints.battles.dailyLimit)
      mutate(apiEndpoints.battles.history)
      mutate(apiEndpoints.battles.activeDiscount)
      // Battle completed, no need to poll current battle
      if (userId) {
        mutate(apiEndpoints.battles.statsByUserId(userId))
      }
    })

    userChannel.bind(pusherEvents.battle.timeout, (data: any) => {
      // Battle has timed out
      events?.onBattleTimeout?.(data)

      // Refresh all battle data
      mutate(apiEndpoints.battles.dailyLimit)
      mutate(apiEndpoints.battles.history)
      mutate(apiEndpoints.battles.activeDiscount)
      if (userId) {
        mutate(apiEndpoints.battles.statsByUserId(userId))
      }
    })

    userChannel.bind(pusherEvents.battle.opponentAction, (data: any) => {
      // Opponent performed an action in battle
      events?.onOpponentAction?.(data)
    })

    userChannel.bind(pusherEvents.battle.queueStatus, (data: any) => {
      events?.onQueueStatusChanged?.(data)

      // Refresh queue info
      mutate(apiEndpoints.battles.queueInfo)
    })

    // Global events
    statsChannel.bind(pusherEvents.battle.statsUpdated, () => {
      // Refresh live stats
      mutate(apiEndpoints.battles.liveStats)
      events?.onStatsUpdated?.()
    })

    queueChannel.bind(pusherEvents.battle.queueUpdated, (_data: any) => {
      // Refresh queue statistics
      mutate(apiEndpoints.battles.liveStats)
      mutate(apiEndpoints.battles.queueInfo)
    })

    // Error handling
    userChannel.bind(pusherSystemEvents.subscriptionError, (error: any) => {
      console.error('Pusher subscription error:', error)
      setConnectionError('Failed to subscribe to battle updates')
    })

    // Cleanup
    return () => {
      // Unbind all events
      userChannel.unbind_all()
      statsChannel.unbind_all()
      queueChannel.unbind_all()

      // Unsubscribe from channels
      pusherClient?.unsubscribe(pusherChannels.user(userId))
      pusherClient?.unsubscribe(pusherChannels.battleStats)
      pusherClient?.unsubscribe(pusherChannels.battleQueue)

      // Unbind connection state
      pusherClient?.connection.unbind(
        'state_change',
        handleConnectionStateChange
      )
    }
  }, [userId, toast, events, handleConnectionStateChange])

  // Retry connection
  const retryConnection = useCallback(() => {
    if (pusherClient && !isConnected) {
      pusherClient.connect()
    }
  }, [isConnected])

  // Force refresh all battle data
  const refreshBattleData = useCallback(() => {
    if (!userId) return

    // Refresh all battle-related endpoints
    mutate(apiEndpoints.battles.invitations)
    mutate(apiEndpoints.battles.liveStats)
    mutate(apiEndpoints.battles.queueInfo)
    mutate(apiEndpoints.battles.dailyLimit)
    mutate(apiEndpoints.battles.history)
    mutate(apiEndpoints.battles.activeDiscount)
    mutate(apiEndpoints.battles.statsByUserId(userId))
    // Don't poll current battle - it's managed via Pusher
  }, [userId])

  return {
    isConnected,
    connectionError,
    retryConnection,
    refreshBattleData
  }
}

// Hook for subscribing to battle stats only
export function useBattleStats() {
  const [stats, setStats] = useState({
    warriorsOnline: 0,
    activeBattles: 0,
    inQueue: 0
  })

  useEffect(() => {
    if (!pusherClient) return

    const statsChannel = pusherClient.subscribe(pusherChannels.battleStats)
    const queueChannel = pusherClient.subscribe(pusherChannels.battleQueue)

    const fetchStats = async () => {
      try {
        const response = await fetch(apiEndpoints.battles.liveStats)
        const data = await response.json()
        if (data?.data) {
          setStats(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch battle stats:', error)
      }
    }

    // Initial fetch
    fetchStats()

    // Listen for updates
    statsChannel.bind(pusherEvents.battle.statsUpdated, fetchStats)
    queueChannel.bind(pusherEvents.battle.queueUpdated, fetchStats)

    return () => {
      statsChannel.unbind(pusherEvents.battle.statsUpdated)
      queueChannel.unbind(pusherEvents.battle.queueUpdated)
      pusherClient?.unsubscribe(pusherChannels.battleStats)
      pusherClient?.unsubscribe(pusherChannels.battleQueue)
    }
  }, [])

  return stats
}
