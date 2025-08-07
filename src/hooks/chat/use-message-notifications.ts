'use client'

import { useState, useEffect, useCallback } from 'react'

export interface MessageNotification {
  id: string
  chatId: number
  message: string
  sender: string
  timestamp: Date
}

export function useMessageNotifications(userId?: number) {
  const [notifications, setNotifications] = useState<MessageNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  const addNotification = useCallback((notification: MessageNotification) => {
    setNotifications(prev => [...prev, notification])
    setUnreadCount(prev => prev + 1)
  }, [])

  useEffect(() => {
    // Notification listener will be implemented when needed
    // userId parameter is for future use when implementing real notifications
    if (userId) {
      // Subscribe to notifications for this user
    }

    return () => {
      // Cleanup
    }
  }, [userId])

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification
  }
}
