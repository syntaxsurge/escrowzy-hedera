'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

import { pusherChannels, pusherEvents } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { useToast } from '@/hooks/use-toast'
import { MessageWithSender } from '@/lib/actions/chat'
import { pusherClient } from '@/lib/pusher'
import {
  createMessageNotification,
  shouldNotifyUser
} from '@/lib/utils/notification'

interface UseMessageNotificationsProps {
  userId: number
  enabled?: boolean
}

export function useMessageNotifications({
  userId,
  enabled = true
}: UseMessageNotificationsProps) {
  const { toast } = useToast()
  const [permission, setPermission] =
    useState<NotificationPermission>('default')
  const [isWindowFocused, setIsWindowFocused] = useState(true)
  const activeChatsRef = useRef<Set<string>>(new Set())

  // Request notification permission
  useEffect(() => {
    if (
      !enabled ||
      typeof window === 'undefined' ||
      !('Notification' in window)
    ) {
      return
    }

    // Check current permission
    setPermission(Notification.permission)

    // Request permission if not granted or denied
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        setPermission(perm)

        // Show toast notification based on permission result
        if (perm === 'granted') {
          toast({
            title: 'Notifications Enabled',
            description: 'You will now receive real-time notifications'
          })
        } else if (perm === 'denied') {
          toast({
            title: 'Notifications Blocked',
            description: 'You can enable notifications in your browser settings'
          })
        }
      })
    }
  }, [enabled, toast])

  // Track window focus
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleFocus = () => setIsWindowFocused(true)
    const handleBlur = () => setIsWindowFocused(false)

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    // Set initial state
    setIsWindowFocused(document.hasFocus())

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // Mark chat as active/inactive
  const markChatActive = useCallback(
    (contextType: string, contextId: string) => {
      const chatKey = `${contextType}-${contextId}`
      activeChatsRef.current.add(chatKey)
    },
    []
  )

  const markChatInactive = useCallback(
    (contextType: string, contextId: string) => {
      const chatKey = `${contextType}-${contextId}`
      activeChatsRef.current.delete(chatKey)
    },
    []
  )

  // Show notification
  const showNotification = useCallback(
    (message: MessageWithSender, contextType: 'trade' | 'team' | 'direct') => {
      if (!enabled) return

      const chatKey = `${contextType}-${message.contextId}`
      const isChatOpen = activeChatsRef.current.has(chatKey)

      // Check if we should notify
      if (
        !shouldNotifyUser(userId, message.senderId, isWindowFocused, isChatOpen)
      ) {
        return
      }

      // Extract trade ID if it's a trade message
      let tradeId: number | undefined
      if (contextType === 'trade') {
        tradeId = parseInt(message.contextId.replace('trade_', ''), 10)
      }

      // Create notification content
      const notificationContent = createMessageNotification({
        type: contextType,
        contextId: message.contextId,
        senderId: message.senderId,
        senderName: message.sender.name || 'User',
        message: message.content || 'Sent a message',
        tradeId
      })

      // Show browser notification if permitted and window not focused
      if (permission === 'granted' && !isWindowFocused) {
        try {
          const notification = new Notification(notificationContent.title, {
            body: notificationContent.message,
            icon: appRoutes.assets.notificationIcon,
            tag: `msg-${message.id}`, // Prevent duplicate notifications
            requireInteraction: false
          })

          // Handle notification click
          notification.onclick = () => {
            window.focus()
            // Navigate to the chat
            if (contextType === 'trade' && tradeId) {
              window.location.href = appRoutes.withParams.chatTab(
                appRoutes.trades.history.detail(tradeId.toString())
              )
            } else if (contextType === 'team') {
              window.location.href = appRoutes.chat.team(message.contextId)
            } else {
              window.location.href = appRoutes.chat.direct(message.contextId)
            }
            notification.close()
          }

          // Auto-close after 5 seconds
          setTimeout(() => notification.close(), 5000)
        } catch (error) {
          console.error('Failed to show notification:', error)
        }
      }

      // Always show in-app toast notification if chat is not open
      if (!isChatOpen) {
        const toastOptions: any = {
          title: notificationContent.title,
          description: notificationContent.message
        }

        // Add action for trade messages
        if (contextType === 'trade' && tradeId) {
          toastOptions.onClick = () => {
            window.location.href = `${appRoutes.trades.history.detail(tradeId.toString())}?tab=chat`
          }
        }

        toast(toastOptions)
      }
    },
    [enabled, userId, isWindowFocused, permission, toast]
  )

  // Subscribe to message events
  useEffect(() => {
    if (!enabled || !pusherClient) return

    // Subscribe to user's private channel for all messages
    const userChannel = pusherClient!.subscribe(pusherChannels.user(userId))

    // Handle new message notifications
    userChannel.bind(
      pusherEvents.chat.messageNew,
      (data: {
        message: MessageWithSender
        contextType: 'trade' | 'team' | 'direct'
      }) => {
        showNotification(data.message, data.contextType)
      }
    )

    return () => {
      userChannel.unbind_all()
      pusherClient!.unsubscribe(pusherChannels.user(userId))
    }
  }, [enabled, userId, showNotification])

  return {
    permission,
    markChatActive,
    markChatInactive,
    isWindowFocused
  }
}
