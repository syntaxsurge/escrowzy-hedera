import { NextResponse } from 'next/server'

import { eq, and } from 'drizzle-orm'

import { withAdmin } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import { teamMembers, activityLogs } from '@/lib/db/schema'
import { getUser } from '@/services/user'

export const PATCH = withAdmin(
  async (
    { request },
    context: { params: Promise<{ teamId: string; memberId: string }> }
  ) => {
    try {
      const user = await getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { role } = await request.json()

      if (!['owner', 'member'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }

      const { teamId, memberId } = await context.params

      // Get current member info
      const currentMember = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.id, parseInt(memberId)),
            eq(teamMembers.teamId, parseInt(teamId))
          )
        )
        .limit(1)

      if (!currentMember[0]) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }

      // Update role and log activity
      await db.transaction(async tx => {
        await tx
          .update(teamMembers)
          .set({ role: role as 'owner' | 'member' })
          .where(
            and(
              eq(teamMembers.id, parseInt(memberId)),
              eq(teamMembers.teamId, parseInt(teamId))
            )
          )

        await tx.insert(activityLogs).values({
          teamId: parseInt(teamId),
          userId: currentMember[0].userId,
          action: `UPDATE_TEAM_ROLE:${currentMember[0].role}>${role}:admin`,
          timestamp: new Date(),
          ipAddress: null
        })
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error updating team member role:', error)
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      )
    }
  }
)
