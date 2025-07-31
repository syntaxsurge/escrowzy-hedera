import { NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth/auth-utils'
import { getRecentActivityDashboard } from '@/lib/db/queries/activity-logs'

export const GET = withAuth(async ({ user, request }) => {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  const activities = await getRecentActivityDashboard(user.id, limit)

  return NextResponse.json(activities)
})
