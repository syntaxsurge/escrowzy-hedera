import { eq } from 'drizzle-orm'

import { apiResponses } from '@/lib/api/server-utils'
import { withAuth } from '@/lib/auth/auth-utils'
import { requireTeamOwner } from '@/lib/auth/team-auth'
import { db } from '@/lib/db/drizzle'
import { removeTeamMember } from '@/lib/db/queries/team-members'
import { teamMembers } from '@/lib/db/schema'

export const DELETE = withAuth(
  async (
    { user, request: _request },
    context: { params: Promise<{ memberId: string }> }
  ) => {
    try {
      // User is already available from withAuth destructuring

      const { memberId: memberIdStr } = await context.params
      const memberId = parseInt(memberIdStr)
      if (isNaN(memberId)) {
        return apiResponses.error('Invalid member ID', 400)
      }

      // Get the current user's team membership
      const userMemberships = await db.query.teamMembers.findMany({
        where: eq(teamMembers.userId, user.id),
        with: {
          team: true
        }
      })

      if (!userMemberships.length) {
        return apiResponses.notFound('Team')
      }

      // Find the team that contains the member we want to remove
      const memberToRemove = await db.query.teamMembers.findFirst({
        where: eq(teamMembers.id, memberId),
        with: {
          team: true
        }
      })

      if (!memberToRemove) {
        return apiResponses.notFound('Team member')
      }

      // Check if the user is in the same team
      const userTeam = userMemberships.find(
        m => m.teamId === memberToRemove.teamId
      )
      if (!userTeam) {
        return apiResponses.forbidden(
          'You can only remove members from your own team'
        )
      }

      // Check if the user is the team owner
      await requireTeamOwner(userTeam.teamId, user.id)

      // Remove the team member
      await removeTeamMember(memberId, userTeam.teamId, user.id)

      return apiResponses.success({ success: true })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('owner')) {
          return apiResponses.forbidden(error.message)
        }
        if (error.message.includes('not found')) {
          return apiResponses.notFound('Team member')
        }
        if (error.message.includes('last owner')) {
          return apiResponses.error('Cannot remove the last owner', 400)
        }
      }
      return apiResponses.handleError(error, 'Failed to remove team member')
    }
  }
)
