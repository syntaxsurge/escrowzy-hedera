import { NextRequest } from 'next/server'

import { apiResponses } from '@/lib/api/server-utils'
import { requireTeamMember } from '@/lib/auth/team-auth'
import { downgradeSchema } from '@/lib/schemas/team'
import { updatePersonalSubscription } from '@/services/subscription'
import { getUser } from '@/services/user'

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
    try {
      await requireTeamMember(validatedData.teamId, user.id)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return apiResponses.notFound('Team')
        }
        return apiResponses.forbidden(error.message)
      }
      return apiResponses.error('Authorization failed')
    }

    // This endpoint only handles individual plan downgrades
    // Update user's personal subscription to free
    await updatePersonalSubscription(user.id, 'free')

    // Note: Team plans are not affected by individual plan downgrades
    // Users can have both individual and team subscriptions independently

    return apiResponses.success({
      success: true,
      message: 'Successfully downgraded to free plan'
    })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to downgrade to free plan')
  }
}
