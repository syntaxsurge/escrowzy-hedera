import { SQL, and, asc, desc, sql, eq, gte, lte, inArray } from 'drizzle-orm'

import { type TableRequest, type TableResponse } from '@/lib/table/table'
import { getActivityFilterConditions } from '@/types/activity-log'

import { db } from '../drizzle'
import { activityLogs, users, teams } from '../schema'

export interface AdminActivityLogWithUser {
  id: number
  userId: number | null
  teamId: number | null
  action: string
  timestamp: Date
  ipAddress: string | null
  userEmail: string | null
  userName: string | null
  userAddress: string | null
  teamName: string | null
}

export async function getActivityLogsWithPagination(
  request: TableRequest
): Promise<TableResponse<AdminActivityLogWithUser>> {
  const { pagination, sorting, globalFilter, columnFilters } = request
  const { pageIndex, pageSize } = pagination

  const conditions: SQL[] = []

  if (globalFilter) {
    conditions.push(
      sql`${users.email} ILIKE ${`%${globalFilter}%`} OR ${users.name} ILIKE ${`%${globalFilter}%`}`
    )
  }

  if (columnFilters) {
    columnFilters.forEach(filter => {
      if (filter.id === 'userId' && filter.value) {
        conditions.push(eq(activityLogs.userId, Number(filter.value)))
      } else if (filter.id === 'action' && filter.value) {
        conditions.push(eq(activityLogs.action, String(filter.value)))
      } else if (filter.id === 'filter' && filter.value) {
        // Handle activity type filter
        const filterValue = String(filter.value)
        const filterConditions = getActivityFilterConditions(filterValue)
        if (filterConditions.length > 0) {
          conditions.push(inArray(activityLogs.action, filterConditions))
        }
      } else if (filter.id === 'startDate' && filter.value) {
        conditions.push(
          gte(activityLogs.timestamp, new Date(String(filter.value)))
        )
      } else if (filter.id === 'endDate' && filter.value) {
        const endDate = new Date(String(filter.value))
        endDate.setHours(23, 59, 59, 999)
        conditions.push(lte(activityLogs.timestamp, endDate))
      }
    })
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const orderByClause: SQL[] = []
  if (sorting.length > 0) {
    sorting.forEach(sort => {
      if (sort.id === 'timestamp') {
        orderByClause.push(
          sort.desc ? desc(activityLogs.timestamp) : asc(activityLogs.timestamp)
        )
      } else if (sort.id === 'action') {
        orderByClause.push(
          sort.desc ? desc(activityLogs.action) : asc(activityLogs.action)
        )
      } else if (sort.id === 'userName') {
        orderByClause.push(sort.desc ? desc(users.name) : asc(users.name))
      }
    })
  } else {
    orderByClause.push(desc(activityLogs.timestamp))
  }

  const baseQuery = db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      teamId: activityLogs.teamId,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userEmail: users.email,
      userName: users.name,
      userAddress: users.walletAddress,
      teamName: teams.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .leftJoin(teams, eq(activityLogs.teamId, teams.id))

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .leftJoin(teams, eq(activityLogs.teamId, teams.id))

  const [countResult, data] = await Promise.all([
    countQuery.where(whereClause).then(res => res[0]?.count || 0),
    baseQuery
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(pageIndex * pageSize)
  ])

  const totalCount = Number(countResult)
  const pageCount = Math.ceil(totalCount / pageSize)

  return {
    data: data as AdminActivityLogWithUser[],
    pageCount,
    totalCount
  }
}
