import { NextRequest } from 'next/server'

import { eq, and } from 'drizzle-orm'

import { appRoutes } from '@/config/app-routes'
import { apiResponses } from '@/lib/api/server-utils'
import { requireAuth } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import { teamInvitations, activityLogs, teams, users } from '@/lib/db/schema'
import { parseTableQueryParams } from '@/lib/table/table'
import { transformActivityToNotification } from '@/lib/utils/notification'

interface NotificationRecord {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl: string | null
  teamName: string | null
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const userId = user.id
    const searchParams = request.nextUrl.searchParams
    const tableRequest = parseTableQueryParams(
      Object.fromEntries(searchParams.entries())
    )

    // Get user's email
    const userRecord = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!userRecord[0]) {
      return apiResponses.error('User not found', 404)
    }

    const userEmail = userRecord[0]?.email || ''

    const { pagination, sorting, globalFilter } = tableRequest
    const { pageIndex, pageSize } = pagination

    // Get pending team invitations
    const invitations = await db
      .select({
        teamInvitations,
        teams
      })
      .from(teamInvitations)
      .innerJoin(teams, eq(teamInvitations.teamId, teams.id))
      .where(
        and(
          eq(teamInvitations.email, userEmail),
          eq(teamInvitations.status, 'pending')
        )
      )

    // Get activity logs
    const activities = await db
      .select({
        activityLogs,
        teams
      })
      .from(activityLogs)
      .leftJoin(teams, eq(activityLogs.teamId, teams.id))
      .where(eq(activityLogs.userId, userId))

    // Transform to notification records
    const allNotifications: NotificationRecord[] = []

    // Add invitation notifications
    invitations.forEach(({ teamInvitations: inv, teams: team }) => {
      allNotifications.push({
        id: `invitation-${inv.id}`,
        title: 'Team Invitation',
        message: `You have been invited to join "${team.name}"`,
        timestamp: inv.createdAt,
        read: false,
        actionUrl: appRoutes.dashboard.invitations,
        teamName: team.name
      })
    })

    // Add activity notifications
    activities.forEach(({ activityLogs: log, teams: team }) => {
      const teamName = team?.name
      const notification = transformActivityToNotification(log, teamName)

      allNotifications.push({
        id: `activity-${log.id}`,
        title: notification.title,
        message: notification.message,
        timestamp: log.timestamp,
        read: true,
        actionUrl: null,
        teamName: team?.name || null
      })
    })

    // Apply search filter
    let filteredNotifications = allNotifications
    if (globalFilter) {
      const search = globalFilter.toLowerCase()
      filteredNotifications = allNotifications.filter(
        n =>
          n.title.toLowerCase().includes(search) ||
          n.message.toLowerCase().includes(search) ||
          (n.teamName && n.teamName.toLowerCase().includes(search))
      )
    }

    // Apply sorting
    filteredNotifications.sort((a, b) => {
      if (sorting.length > 0) {
        const sort = sorting[0]
        switch (sort.id) {
          case 'title':
            return sort.desc
              ? b.title.localeCompare(a.title)
              : a.title.localeCompare(b.title)
          case 'timestamp':
            return sort.desc
              ? b.timestamp.getTime() - a.timestamp.getTime()
              : a.timestamp.getTime() - b.timestamp.getTime()
          case 'read':
            return sort.desc
              ? (b.read ? 1 : 0) - (a.read ? 1 : 0)
              : (a.read ? 1 : 0) - (b.read ? 1 : 0)
        }
      }
      // Default sort by timestamp desc
      return b.timestamp.getTime() - a.timestamp.getTime()
    })

    // Apply pagination
    const totalCount = filteredNotifications.length
    const pageCount = Math.ceil(totalCount / pageSize)
    const paginatedData = filteredNotifications.slice(
      pageIndex * pageSize,
      (pageIndex + 1) * pageSize
    )

    return apiResponses.success({
      data: paginatedData,
      pageCount,
      totalCount
    })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to fetch notifications')
  }
}
