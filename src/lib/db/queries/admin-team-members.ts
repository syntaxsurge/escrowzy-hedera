import { and, eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { teamMembers, users } from '@/lib/db/schema'
import type { TableRequest, TableResponse } from '@/lib/table/table'

import { buildUserSearchCondition } from './users'

export type TeamMemberTableRow = {
  id: number
  teamId: number
  userId: number
  role: string
  joinedAt: Date
  email: string | null
  name: string | null
  walletAddress: string | null
}

export async function getTeamMembersWithPagination(
  teamId: string,
  request: TableRequest
): Promise<TableResponse<TeamMemberTableRow>> {
  const { pagination, sorting, globalFilter } = request
  const { pageIndex, pageSize } = pagination

  // Base query conditions
  const baseConditions = [eq(teamMembers.teamId, parseInt(teamId))]

  // Add search condition if provided
  if (globalFilter) {
    const searchCondition = buildUserSearchCondition(globalFilter)
    if (searchCondition) {
      baseConditions.push(searchCondition)
    }
  }

  // Build order by clause
  const orderByClause = []
  if (sorting.length > 0) {
    sorting.forEach(sort => {
      const column =
        sort.id === 'email'
          ? users.email
          : sort.id === 'name'
            ? users.name
            : sort.id === 'role'
              ? teamMembers.role
              : sort.id === 'joinedAt'
                ? teamMembers.joinedAt
                : null

      if (column) {
        orderByClause.push(sort.desc ? sql`${column} DESC` : sql`${column} ASC`)
      }
    })
  } else {
    orderByClause.push(sql`${teamMembers.joinedAt} DESC`)
  }

  // Execute queries
  const whereClause = and(...baseConditions)

  const [countResult, members] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(whereClause)
      .then(res => res[0]?.count || 0),
    db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        email: users.email,
        name: users.name,
        walletAddress: users.walletAddress
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(pageIndex * pageSize)
  ])

  const totalCount = Number(countResult)
  const pageCount = Math.ceil(totalCount / pageSize)

  return {
    data: members,
    pageCount,
    totalCount
  }
}

export async function getAvailableUsers(teamId: string, search?: string) {
  const teamMemberIds = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, parseInt(teamId)))

  const existingUserIds = teamMemberIds.map(m => m.userId)

  const baseQuery = db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      walletAddress: users.walletAddress
    })
    .from(users)

  const conditions = []

  if (existingUserIds.length > 0) {
    conditions.push(
      sql`${users.id} NOT IN (${sql.join(
        existingUserIds.map(id => sql`${id}`),
        sql`, `
      )})`
    )
  }

  if (search) {
    const searchCondition = buildUserSearchCondition(search)
    if (searchCondition) {
      conditions.push(searchCondition)
    }
  }

  const finalQuery =
    conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery

  return finalQuery.limit(20)
}
