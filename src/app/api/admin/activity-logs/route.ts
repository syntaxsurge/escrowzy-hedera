import { extractPaginationParams } from '@/lib/api'
import { apiResponses } from '@/lib/api/server-utils'
import { withAdmin } from '@/lib/auth/auth-utils'
import {
  getActivityLogs,
  deleteActivityLogs
} from '@/lib/db/queries/admin-queries'
import { validateArrayInput } from '@/lib/schemas/validation'

export const GET = withAdmin(async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit } = extractPaginationParams(searchParams)
    const userId = searchParams.get('userId') || undefined
    const activityType = searchParams.get('activityType') || undefined
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined

    const result = await getActivityLogs(
      page,
      limit,
      userId,
      activityType,
      startDate,
      endDate
    )

    return apiResponses.success(result)
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to fetch activity logs')
  }
})

export const DELETE = withAdmin(async ({ request }) => {
  try {
    const { ids } = await request.json()

    validateArrayInput(ids, 'ids')

    const deletedCount = await deleteActivityLogs(ids)

    return apiResponses.success({ success: true, deletedCount })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to delete activity logs')
  }
})
