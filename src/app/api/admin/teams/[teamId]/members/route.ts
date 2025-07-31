import { apiResponses } from '@/lib/api/server-utils'
import { withAdmin } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import { teamMembers, activityLogs } from '@/lib/db/schema'
import { getUser } from '@/services/user'

export const POST = withAdmin(
  async ({ request }, context: { params: Promise<{ teamId: string }> }) => {
    try {
      const user = await getUser()
      if (!user) {
        return apiResponses.unauthorized()
      }

      const { userIds, role } = await request.json()

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return apiResponses.validationError(['userIds'])
      }

      if (!['owner', 'member'].includes(role)) {
        return apiResponses.validationError(['role'])
      }

      const { teamId } = await context.params

      // Add members to team
      const newMembers = await db.transaction(async tx => {
        const membersToInsert = userIds.map((userId: number) => ({
          teamId: parseInt(teamId),
          userId,
          role: role as 'owner' | 'member',
          joinedAt: new Date()
        }))

        const inserted = await tx
          .insert(teamMembers)
          .values(membersToInsert)
          .returning()

        // Log activity for each new member
        const activities = inserted.map(member => ({
          teamId: parseInt(teamId),
          userId: member.userId,
          action: `ADD_TEAM_MEMBER:${member.role}:admin`,
          timestamp: new Date(),
          ipAddress: null
        }))

        await tx.insert(activityLogs).values(activities)

        return inserted
      })

      return apiResponses.success({
        success: true,
        added: newMembers.length
      })
    } catch (error) {
      return apiResponses.handleError(error, 'Failed to add team members')
    }
  }
)
