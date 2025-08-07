'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

import {
  pusherSystemEvents,
  pusherChannels,
  pusherEvents
} from '@/config/api-endpoints'
import { MessageWithSender } from '@/lib/actions/chat'
import { pusherClient } from '@/lib/pusher'

interface UseChatProps {
  contextType: 'team' | 'direct' | 'trade'
  contextId: string
  initialMessages: MessageWithSender[]
}

export function useChat({
  contextType,
  contextId,
  initialMessages
}: UseChatProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>(initialMessages)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<number, NodeJS.Timeout>>(
    new Map()
  )
  const channelRef = useRef<any>(null)
  const messageHandlersRef = useRef<{
    onNewMessage?: (message: MessageWithSender) => void
    onMessageUpdate?: (message: MessageWithSender) => void
    onMessageDelete?: (messageId: number) => void
    onTypingStart?: (userId: number) => void
    onTypingStop?: (userId: number) => void
  }>({})

  useEffect(() => {
    if (!pusherClient) {
      setIsConnected(false)
      return
    }

    const channelName = pusherChannels.chat(contextType, contextId)

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

    channel.bind(pusherEvents.chat.messageNew, (message: MessageWithSender) => {
      if (messageHandlersRef.current.onNewMessage) {
        messageHandlersRef.current.onNewMessage(message)
      } else {
        setMessages(prev => {
          const exists = prev.some(m => m.id === message.id)
          if (exists) return prev
          return [...prev, message]
        })
      }
    })

    channel.bind(
      pusherEvents.chat.messageEdited,
      (message: MessageWithSender) => {
        if (messageHandlersRef.current.onMessageUpdate) {
          messageHandlersRef.current.onMessageUpdate(message)
        } else {
          setMessages(prev =>
            prev.map(m => (m.id === message.id ? message : m))
          )
        }
      }
    )

    channel.bind(
      pusherEvents.chat.messageDeleted,
      ({ messageId }: { messageId: number }) => {
        if (messageHandlersRef.current.onMessageDelete) {
          messageHandlersRef.current.onMessageDelete(messageId)
        } else {
          setMessages(prev =>
            prev.map(m =>
              m.id === messageId ? { ...m, deletedAt: new Date() } : m
            )
          )
        }
      }
    )

    // Typing indicators
    channel.bind('typing-start', ({ userId }: { userId: number }) => {
      if (messageHandlersRef.current.onTypingStart) {
        messageHandlersRef.current.onTypingStart(userId)
      } else {
        setTypingUsers(prev => {
          const newMap = new Map(prev)
          // Clear existing timeout if any
          const existingTimeout = newMap.get(userId)
          if (existingTimeout) {
            clearTimeout(existingTimeout)
          }
          // Set new timeout to auto-remove after 5 seconds
          const timeout = setTimeout(() => {
            setTypingUsers(p => {
              const m = new Map(p)
              m.delete(userId)
              return m
            })
          }, 5000)
          newMap.set(userId, timeout)
          return newMap
        })
      }
    })

    channel.bind('typing-stop', ({ userId }: { userId: number }) => {
      if (messageHandlersRef.current.onTypingStop) {
        messageHandlersRef.current.onTypingStop(userId)
      } else {
        setTypingUsers(prev => {
          const newMap = new Map(prev)
          const timeout = newMap.get(userId)
          if (timeout) {
            clearTimeout(timeout)
          }
          newMap.delete(userId)
          return newMap
        })
      }
    })

    return () => {
      if (pusherClient && channel) {
        channel.unbind_all()
        pusherClient.unsubscribe(channelName)
      }
      channelRef.current = null
      // Clean up typing timeouts
      typingUsers.forEach(timeout => clearTimeout(timeout))
    }
  }, [contextType, contextId, typingUsers])

  const addOptimisticMessage = useCallback(
    (
      tempId: string,
      content: string,
      senderId: number,
      sender: MessageWithSender['sender']
    ) => {
      const optimisticMessage: MessageWithSender = {
        id: -Math.random(),
        contextType,
        contextId,
        senderId,
        content,
        messageType: 'text',
        metadata: { tempId },
        createdAt: new Date(),
        editedAt: null,
        deletedAt: null,
        sender
      }

      setMessages(prev => [...prev, optimisticMessage])
      return optimisticMessage
    },
    [contextType, contextId]
  )

  const removeOptimisticMessage = useCallback((tempId: string) => {
    setMessages(prev =>
      prev.filter(
        m =>
          !(
            m.metadata &&
            typeof m.metadata === 'object' &&
            'tempId' in m.metadata &&
            m.metadata.tempId === tempId
          )
      )
    )
  }, [])

  const updateMessage = useCallback(
    (messageId: number, updates: Partial<MessageWithSender>) => {
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, ...updates } : m))
      )
    },
    []
  )

  const handleNewMessage = useCallback(
    (handler: (message: MessageWithSender) => void) => {
      messageHandlersRef.current.onNewMessage = handler
    },
    []
  )

  const handleMessageUpdate = useCallback(
    (handler: (message: MessageWithSender) => void) => {
      messageHandlersRef.current.onMessageUpdate = handler
    },
    []
  )

  const handleMessageDelete = useCallback(
    (handler: (messageId: number) => void) => {
      messageHandlersRef.current.onMessageDelete = handler
    },
    []
  )

  const handleTypingStart = useCallback((handler: (userId: number) => void) => {
    messageHandlersRef.current.onTypingStart = handler
  }, [])

  const handleTypingStop = useCallback((handler: (userId: number) => void) => {
    messageHandlersRef.current.onTypingStop = handler
  }, [])

  const sendTypingIndicator = useCallback(
    (isTyping: boolean, userId: number) => {
      if (!pusherClient || !channelRef.current) return

      const eventName = isTyping ? 'client-typing-start' : 'client-typing-stop'

      // Send typing event to other users (client events in Pusher)
      channelRef.current.trigger(eventName, { userId })
    },
    [contextType, contextId]
  )

  return {
    messages,
    isConnected,
    typingUsers: Array.from(typingUsers.keys()),
    addOptimisticMessage,
    removeOptimisticMessage,
    updateMessage,
    setMessages,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete,
    handleTypingStart,
    handleTypingStop,
    sendTypingIndicator
  }
}
