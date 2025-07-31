import { eq, desc, and, or, sql } from 'drizzle-orm'

import { appRoutes } from '@/config/app-routes'
import { apiResponses, withErrorHandler } from '@/lib/api/server-utils'
import { requireAuth } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import {
  teamInvitations,
  activityLogs,
  teams,
  users,
  ActivityType
} from '@/lib/db/schema'
import { transformActivityToNotification } from '@/lib/utils/notification'
import {
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications
} from '@/services/notification'

interface NotificationResponse {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  notificationType?: string
}

export const GET = withErrorHandler(async (request: Request) => {
  const { user, error } = await requireAuth()
  if (error) return error

  const userId = user.id
  const url = new URL(request.url)
  const includeRead = url.searchParams.get('includeRead') === 'true'
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)

  // Get user's email from database
  const userRecord = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const userEmail = userRecord[0]?.email || ''

  // Get pending team invitations for the user
  const invitations = await db
    .select()
    .from(teamInvitations)
    .innerJoin(teams, eq(teamInvitations.teamId, teams.id))
    .where(
      and(
        eq(teamInvitations.email, userEmail),
        eq(teamInvitations.status, 'pending')
      )
    )
    .orderBy(desc(teamInvitations.createdAt))
    .limit(5)

  // Get recent activity logs (notifications) for the user
  const conditions = [eq(activityLogs.userId, userId)]

  // Filter for actual notifications (has title or notificationType)
  const notificationFilter = or(
    sql`${activityLogs.title} IS NOT NULL`,
    sql`${activityLogs.notificationType} IS NOT NULL`
  )
  if (notificationFilter) {
    conditions.push(notificationFilter)
  }

  // Optionally filter unread only
  if (!includeRead) {
    conditions.push(eq(activityLogs.read, false))
  }

  const activities = await db
    .select()
    .from(activityLogs)
    .leftJoin(teams, eq(activityLogs.teamId, teams.id))
    .where(and(...conditions))
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit)

  // Transform invitations to notifications
  const invitationNotifications: NotificationResponse[] = invitations.map(
    ({ team_invitations, teams }) => ({
      id: `invitation-${team_invitations.id}`,
      title: 'Team Invitation',
      message: `You have been invited to join "${teams.name}"`,
      timestamp: team_invitations.createdAt,
      read: false,
      actionUrl: appRoutes.dashboard.invitations,
      notificationType: ActivityType.TEAM_INVITATION
    })
  )

  // Transform activities to notifications
  const activityNotifications: NotificationResponse[] = activities
    .map(({ activity_logs, teams }) => {
      const teamName = teams?.name
      const notification = transformActivityToNotification(
        activity_logs,
        teamName
      )

      return {
        id: `activity-${activity_logs.id}`,
        title: notification.title,
        message: notification.message,
        timestamp: activity_logs.timestamp,
        read: activity_logs.read,
        actionUrl: notification.actionUrl,
        notificationType: notification.notificationType
      }
    })
    .filter(Boolean) as NotificationResponse[]

  // Combine and sort all notifications
  const allNotifications = [
    ...invitationNotifications,
    ...activityNotifications
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  // Get unread count
  const unreadCount =
    (await getUnreadNotificationCount(userId)) + invitations.length

  return apiResponses.success({
    notifications: allNotifications,
    unreadCount
  })
})

// Mark notification as read
export const PATCH = withErrorHandler(async (request: Request) => {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await request.json()
  const { notificationId, markAllRead } = body

  if (markAllRead) {
    await markAllNotificationsAsRead(user.id)
    return apiResponses.success({ message: 'All notifications marked as read' })
  }

  if (!notificationId) {
    return apiResponses.badRequest('Notification ID is required')
  }

  // Handle invitation notifications
  if (notificationId.startsWith('invitation-')) {
    // Invitations are marked as read by accepting/rejecting them
    return apiResponses.success({
      message: 'Invitation notification acknowledged'
    })
  }

  // Handle activity log notifications
  if (notificationId.startsWith('activity-')) {
    const activityId = parseInt(notificationId.replace('activity-', ''), 10)
    await markNotificationAsRead(activityId, user.id)
    return apiResponses.success({ message: 'Notification marked as read' })
  }

  return apiResponses.badRequest('Invalid notification ID format')
})

// Clear all notifications
export const DELETE = withErrorHandler(async () => {
  const { user, error } = await requireAuth()
  if (error) return error

  await clearAllNotifications(user.id)
  return apiResponses.success({ message: 'All notifications cleared' })
})
