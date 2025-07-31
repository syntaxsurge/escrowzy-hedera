import { desc, eq, and, gte, sql, inArray } from 'drizzle-orm'

import { type TableRequest, type TableResponse } from '@/lib/table/table'
import { ACTIVITY_CATEGORIES } from '@/types/activity-log'
import type { ActivityLogWithUser } from '@/types/database'

import { db } from '../drizzle'
import { activityLogs, users, ActivityType } from '../schema'
import {
  createDateRangeFilter,
  createEnumFilter,
  executeTableQuery
} from './table-queries'

export async function getActivityLogs(
  request: TableRequest,
  userId?: number
): Promise<TableResponse<ActivityLogWithUser>> {
  const searchColumns = ['action', 'ipAddress']

  const filterHandlers = {
    action: createEnumFilter(activityLogs.action, Object.values(ActivityType)),
    timestamp: createDateRangeFilter(activityLogs.timestamp)
  }

  const baseConditions = userId ? [eq(activityLogs.userId, userId)] : []

  // Handle category filter
  const filterParam = request.columnFilters?.find(f => f.id === 'filter')
  if (
    filterParam &&
    typeof filterParam.value === 'string' &&
    filterParam.value !== 'all'
  ) {
    const categoryActions =
      ACTIVITY_CATEGORIES[filterParam.value as keyof typeof ACTIVITY_CATEGORIES]
    if (categoryActions) {
      baseConditions.push(inArray(activityLogs.action, categoryActions))
    }
  }

  const { data, pageCount, totalCount } = await executeTableQuery({
    table: activityLogs,
    request,
    searchColumns,
    filterHandlers,
    baseConditions
  })

  const userIds = data
    .map((log: any) => log.userId)
    .filter((id): id is number => id !== null && id !== undefined)

  const usersData =
    userIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, userIds))
      : []

  const usersMap = new Map(usersData.map(user => [user.id, user]))

  const enrichedData: ActivityLogWithUser[] = data.map((log: any) => ({
    ...log,
    user: log.userId ? usersMap.get(log.userId) || null : null
  }))

  return {
    data: enrichedData,
    pageCount,
    totalCount
  }
}

export async function getRecentActivityDashboard(
  userId?: number,
  limit: number = 5
): Promise<ActivityLogWithUser[]> {
  const conditions = userId ? [eq(activityLogs.userId, userId)] : []

  const recentLogs = await db
    .select()
    .from(activityLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit)

  const userIds = recentLogs
    .map(log => log.userId)
    .filter((id): id is number => id !== null && id !== undefined)

  const usersData =
    userIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, userIds))
      : []

  const usersMap = new Map(usersData.map(user => [user.id, user]))

  return recentLogs.map(log => ({
    id: log.id,
    teamId: log.teamId,
    userId: log.userId,
    action: log.action,
    timestamp: log.timestamp,
    ipAddress: log.ipAddress,
    read: log.read,
    notificationType: log.notificationType,
    title: log.title,
    message: log.message,
    actionUrl: log.actionUrl,
    metadata: log.metadata,
    user: log.userId ? usersMap.get(log.userId) || null : null
  }))
}

export async function getActivityStats(userId?: number) {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const conditions = userId ? [eq(activityLogs.userId, userId)] : []

  const [totalCount, todayCount, weekCount] = await Promise.all([
    db
      .select({ count: count() })
      .from(activityLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .then(res => res[0]?.count || 0),
    db
      .select({ count: count() })
      .from(activityLogs)
      .where(and(...conditions, gte(activityLogs.timestamp, oneDayAgo)))
      .then(res => res[0]?.count || 0),
    db
      .select({ count: count() })
      .from(activityLogs)
      .where(and(...conditions, gte(activityLogs.timestamp, oneWeekAgo)))
      .then(res => res[0]?.count || 0)
  ])

  return {
    total: totalCount,
    today: todayCount,
    week: weekCount
  }
}

function count() {
  return sql<number>`count(*)`
}

export async function createActivityLog(data: {
  userId: number
  action: string
  teamId: number
  ipAddress?: string | null
}) {
  await db.insert(activityLogs).values({
    userId: data.userId,
    action: data.action,
    teamId: data.teamId,
    ipAddress: data.ipAddress || null,
    timestamp: new Date()
  })
}
