import { apiResponses } from '@/lib/api/server-utils'
import { withAdmin } from '@/lib/auth/auth-utils'
import { getPlatformStats } from '@/lib/db/queries/admin-queries'

export const GET = withAdmin(async () => {
  try {
    const stats = await getPlatformStats()

    return apiResponses.success(stats)
  } catch (error) {
    return apiResponses.handleError(
      error,
      'Failed to fetch platform statistics'
    )
  }
})
