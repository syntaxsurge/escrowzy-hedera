import { withAdminStandardRoute } from '@/lib/api'
import { getAllTeams } from '@/lib/db/queries/admin-queries'

export const GET = withAdminStandardRoute(async ({ page, limit, search }) => {
  return await getAllTeams(page, limit, search)
}, 'Failed to fetch teams')
