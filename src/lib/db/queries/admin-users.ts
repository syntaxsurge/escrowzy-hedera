import { SQL, and, asc, desc, ilike, or, sql, eq } from 'drizzle-orm'

import type { UserWithPlan } from '@/types/database'

import { db } from '../drizzle'
import { users } from '../schema'
import { type TableRequest, type TableResponse } from './table-queries'

export type { UserWithPlan }

export async function getUsersWithPagination(
  request: TableRequest
): Promise<TableResponse<UserWithPlan>> {
  const { pagination, sorting, globalFilter, columnFilters } = request
  const { pageIndex, pageSize } = pagination

  const conditions: SQL[] = []

  if (globalFilter) {
    conditions.push(
      or(
        ilike(users.name, `%${globalFilter}%`),
        ilike(users.email, `%${globalFilter}%`)
      )!
    )
  }

  if (columnFilters) {
    columnFilters.forEach((filter: any) => {
      if (filter.id === 'role' && filter.value) {
        conditions.push(eq(users.role, String(filter.value)))
      }
    })
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const orderByClause: SQL[] = []
  if (sorting.length > 0) {
    sorting.forEach((sort: any) => {
      if (sort.id === 'email') {
        orderByClause.push(sort.desc ? desc(users.email) : asc(users.email))
      } else if (sort.id === 'name') {
        orderByClause.push(sort.desc ? desc(users.name) : asc(users.name))
      } else if (sort.id === 'role') {
        orderByClause.push(sort.desc ? desc(users.role) : asc(users.role))
      } else if (sort.id === 'createdAt') {
        orderByClause.push(
          sort.desc ? desc(users.createdAt) : asc(users.createdAt)
        )
      } else if (sort.id === 'updatedAt') {
        orderByClause.push(
          sort.desc ? desc(users.updatedAt) : asc(users.updatedAt)
        )
      }
    })
  } else {
    orderByClause.push(desc(users.createdAt))
  }

  const baseQuery = db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      walletAddress: users.walletAddress,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      planId: sql<string | null>`(
        SELECT t.plan_id 
        FROM teams t
        INNER JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = users.id AND tm.role = 'owner'
        ORDER BY t.created_at DESC
        LIMIT 1
      )`,
      personalPlanId: sql<string | null>`(
        SELECT us.plan_id
        FROM user_subscriptions us
        WHERE us.user_id = users.id AND us.is_active = true
        ORDER BY us.created_at DESC
        LIMIT 1
      )`
    })
    .from(users)

  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause)
      .then(res => res[0]?.count || 0),
    baseQuery
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(pageIndex * pageSize)
  ])

  const totalCount = Number(countResult)
  const pageCount = Math.ceil(totalCount / pageSize)

  return {
    data: data as UserWithPlan[],
    pageCount,
    totalCount
  }
}
