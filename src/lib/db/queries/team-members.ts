import { eq, inArray, and } from 'drizzle-orm'

import { createActivityLog } from '@/lib/db/queries/activity-logs'
import { type TableRequest, type TableResponse } from '@/lib/table/table'
import type { TeamMemberWithUser } from '@/types/database'

import { db } from '../drizzle'
import { teamMembers, users } from '../schema'
import {
  createDateRangeFilter,
  createEnumFilter,
  executeTableQuery
} from './table-queries'

export async function getTeamMembers(
  request: TableRequest,
  teamId: number
): Promise<TableResponse<TeamMemberWithUser>> {
  const searchColumns: string[] = []

  const filterHandlers = {
    role: createEnumFilter(teamMembers.role, ['owner', 'member']),
    joinedAt: createDateRangeFilter(teamMembers.joinedAt)
  }

  const baseConditions = [eq(teamMembers.teamId, teamId)]

  const { data, pageCount, totalCount } = await executeTableQuery({
    table: teamMembers,
    request,
    searchColumns,
    filterHandlers,
    baseConditions
  })

  const userIds = data.map((member: any) => member.userId).filter(Boolean)

  const usersData =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            walletAddress: users.walletAddress
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : []

  const usersMap = new Map(usersData.map(user => [user.id, user]))

  const enrichedData: TeamMemberWithUser[] = data.map((member: any) => ({
    ...member,
    user: usersMap.get(member.userId) || {
      id: member.userId,
      name: null,
      email: null,
      walletAddress: null
    }
  }))

  return {
    data: enrichedData,
    pageCount,
    totalCount
  }
}

export async function removeTeamMember(
  memberId: number,
  teamId: number,
  removedByUserId: number
) {
  // First, get the member details for activity logging
  const member = await db
    .select({
      userId: teamMembers.userId,
      role: teamMembers.role
    })
    .from(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, teamId)))
    .limit(1)

  if (!member[0]) {
    throw new Error('Team member not found')
  }

  // Prevent removing the last owner
  if (member[0].role === 'owner') {
    const ownerCount = await db
      .select({ count: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, 'owner')))

    if (ownerCount.length === 1) {
      throw new Error('Cannot remove the last owner')
    }
  }

  // Remove the team member
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, teamId)))

  // Log the activity
  await createActivityLog({
    userId: removedByUserId,
    action: 'team_member_removed',
    teamId,
    ipAddress: null
  })

  return true
}
