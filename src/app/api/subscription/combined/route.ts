import { NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth/auth-utils'
import { getCombinedSubscriptionInfo } from '@/services/subscription'
import { getTeamForUser } from '@/services/user'

export const GET = withAuth(async ({ user }) => {
  const team = await getTeamForUser()
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const subscriptionInfo = await getCombinedSubscriptionInfo(team.id, user.id)

  return NextResponse.json(subscriptionInfo)
})
