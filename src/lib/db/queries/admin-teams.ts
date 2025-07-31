import { SQL, and, asc, desc, ilike, sql, eq } from 'drizzle-orm'

import type { TeamWithOwnerDetails } from '@/types/database'

import { db } from '../drizzle'
import { teams } from '../schema'
import { type TableRequest, type TableResponse } from './table-queries'

export type TeamWithOwner = TeamWithOwnerDetails

export async function getTeamsWithPagination(
  request: TableRequest
): Promise<TableResponse<TeamWithOwner>> {
  const { pagination, sorting, globalFilter, columnFilters } = request
  const { pageIndex, pageSize } = pagination

  const conditions: SQL[] = []

  if (globalFilter) {
    conditions.push(ilike(teams.name, `%${globalFilter}%`))
  }

  if (columnFilters) {
    columnFilters.forEach((filter: any) => {
      if (filter.id === 'planId' && filter.value) {
        conditions.push(eq(teams.planId, String(filter.value)))
      }
    })
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const orderByClause: SQL[] = []
  if (sorting.length > 0) {
    sorting.forEach((sort: any) => {
      if (sort.id === 'name') {
        orderByClause.push(sort.desc ? desc(teams.name) : asc(teams.name))
      } else if (sort.id === 'planId') {
        orderByClause.push(sort.desc ? desc(teams.planId) : asc(teams.planId))
      } else if (sort.id === 'memberCount') {
        orderByClause.push(
          sort.desc
            ? sql`(SELECT COUNT(*)::int FROM team_members tm WHERE tm.team_id = teams.id) DESC`
            : sql`(SELECT COUNT(*)::int FROM team_members tm WHERE tm.team_id = teams.id) ASC`
        )
      } else if (sort.id === 'ownerEmail') {
        orderByClause.push(
          sort.desc
            ? sql`(SELECT u.email FROM users u INNER JOIN team_members tm ON u.id = tm.user_id WHERE tm.team_id = teams.id AND tm.role = 'owner' LIMIT 1) DESC`
            : sql`(SELECT u.email FROM users u INNER JOIN team_members tm ON u.id = tm.user_id WHERE tm.team_id = teams.id AND tm.role = 'owner' LIMIT 1) ASC`
        )
      } else if (sort.id === 'createdAt') {
        orderByClause.push(
          sort.desc ? desc(teams.createdAt) : asc(teams.createdAt)
        )
      } else if (sort.id === 'updatedAt') {
        orderByClause.push(
          sort.desc ? desc(teams.updatedAt) : asc(teams.updatedAt)
        )
      }
    })
  } else {
    orderByClause.push(desc(teams.createdAt))
  }

  const baseQuery = db
    .select({
      id: teams.id,
      name: teams.name,
      planId: teams.planId,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      memberCount: sql<number>`(
        SELECT COUNT(*)::int 
        FROM team_members tm
        WHERE tm.team_id = teams.id
      )`,
      ownerEmail: sql<string | null>`(
        SELECT u.email 
        FROM users u
        INNER JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = teams.id AND tm.role = 'owner'
        LIMIT 1
      )`,
      ownerName: sql<string | null>`(
        SELECT u.name 
        FROM users u
        INNER JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = teams.id AND tm.role = 'owner'
        LIMIT 1
      )`,
      ownerWallet: sql<string | null>`(
        SELECT u.wallet_address 
        FROM users u
        INNER JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = teams.id AND tm.role = 'owner'
        LIMIT 1
      )`
    })
    .from(teams)

  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(teams)
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
    data: data as TeamWithOwner[],
    pageCount,
    totalCount
  }
}
