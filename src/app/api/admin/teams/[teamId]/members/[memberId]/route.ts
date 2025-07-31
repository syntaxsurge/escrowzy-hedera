import { NextResponse } from 'next/server'

import { eq, and } from 'drizzle-orm'

import { withAdmin } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import { teamMembers, activityLogs } from '@/lib/db/schema'
import { getUser } from '@/services/user'

export const DELETE = withAdmin(
  async (
    { request: _request },
    context: { params: Promise<{ teamId: string; memberId: string }> }
  ) => {
    try {
      const user = await getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { teamId, memberId } = await context.params

      // Get member info before deletion
      const member = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.id, parseInt(memberId)),
            eq(teamMembers.teamId, parseInt(teamId))
          )
        )
        .limit(1)

      if (!member[0]) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }

      // Delete member and log activity
      await db.transaction(async tx => {
        await tx
          .delete(teamMembers)
          .where(
            and(
              eq(teamMembers.id, parseInt(memberId)),
              eq(teamMembers.teamId, parseInt(teamId))
            )
          )

        await tx.insert(activityLogs).values({
          teamId: parseInt(teamId),
          userId: member[0].userId,
          action: `REMOVE_TEAM_MEMBER:${member[0].role}:admin`,
          timestamp: new Date(),
          ipAddress: null
        })
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error removing team member:', error)
      return NextResponse.json(
        { error: 'Failed to remove team member' },
        { status: 500 }
      )
    }
  }
)
