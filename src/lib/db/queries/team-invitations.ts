import { eq, inArray, sql, desc, asc } from 'drizzle-orm'

import { type TableRequest, type TableResponse } from '@/lib/table/table'
import { type TeamInvitationWithDetails } from '@/types/database'

import { db } from '../drizzle'
import { teamInvitations, teams, users } from '../schema'
import {
  createDateRangeFilter,
  createEnumFilter,
  executeTableQuery
} from './table-queries'

export async function getTeamInvitations(
  request: TableRequest,
  userEmail?: string | null
): Promise<TableResponse<TeamInvitationWithDetails>> {
  const searchColumns = ['email']

  const filterHandlers = {
    status: createEnumFilter(teamInvitations.status, [
      'pending',
      'accepted',
      'declined'
    ]),
    role: createEnumFilter(teamInvitations.role, ['owner', 'member']),
    createdAt: createDateRangeFilter(teamInvitations.createdAt)
  }

  const baseConditions = userEmail ? [eq(teamInvitations.email, userEmail)] : []

  // Create a custom sorting array that prioritizes pending status
  const orderByClause = []

  // Always sort by status first (pending comes before accepted/declined)
  orderByClause.push(
    sql`CASE WHEN ${teamInvitations.status} = 'pending' THEN 0 ELSE 1 END`
  )

  // Then apply any user-requested sorting
  if (request.sorting && request.sorting.length > 0) {
    request.sorting.forEach(sort => {
      const column = (teamInvitations as any)[sort.id]
      if (column) {
        orderByClause.push(sort.desc ? desc(column) : asc(column))
      }
    })
  } else {
    // Default secondary sort by createdAt desc if no sorting specified
    orderByClause.push(desc(teamInvitations.createdAt))
  }

  const { data, pageCount, totalCount } = await executeTableQuery({
    table: teamInvitations,
    request: {
      ...request,
      // Override sorting to ensure it's empty so executeTableQuery doesn't apply its own
      sorting: []
    },
    searchColumns,
    filterHandlers,
    baseConditions,
    customOrderBy: orderByClause
  })

  const _invitationIds = data.map((inv: any) => inv.id)
  const teamIds = data.map((inv: any) => inv.teamId).filter(Boolean)
  const userIds = data.map((inv: any) => inv.invitedByUserId).filter(Boolean)

  const [teamsData, usersData] = await Promise.all([
    teamIds.length > 0
      ? db
          .select({
            id: teams.id,
            name: teams.name
          })
          .from(teams)
          .where(inArray(teams.id, teamIds))
      : Promise.resolve([]),
    userIds.length > 0
      ? db
          .select({
            id: users.id,
            name: users.name,
            email: users.email
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : Promise.resolve([])
  ])

  const teamsMap = new Map(teamsData.map(team => [team.id, team]))
  const usersMap = new Map(usersData.map(user => [user.id, user]))

  const enrichedData: TeamInvitationWithDetails[] = data.map(
    (invitation: any) => ({
      ...invitation,
      team: teamsMap.get(invitation.teamId) || null,
      invitedBy: usersMap.get(invitation.invitedByUserId) || null
    })
  )

  return {
    data: enrichedData,
    pageCount,
    totalCount
  }
}

export async function getSentInvitations(
  request: TableRequest,
  teamId: number
): Promise<TableResponse<TeamInvitationWithDetails>> {
  const searchColumns = ['email']

  const filterHandlers = {
    status: createEnumFilter(teamInvitations.status, [
      'pending',
      'accepted',
      'declined'
    ]),
    role: createEnumFilter(teamInvitations.role, ['owner', 'member']),
    createdAt: createDateRangeFilter(teamInvitations.createdAt)
  }

  const baseConditions = [eq(teamInvitations.teamId, teamId)]

  // Create a custom sorting array that prioritizes pending status
  const orderByClause = []

  // Always sort by status first (pending comes before accepted/declined)
  orderByClause.push(
    sql`CASE WHEN ${teamInvitations.status} = 'pending' THEN 0 ELSE 1 END`
  )

  // Then apply any user-requested sorting
  if (request.sorting && request.sorting.length > 0) {
    request.sorting.forEach(sort => {
      const column = (teamInvitations as any)[sort.id]
      if (column) {
        orderByClause.push(sort.desc ? desc(column) : asc(column))
      }
    })
  } else {
    // Default secondary sort by createdAt desc if no sorting specified
    orderByClause.push(desc(teamInvitations.createdAt))
  }

  const { data, pageCount, totalCount } = await executeTableQuery({
    table: teamInvitations,
    request: {
      ...request,
      // Override sorting to ensure it's empty so executeTableQuery doesn't apply its own
      sorting: []
    },
    searchColumns,
    filterHandlers,
    baseConditions,
    customOrderBy: orderByClause
  })

  const _invitationIds = data.map((inv: any) => inv.id)
  const userIds = data.map((inv: any) => inv.invitedByUserId).filter(Boolean)

  const [teamData, usersData] = await Promise.all([
    db
      .select({
        id: teams.id,
        name: teams.name
      })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1),
    userIds.length > 0
      ? db
          .select({
            id: users.id,
            name: users.name,
            email: users.email
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : Promise.resolve([])
  ])

  const teamInfo = teamData[0] || null
  const usersMap = new Map(usersData.map(user => [user.id, user]))

  const enrichedData: TeamInvitationWithDetails[] = data.map(
    (invitation: any) => ({
      ...invitation,
      team: teamInfo,
      invitedBy: usersMap.get(invitation.invitedByUserId) || null
    })
  )

  return {
    data: enrichedData,
    pageCount,
    totalCount
  }
}
