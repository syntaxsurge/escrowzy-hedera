import { useEffect, useRef, useState, useCallback } from 'react'

import { pusherChannels, pusherEvents } from '@/config/api-endpoints'
import { pusherClient } from '@/lib/pusher'

export interface ScrollManagementOptions {
  enableAutoScroll?: boolean
  scrollOnNewMessage?: boolean
  preserveScrollPosition?: boolean
}

export function useScrollManagement(options: ScrollManagementOptions = {}) {
  const {
    enableAutoScroll = false,
    scrollOnNewMessage = false,
    preserveScrollPosition = true
  } = options

  const scrollRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(enableAutoScroll)
  const [userHasScrolled, setUserHasScrolled] = useState(false)
  const lastScrollPosition = useRef<number>(0)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior, block: 'end' })
    }
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    const isAtBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 100

    setUserHasScrolled(true)
    setShouldAutoScroll(isAtBottom)
    lastScrollPosition.current = element.scrollTop
  }, [])

  const preserveScroll = useCallback(() => {
    if (preserveScrollPosition && scrollRef.current?.parentElement) {
      const container = scrollRef.current.parentElement
      if (lastScrollPosition.current > 0) {
        container.scrollTop = lastScrollPosition.current
      }
    }
  }, [preserveScrollPosition])

  useEffect(() => {
    if (scrollOnNewMessage && shouldAutoScroll && !userHasScrolled) {
      scrollToBottom()
    }
  }, [scrollOnNewMessage, shouldAutoScroll, userHasScrolled, scrollToBottom])

  return {
    scrollRef,
    shouldAutoScroll,
    userHasScrolled,
    handleScroll,
    scrollToBottom,
    preserveScroll,
    setShouldAutoScroll
  }
}

export interface UnreadMessage {
  contextType: 'team' | 'direct' | 'trade'
  contextId: string
  count: number
  lastMessageId?: number
}

export function useRealtimeUnreadBadges(currentUserId: number) {
  const [unreadMessages, setUnreadMessages] = useState<
    Map<string, UnreadMessage>
  >(new Map())
  const activeChannelsRef = useRef<Set<string>>(new Set())

  const markAsRead = useCallback(
    (contextType: 'team' | 'direct' | 'trade', contextId: string) => {
      setUnreadMessages(prev => {
        const next = new Map(prev)
        next.delete(`${contextType}-${contextId}`)
        return next
      })
    },
    []
  )

  const incrementUnread = useCallback(
    (
      contextType: 'team' | 'direct' | 'trade',
      contextId: string,
      messageId?: number
    ) => {
      setUnreadMessages(prev => {
        const next = new Map(prev)
        const key = `${contextType}-${contextId}`
        const current = next.get(key)

        next.set(key, {
          contextType,
          contextId,
          count: (current?.count || 0) + 1,
          lastMessageId: messageId || current?.lastMessageId
        })

        return next
      })
    },
    []
  )

  const subscribeToUnreadUpdates = useCallback(
    (channels: string[]) => {
      if (!pusherClient) return

      channels.forEach(channelName => {
        if (activeChannelsRef.current.has(channelName)) return

        const channel = pusherClient!.subscribe(channelName)
        activeChannelsRef.current.add(channelName)

        channel.bind(pusherEvents.chat.messageNew, (message: any) => {
          if (message.senderId !== currentUserId) {
            const [, contextType, ...contextIdParts] = channelName.split('-')
            const contextId = contextIdParts.join('-')
            incrementUnread(
              contextType as 'team' | 'direct' | 'trade',
              contextId,
              message.id
            )
          }
        })

        channel.bind('messages-read', (data: { userId: number }) => {
          if (data.userId === currentUserId) {
            const [, contextType, ...contextIdParts] = channelName.split('-')
            const contextId = contextIdParts.join('-')
            markAsRead(contextType as 'team' | 'direct' | 'trade', contextId)
          }
        })
      })

      return () => {
        channels.forEach(channelName => {
          if (pusherClient && activeChannelsRef.current.has(channelName)) {
            pusherClient!.unsubscribe(channelName)
            activeChannelsRef.current.delete(channelName)
          }
        })
      }
    },
    [currentUserId, incrementUnread, markAsRead]
  )

  return {
    unreadMessages,
    markAsRead,
    incrementUnread,
    subscribeToUnreadUpdates,
    getUnreadCount: (
      contextType: 'team' | 'direct' | 'trade',
      contextId: string
    ) => {
      return unreadMessages.get(`${contextType}-${contextId}`)?.count || 0
    }
  }
}

export function useRealtimeConversationList() {
  const [newConversations, setNewConversations] = useState<Set<string>>(
    new Set()
  )
  const channelRef = useRef<any>(null)

  const subscribeToNewConversations = useCallback((userId: number) => {
    if (!pusherClient) return

    const channelName = pusherChannels.userConversations(userId)

    if (channelRef.current?.name === channelName) return

    if (channelRef.current) {
      pusherClient!.unsubscribe(channelRef.current.name)
    }

    const channel = pusherClient!.subscribe(channelName)
    channelRef.current = channel

    channel.bind(
      'new-conversation',
      (data: {
        contextType: string
        contextId: string
        user?: any
        team?: any
      }) => {
        setNewConversations(prev =>
          new Set(prev).add(`${data.contextType}-${data.contextId}`)
        )
      }
    )

    return () => {
      if (pusherClient && channel) {
        channel.unbind_all()
        pusherClient!.unsubscribe(channelName)
      }
      channelRef.current = null
    }
  }, [])

  const clearNewConversation = useCallback(
    (contextType: string, contextId: string) => {
      setNewConversations(prev => {
        const next = new Set(prev)
        next.delete(`${contextType}-${contextId}`)
        return next
      })
    },
    []
  )

  return {
    newConversations,
    subscribeToNewConversations,
    clearNewConversation,
    hasNewConversation: (contextType: string, contextId: string) => {
      return newConversations.has(`${contextType}-${contextId}`)
    }
  }
}
