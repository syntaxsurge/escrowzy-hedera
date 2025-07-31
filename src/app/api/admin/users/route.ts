import { withAdminStandardRoute } from '@/lib/api'
import { getAllUsers } from '@/lib/db/queries/admin-queries'

export const GET = withAdminStandardRoute(
  async ({ page, limit, search, role }) => {
    return await getAllUsers(page, limit, search, role)
  },
  'Failed to fetch users'
)
