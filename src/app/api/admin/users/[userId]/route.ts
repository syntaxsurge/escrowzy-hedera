import { apiResponses } from '@/lib/api/server-utils'
import { withAdmin } from '@/lib/auth/auth-utils'
import { getSession } from '@/lib/auth/session'
import {
  getUserDetailsForAdmin,
  updateUserByAdmin,
  updateUserPlanByAdmin,
  updateUserPersonalPlanByAdmin,
  deleteUserByAdmin
} from '@/lib/db/queries/admin-queries'
import { ActivityType } from '@/lib/db/schema'
import { logActivity, getTeamForUser } from '@/services/user'

export const GET = withAdmin(
  async (
    { request: _request },
    { params }: { params: Promise<{ userId: string }> }
  ) => {
    try {
      const { userId } = await params
      const userDetails = await getUserDetailsForAdmin(userId)

      if (!userDetails) {
        return apiResponses.notFound('User')
      }

      return apiResponses.success(userDetails)
    } catch (error) {
      return apiResponses.handleError(error, 'Failed to fetch user details')
    }
  }
)

export const PATCH = withAdmin(
  async ({ request }, { params }: { params: Promise<{ userId: string }> }) => {
    try {
      const { userId } = await params
      const session = await getSession()
      const body = await request.json()
      const { userInfo, planId, personalPlanId } = body

      // Get admin's team ID for logging
      const adminTeam = await getTeamForUser()
      const teamId = adminTeam?.id || 0 // Use 0 for system-level activities

      let updatedUser
      let updatedTeam
      let updatedPersonalPlan

      // Update user info if provided
      if (userInfo) {
        updatedUser = await updateUserByAdmin(userId, userInfo)

        await logActivity(
          session!.user.id,
          teamId,
          ActivityType.USER_UPDATED_BY_ADMIN,
          {
            targetUserId: userId,
            changes: userInfo,
            adminId: session!.user.id
          }
        )
      }

      // Update team plan if provided
      if (planId) {
        updatedTeam = await updateUserPlanByAdmin(userId, planId)

        await logActivity(
          session!.user.id,
          teamId,
          ActivityType.SUBSCRIPTION_UPGRADED,
          {
            targetUserId: userId,
            newPlan: planId,
            planType: 'team',
            adminId: session!.user.id
          }
        )
      }

      // Update personal plan if provided
      if (personalPlanId) {
        updatedPersonalPlan = await updateUserPersonalPlanByAdmin(
          userId,
          personalPlanId
        )

        await logActivity(
          session!.user.id,
          teamId,
          ActivityType.SUBSCRIPTION_UPGRADED,
          {
            targetUserId: userId,
            newPlan: personalPlanId,
            planType: 'personal',
            adminId: session!.user.id
          }
        )
      }

      return apiResponses.success({
        user: updatedUser,
        team: updatedTeam,
        personalPlan: updatedPersonalPlan
      })
    } catch (error) {
      return apiResponses.handleError(error, 'Failed to update user')
    }
  }
)

export const DELETE = withAdmin(
  async (
    { request: _request },
    { params }: { params: Promise<{ userId: string }> }
  ) => {
    try {
      const { userId } = await params
      const session = await getSession()

      // Get admin's team ID for logging
      const adminTeam = await getTeamForUser()
      const teamId = adminTeam?.id || 0 // Use 0 for system-level activities

      await logActivity(
        session!.user.id,
        teamId,
        ActivityType.USER_DELETED_BY_ADMIN,
        {
          targetUserId: userId,
          adminId: session!.user.id
        }
      )

      await deleteUserByAdmin(userId)

      return apiResponses.success({ success: true })
    } catch (error) {
      return apiResponses.handleError(error, 'Failed to delete user')
    }
  }
)
