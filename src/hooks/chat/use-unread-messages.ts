'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

import { pusherChannels, pusherEvents } from '@/config/api-endpoints'
import { getUnreadCountAction } from '@/lib/actions/chat'
import { pusherClient } from '@/lib/pusher'

interface UnreadState {
  [contextId: string]: number
}

interface UseUnreadMessagesProps {
  userId: number
  contextType: 'team' | 'direct' | 'trade'
  contextIds: string[]
}

export function useUnreadMessages({
  userId,
  contextType,
  contextIds
}: UseUnreadMessagesProps) {
  const [unreadCounts, setUnreadCounts] = useState<UnreadState>({})
  const [isLoading, setIsLoading] = useState(true)
  const channelsRef = useRef<Set<string>>(new Set())

  // Fetch initial unread counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const counts: UnreadState = {}
      await Promise.all(
        contextIds.map(async contextId => {
          const count = await getUnreadCountAction(contextType, contextId)
          counts[contextId] = count
        })
      )
      setUnreadCounts(counts)
    } catch (error) {
      console.error('Failed to fetch unread counts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [contextType, contextIds])

  // Update unread count for a specific context
  const updateUnreadCount = useCallback((contextId: string, count: number) => {
    setUnreadCounts(prev => ({
      ...prev,
      [contextId]: count
    }))
  }, [])

  // Increment unread count
  const incrementUnread = useCallback((contextId: string) => {
    setUnreadCounts(prev => ({
      ...prev,
      [contextId]: (prev[contextId] || 0) + 1
    }))
  }, [])

  // Clear unread count
  const clearUnread = useCallback((contextId: string) => {
    setUnreadCounts(prev => ({
      ...prev,
      [contextId]: 0
    }))
  }, [])

  // Set up Pusher subscriptions for real-time updates
  useEffect(() => {
    if (!userId || contextIds.length === 0 || !pusherClient) return

    // Subscribe to each context's channel
    contextIds.forEach(contextId => {
      const channelName = pusherChannels.presence(contextType, contextId)

      if (!channelsRef.current.has(channelName) && pusherClient) {
        const channel = pusherClient.subscribe(channelName)
        channelsRef.current.add(channelName)

        // Listen for new messages
        channel.bind(pusherEvents.chat.messageNew, (data: any) => {
          // Only increment if the message is not from the current user
          if (data.senderId !== userId) {
            incrementUnread(contextId)
          }
        })

        // Listen for read receipts
        channel.bind('messages-read', (data: any) => {
          if (data.userId === userId) {
            clearUnread(contextId)
          }
        })
      }
    })

    // Fetch initial counts
    fetchUnreadCounts()

    // Cleanup
    return () => {
      channelsRef.current.forEach(channelName => {
        pusherClient?.unsubscribe(channelName)
      })
      channelsRef.current.clear()
    }
  }, [
    userId,
    contextType,
    contextIds,
    fetchUnreadCounts,
    incrementUnread,
    clearUnread
  ])

  // Mark messages as read for a specific context
  const markAsRead = useCallback(
    async (contextId: string) => {
      clearUnread(contextId)
      // The actual marking as read is handled by the chat component
    },
    [clearUnread]
  )

  return {
    unreadCounts,
    isLoading,
    updateUnreadCount,
    incrementUnread,
    clearUnread,
    markAsRead,
    getTotalUnread: useCallback(
      () => Object.values(unreadCounts).reduce((sum, count) => sum + count, 0),
      [unreadCounts]
    )
  }
}
