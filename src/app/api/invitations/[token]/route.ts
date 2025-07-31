import { NextRequest } from 'next/server'

import { and, eq } from 'drizzle-orm'

import { apiResponses } from '@/lib/api/server-utils'
import { db } from '@/lib/db/drizzle'
import { teamInvitations, teams, users } from '@/lib/db/schema'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const invitation = await db
      .select({
        id: teamInvitations.id,
        email: teamInvitations.email,
        role: teamInvitations.role,
        status: teamInvitations.status,
        expiresAt: teamInvitations.expiresAt,
        teamName: teams.name,
        invitedBy: users.name
      })
      .from(teamInvitations)
      .innerJoin(teams, eq(teamInvitations.teamId, teams.id))
      .innerJoin(users, eq(teamInvitations.invitedByUserId, users.id))
      .where(
        and(
          eq(teamInvitations.token, token),
          eq(teamInvitations.status, 'pending')
        )
      )
      .limit(1)

    if (!invitation.length) {
      return apiResponses.notFound('Invitation')
    }

    const invite = invitation[0]

    // Check if invitation has expired
    if (new Date() > invite.expiresAt) {
      return apiResponses.error('Invitation has expired', 410)
    }

    return apiResponses.success({ invitation: invite })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to fetch invitation')
  }
}
