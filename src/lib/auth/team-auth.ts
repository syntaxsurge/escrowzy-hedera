import { and, eq } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { teams, teamMembers } from '@/lib/db/schema'
import type { TeamAccessResult } from '@/types/auth'

export interface TeamAuthResult extends TeamAccessResult {
  team: typeof teams.$inferSelect | null
  membership: typeof teamMembers.$inferSelect | null
}

/**
 * Check if a user has access to a team and return team data
 */
export async function checkTeamAccess(
  teamId: number,
  userId: number
): Promise<TeamAuthResult> {
  const [teamData, membershipData] = await Promise.all([
    db.select().from(teams).where(eq(teams.id, teamId)).limit(1),
    db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId))
      )
      .limit(1)
  ])

  const team = teamData[0] || null
  const membership = membershipData[0] || null

  return {
    team,
    membership,
    isOwner: membership?.role === 'owner',
    isMember: !!membership
  }
}

/**
 * Require user to be a member of the team
 */
export async function requireTeamMember(
  teamId: number,
  userId: number
): Promise<TeamAuthResult> {
  const result = await checkTeamAccess(teamId, userId)

  if (!result.team) {
    throw new Error('Team not found')
  }

  if (!result.isMember) {
    throw new Error('You do not have access to this team')
  }

  return result
}

/**
 * Require user to be the owner of the team
 */
export async function requireTeamOwner(
  teamId: number,
  userId: number
): Promise<TeamAuthResult> {
  const result = await checkTeamAccess(teamId, userId)

  if (!result.team) {
    throw new Error('Team not found')
  }

  if (!result.isOwner) {
    throw new Error('Only team owners can perform this action')
  }

  return result
}
