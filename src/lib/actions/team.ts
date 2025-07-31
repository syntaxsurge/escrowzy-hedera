'use server'

import { eq, sql, and } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { teamMembers, teams, users } from '@/lib/db/schema'

import { getCurrentUserAction } from './user'

export async function getTeamAction() {
  const user = await getCurrentUserAction()
  if (!user) {
    return { teams: [] }
  }

  try {
    // Get all teams the user is a member of with member count
    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        planId: teams.planId,
        isTeamPlan: teams.isTeamPlan,
        teamOwnerId: teams.teamOwnerId,
        subscriptionExpiresAt: teams.subscriptionExpiresAt,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${teamMembers} 
          WHERE ${teamMembers.teamId} = ${teams.id}
        )`
      })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, user.id))

    // Prioritize collaborative teams (teams with more than 1 member) over intrinsic teams
    const collaborativeTeam = userTeams.find(team => team.memberCount > 1)

    // If user is part of a collaborative team, show only that team
    if (collaborativeTeam) {
      return { teams: [collaborativeTeam] }
    }

    // Otherwise show the intrinsic team (single member team)
    const intrinsicTeam = userTeams.find(team => team.memberCount === 1)
    return {
      teams: intrinsicTeam ? [intrinsicTeam] : []
    }
  } catch (error) {
    console.error('Error in getTeamAction:', error)
    return { teams: [] }
  }
}

export async function getTeamMembersAction(
  teamId: number,
  page: number = 1,
  limit: number = 10
) {
  const user = await getCurrentUserAction()
  if (!user) {
    return { members: [], hasMore: false, total: 0 }
  }

  try {
    // Check if user is a member of the team
    const membership = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, teamId))
      )
      .limit(1)

    if (membership.length === 0) {
      return { members: [], hasMore: false, total: 0 }
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId))

    const total = countResult?.count || 0
    const offset = (page - 1) * limit

    // Get team members with user details
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        walletAddress: users.walletAddress,
        avatarPath: users.avatarPath,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId))
      .limit(limit)
      .offset(offset)
      .orderBy(teamMembers.joinedAt)

    return {
      members,
      hasMore: offset + members.length < total,
      total
    }
  } catch (error) {
    console.error('Error in getTeamMembersAction:', error)
    return { members: [], hasMore: false, total: 0 }
  }
}
