import { apiResponses } from '@/lib/api/server-utils'
import { validateAndUpdateSubscriptionStatus } from '@/services/subscription'
import { getUser, getTeamForUser } from '@/services/user'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return apiResponses.unauthorized('Not authenticated')
    }

    const team = await getTeamForUser()
    if (!team) {
      return apiResponses.notFound('Team')
    }

    // Validate and update subscription status
    const result = await validateAndUpdateSubscriptionStatus(team.id, user.id)

    return apiResponses.success({
      status: result.status,
      planName: result.planName,
      isTeamPlan: result.isTeamPlan,
      isOwner: result.isOwner,
      message:
        result.status === 'inactive'
          ? 'Subscription expired, downgraded to Free plan'
          : result.isTeamPlan && !result.isOwner
            ? 'Active team subscription (from team owner)'
            : 'Subscription is active'
    })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to validate subscription')
  }
}
