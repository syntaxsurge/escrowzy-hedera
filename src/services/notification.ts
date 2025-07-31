import { eq, desc, and, or, sql } from 'drizzle-orm'

import { appRoutes } from '@/config/app-routes'
import { db } from '@/lib/db/drizzle'
import { activityLogs, teams, ActivityType } from '@/lib/db/schema'
import type { NewActivityLog } from '@/lib/db/schema'

interface CreateNotificationParams {
  userId: number
  teamId: number
  action: string
  title?: string
  message?: string
  actionUrl?: string
  notificationType?: string
  metadata?: Record<string, any>
  ipAddress?: string
}

export async function createNotification(params: CreateNotificationParams) {
  const notification: NewActivityLog = {
    userId: params.userId,
    teamId: params.teamId,
    action: params.action,
    title: params.title,
    message: params.message,
    actionUrl: params.actionUrl,
    notificationType: params.notificationType,
    metadata: params.metadata,
    ipAddress: params.ipAddress,
    read: false
  }

  const [created] = await db
    .insert(activityLogs)
    .values(notification)
    .returning()
  return created
}

export async function getUserNotifications(userId: number, limit = 20) {
  const notifications = await db
    .select({
      notification: activityLogs,
      team: teams
    })
    .from(activityLogs)
    .leftJoin(teams, eq(activityLogs.teamId, teams.id))
    .where(eq(activityLogs.userId, userId))
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit)

  return notifications
}

export async function getUnreadNotificationCount(userId: number) {
  const result = await db
    .select()
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        eq(activityLogs.read, false),
        // Only count notifications with a title (actual notifications)
        or(
          sql`${activityLogs.title} IS NOT NULL`,
          sql`${activityLogs.notificationType} IS NOT NULL`
        )
      )
    )

  return result.length
}

export async function markNotificationAsRead(
  notificationId: number,
  userId: number
) {
  const [updated] = await db
    .update(activityLogs)
    .set({ read: true })
    .where(
      and(eq(activityLogs.id, notificationId), eq(activityLogs.userId, userId))
    )
    .returning()

  return updated
}

export async function markAllNotificationsAsRead(userId: number) {
  await db
    .update(activityLogs)
    .set({ read: true })
    .where(and(eq(activityLogs.userId, userId), eq(activityLogs.read, false)))
}

export async function clearAllNotifications(userId: number) {
  // We don't actually delete activity logs, just mark them as read
  // This preserves audit trail while clearing the notification UI
  await markAllNotificationsAsRead(userId)
}

// Helper function to create trade notifications for both parties
export async function createTradeNotification(
  tradeId: number,
  buyerId: number,
  sellerId: number,
  teamId: number,
  action: string,
  buyerMessage: string,
  sellerMessage: string
) {
  // Create notification for buyer
  await createNotification({
    userId: buyerId,
    teamId,
    action,
    title: getTradeNotificationTitle(action, true),
    message: buyerMessage,
    actionUrl: appRoutes.trades.history.detail(tradeId.toString()),
    notificationType: action,
    metadata: { tradeId, role: 'buyer' }
  })

  // Create notification for seller
  await createNotification({
    userId: sellerId,
    teamId,
    action,
    title: getTradeNotificationTitle(action, false),
    message: sellerMessage,
    actionUrl: appRoutes.trades.history.detail(tradeId.toString()),
    notificationType: action,
    metadata: { tradeId, role: 'seller' }
  })
}

function getTradeNotificationTitle(action: string, isBuyer: boolean): string {
  switch (action) {
    case ActivityType.TRADE_CREATED:
      return 'New Trade Created'
    case ActivityType.TRADE_FUNDED:
      return 'Trade Funded'
    case ActivityType.TRADE_DELIVERED:
      return isBuyer
        ? 'Delivery Confirmation Required'
        : 'Trade Marked as Delivered'
    case ActivityType.TRADE_COMPLETED:
      return 'Trade Completed'
    case ActivityType.TRADE_DISPUTED:
      return 'Trade Disputed'
    case ActivityType.TRADE_REFUNDED:
      return 'Trade Refunded'
    default:
      return 'Trade Update'
  }
}
