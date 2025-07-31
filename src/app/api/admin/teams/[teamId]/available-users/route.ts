import { NextResponse } from 'next/server'

import { withAdmin } from '@/lib/auth/auth-utils'
import { getAvailableUsers } from '@/lib/db/queries/admin-team-members'

export const GET = withAdmin(
  async ({ request }, context: { params: Promise<{ teamId: string }> }) => {
    try {
      const { searchParams } = new URL(request.url)
      const search = searchParams.get('search') || undefined

      const { teamId } = await context.params
      const users = await getAvailableUsers(teamId, search)

      return NextResponse.json(users)
    } catch (error) {
      console.error('Error fetching available users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch available users' },
        { status: 500 }
      )
    }
  }
)
