import { NextRequest } from 'next/server'

import { eq, and, desc } from 'drizzle-orm'

import { apiResponses } from '@/lib/api/server-utils'
import { db } from '@/lib/db/drizzle'
import {
  teams,
  teamMembers,
  paymentHistory,
  ActivityType
} from '@/lib/db/schema'
import { downgradeSchema } from '@/lib/schemas/team'
import { getUser, logActivity } from '@/services/user'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return apiResponses.unauthorized()
    }

    const { teamId: teamIdParam } = await params
    const teamId = parseInt(teamIdParam)
    const body = await request.json()
    const validatedData = downgradeSchema.parse({ ...body, teamId })

    // Check if user is a member of this team
    const membership = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, user.id),
          eq(teamMembers.teamId, validatedData.teamId)
        )
      )
      .limit(1)

    if (!membership.length) {
      return apiResponses.forbidden('You do not have access to this team')
    }

    // Get team data
    const teamData = await db
      .select()
      .from(teams)
      .where(eq(teams.id, validatedData.teamId))
      .limit(1)

    if (!teamData.length) {
      return apiResponses.notFound('Team')
    }

    const team = teamData[0]

    // Check if this is a team plan
    if (!team.isTeamPlan) {
      return apiResponses.error('This team does not have a team plan', 400)
    }

    // Get the latest team plan payment to find the purchaser
    const latestTeamPayment = await db
      .select({
        userId: paymentHistory.userId,
        planId: paymentHistory.planId,
        createdAt: paymentHistory.createdAt
      })
      .from(paymentHistory)
      .where(
        and(
          eq(paymentHistory.teamId, validatedData.teamId),
          eq(paymentHistory.status, 'confirmed'),
          eq(paymentHistory.planId, team.planId)
        )
      )
      .orderBy(desc(paymentHistory.createdAt))
      .limit(1)

    // Check if the current user is the one who purchased the team plan
    if (
      latestTeamPayment.length > 0 &&
      latestTeamPayment[0].userId !== user.id
    ) {
      return apiResponses.forbidden(
        'Only the person who purchased the team plan can downgrade it. You are not authorized to perform this action.'
      )
    }

    // If no payment found or user is the purchaser, allow downgrade
    // Update team to free plan
    await db
      .update(teams)
      .set({
        planId: 'free',
        isTeamPlan: false,
        teamOwnerId: null,
        subscriptionExpiresAt: null,
        updatedAt: new Date()
      })
      .where(eq(teams.id, validatedData.teamId))

    // Log the activity
    await logActivity(
      user.id,
      validatedData.teamId,
      ActivityType.TEAM_PLAN_DOWNGRADED,
      {
        fromPlan: team.planId,
        toPlan: 'free',
        downgradeType: 'team'
      }
    )

    return apiResponses.success({
      success: true,
      message: 'Successfully downgraded team plan to free'
    })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to downgrade team plan')
  }
}
