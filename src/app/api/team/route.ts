import { withAuth } from '@/lib/auth/auth-utils'
import { getTeamForUser } from '@/services/user'

export const GET = withAuth(async () => {
  const team = await getTeamForUser()
  return Response.json(team)
})
