import { apiResponses } from '@/lib/api/server-utils'
import { getActivityLogs } from '@/services/user'

export async function GET() {
  try {
    const activityLogs = await getActivityLogs()
    return apiResponses.success(activityLogs)
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to fetch activity logs')
  }
}
