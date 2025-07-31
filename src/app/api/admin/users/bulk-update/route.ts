import { NextResponse } from 'next/server'

import { withAdmin } from '@/lib/auth/auth-utils'
import { getSession } from '@/lib/auth/session'
import { bulkUpdateUserRoles } from '@/lib/db/queries/admin-queries'
import { ActivityType } from '@/lib/db/schema'
import { logActivity, getTeamForUser } from '@/services/user'

export const POST = withAdmin(async ({ request }) => {
  try {
    const session = await getSession()
    const { updates } = await request.json()

    // Get admin's team ID for logging
    const adminTeam = await getTeamForUser()
    const teamId = adminTeam?.id || 0 // Use 0 for system-level activities

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid updates array' },
        { status: 400 }
      )
    }

    const results = await bulkUpdateUserRoles(updates)

    await logActivity(
      session!.user.id,
      teamId,
      ActivityType.BULK_USER_ROLES_UPDATED,
      {
        updatedUsers: updates,
        adminId: session!.user.id
      }
    )

    return NextResponse.json({
      success: true,
      updated: results.length
    })
  } catch (error) {
    console.error('Error bulk updating users:', error)
    return NextResponse.json(
      { error: 'Failed to bulk update users' },
      { status: 500 }
    )
  }
})
