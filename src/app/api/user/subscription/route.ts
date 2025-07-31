import { apiResponses } from '@/lib/api/server-utils'
import { getUserPersonalSubscription } from '@/services/subscription'
import { getUser } from '@/services/user'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return apiResponses.unauthorized()
    }

    const personalSubscription = await getUserPersonalSubscription(user.id)

    return apiResponses.success({
      subscription: personalSubscription,
      userId: user.id
    })
  } catch (error) {
    console.error('Failed to fetch personal subscription:', error)
    return apiResponses.handleError(error, 'Failed to fetch subscription')
  }
}
