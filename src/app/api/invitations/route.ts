import { NextRequest } from 'next/server'

import { eq } from 'drizzle-orm'

import { apiResponses } from '@/lib/api/server-utils'
import { db } from '@/lib/db/drizzle'
import { teamInvitations, teams, users } from '@/lib/db/schema'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get('email')

  if (!email) {
    return apiResponses.validationError(['email'])
  }

  try {
    const invitations = await db
      .select({
        id: teamInvitations.id,
        teamId: teamInvitations.teamId,
        email: teamInvitations.email,
        role: teamInvitations.role,
        status: teamInvitations.status,
        createdAt: teamInvitations.createdAt,
        updatedAt: teamInvitations.updatedAt,
        acceptedAt: teamInvitations.acceptedAt,
        team: {
          id: teams.id,
          name: teams.name
        },
        invitedBy: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(teamInvitations)
      .innerJoin(teams, eq(teamInvitations.teamId, teams.id))
      .innerJoin(users, eq(teamInvitations.invitedByUserId, users.id))
      .where(eq(teamInvitations.email, email))
      .orderBy(teamInvitations.createdAt)

    return apiResponses.success(invitations)
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to fetch invitations')
  }
}
