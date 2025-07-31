'use server'

import { randomBytes } from 'crypto'

import { revalidatePath } from 'next/cache'

import { eq, and, ne, count, inArray } from 'drizzle-orm'

import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { truncateAddress } from '@/lib'
import {
  validatedActionWithUser,
  generateEmailVerificationToken,
  generateVerificationExpiry
} from '@/lib/auth/auth-utils'
import { clearSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import {
  users,
  teams,
  teamMembers,
  teamInvitations,
  activityLogs,
  ActivityType,
  paymentHistory,
  emailVerificationRequests
} from '@/lib/db/schema'
import type {
  NewTeamInvitation,
  NewActivityLog,
  NewEmailVerificationRequest
} from '@/lib/db/schema'
import { sendInvitationEmail, sendVerificationEmail } from '@/lib/email'
import { deleteAccountSchema, updateAccountSchema } from '@/lib/schemas/account'
import {
  inviteTeamMemberSchema,
  removeTeamMemberSchema,
  acceptInvitationSchema,
  rejectInvitationSchema,
  updateTeamMemberRoleSchema,
  leaveTeamSchema
} from '@/lib/schemas/team'
import { getIpAddress } from '@/lib/utils/ip'
import { getTeamForUser } from '@/services/user'

async function logActivity(
  teamId: number,
  userId: number,
  action: ActivityType,
  ipAddress?: string
) {
  const activityData: NewActivityLog = {
    teamId,
    userId,
    action,
    ipAddress
  }

  await db.insert(activityLogs).values(activityData)
}

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _formData, user) => {
    try {
      // For wallet-based authentication, we use the password field as a confirmation
      // The user should type "DELETE" or similar to confirm
      if (data.password.toUpperCase() !== 'DELETE') {
        return { error: 'Please type "DELETE" to confirm account deletion' }
      }

      const team = await getTeamForUser()

      // Check if user is the last owner of any team
      if (team) {
        const userMembership = team.teamMembers.find(
          (member: any) => member.userId === user.id
        )
        if (userMembership?.role === 'owner') {
          const owners = team.teamMembers.filter(
            (member: any) => member.role === 'owner'
          )
          if (owners.length === 1) {
            // User is the only owner, check if there are other members
            const otherMembers = team.teamMembers.filter(
              (member: any) => member.userId !== user.id
            )

            if (otherMembers.length > 0) {
              // Transfer ownership to the earliest team member
              const earliestMember = otherMembers.sort(
                (a: any, b: any) =>
                  new Date(a.joinedAt).getTime() -
                  new Date(b.joinedAt).getTime()
              )[0]

              // Update the earliest member to be an owner
              await db
                .update(teamMembers)
                .set({ role: 'owner' })
                .where(eq(teamMembers.id, earliestMember.id))
            }
          }
        }

        // Log activity before deletion
        await logActivity(
          team.id,
          user.id,
          ActivityType.DELETE_ACCOUNT,
          await getIpAddress()
        )
      }

      // Get all teams where user is a member
      const userTeamMemberships = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, user.id))

      // Collect teams that will be deleted (where user is the only member)
      const teamsToDelete = []
      for (const membership of userTeamMemberships) {
        const memberCount = await db
          .select({ count: count() })
          .from(teamMembers)
          .where(eq(teamMembers.teamId, membership.teamId))

        if (memberCount[0].count === 1) {
          teamsToDelete.push(membership.teamId)
        }
      }

      // Delete all activity logs for teams that will be deleted
      if (teamsToDelete.length > 0) {
        await db
          .delete(activityLogs)
          .where(inArray(activityLogs.teamId, teamsToDelete))
      }

      // Delete all team invitations for teams that will be deleted
      if (teamsToDelete.length > 0) {
        await db
          .delete(teamInvitations)
          .where(inArray(teamInvitations.teamId, teamsToDelete))
      }

      // Delete all payment history for teams that will be deleted
      if (teamsToDelete.length > 0) {
        await db
          .delete(paymentHistory)
          .where(inArray(paymentHistory.teamId, teamsToDelete))
      }

      // Remove any pending invitations sent to this user's email
      await db
        .delete(teamInvitations)
        .where(eq(teamInvitations.email, user.email || ''))

      // Remove any pending invitations sent by this user
      await db
        .delete(teamInvitations)
        .where(eq(teamInvitations.invitedByUserId, user.id))

      // Delete user's payment history
      await db.delete(paymentHistory).where(eq(paymentHistory.userId, user.id))

      // Remove user from all teams
      await db.delete(teamMembers).where(eq(teamMembers.userId, user.id))

      // Now safe to delete teams where user was the only member
      for (const teamId of teamsToDelete) {
        await db.delete(teams).where(eq(teams.id, teamId))
      }

      // Delete remaining user's activity logs
      await db.delete(activityLogs).where(eq(activityLogs.userId, user.id))

      // Finally delete the user
      await db.delete(users).where(eq(users.id, user.id))

      // Clear session
      await clearSession()

      // Return success instead of redirect to avoid NEXT_REDIRECT error
      return { success: 'Account deleted successfully' }
    } catch (_error) {
      return { error: 'Failed to delete account. Please try again.' }
    }
  }
)

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _formData, user) => {
    try {
      const team = await getTeamForUser()
      if (!team) {
        return { error: 'Team not found' }
      }

      // Prepare update data
      const updateData: Partial<typeof users.$inferInsert> = {
        name: data.name,
        updatedAt: new Date()
      }

      // Only handle email change if provided and different
      let emailVerificationSent = false
      if (data.email && data.email !== user.email) {
        // Check if email is already verified by someone else
        const existingVerifiedUser = await db
          .select()
          .from(users)
          .where(
            and(eq(users.email, data.email), eq(users.emailVerified, true))
          )
          .limit(1)

        if (existingVerifiedUser.length > 0) {
          return { error: 'This email is already verified by another user' }
        }

        // Delete any existing pending verification requests for this user
        await db
          .delete(emailVerificationRequests)
          .where(eq(emailVerificationRequests.userId, user.id))

        // Create new verification request
        const verificationToken = generateEmailVerificationToken()
        const verificationExpiry = generateVerificationExpiry()

        const verificationRequest: NewEmailVerificationRequest = {
          userId: user.id,
          email: data.email,
          token: verificationToken,
          expiresAt: verificationExpiry
        }

        await db.insert(emailVerificationRequests).values(verificationRequest)

        // Send verification email
        const emailResult = await sendVerificationEmail(
          data.email,
          verificationToken
        )

        if (!emailResult.success) {
          // Delete the verification request if email failed
          await db
            .delete(emailVerificationRequests)
            .where(eq(emailVerificationRequests.token, verificationToken))

          return {
            error: 'Failed to send verification email. Please try again.'
          }
        }

        emailVerificationSent = true
      }

      await db.update(users).set(updateData).where(eq(users.id, user.id))

      // Log activity
      await logActivity(
        team.id,
        user.id,
        ActivityType.UPDATE_ACCOUNT,
        await getIpAddress()
      )

      revalidatePath(appRoutes.dashboard.settings.base)
      return {
        success: emailVerificationSent
          ? 'Account updated successfully! Please check your email to verify your new email address.'
          : 'Account updated successfully!'
      }
    } catch (_error) {
      return { error: 'Failed to update account. Please try again.' }
    }
  }
)

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _formData, user) => {
    try {
      const team = await getTeamForUser()
      if (!team) {
        return { error: 'Team not found' }
      }

      // Check if user has permission to invite
      const userMembership = team.teamMembers.find(
        (member: any) => member.userId === user.id
      )
      if (!userMembership || userMembership.role !== 'owner') {
        return { error: 'Only team owners can invite members' }
      }

      // Check if email is already a team member
      const existingMember = team.teamMembers.find(
        (member: any) => member.user.email === data.email
      )
      if (existingMember) {
        return { error: 'User is already a team member' }
      }

      // Check for existing pending invitation
      const existingInvitation = await db
        .select()
        .from(teamInvitations)
        .where(
          and(
            eq(teamInvitations.teamId, team.id),
            eq(teamInvitations.email, data.email),
            eq(teamInvitations.status, 'pending')
          )
        )
        .limit(1)

      if (existingInvitation.length > 0) {
        return { error: 'Invitation already sent to this email' }
      }

      // Check team member limits based on subscription
      const currentMemberCount = team.teamMembers.length
      const maxMembers =
        team.planId === 'free' ? 3 : team.planId === 'pro' ? 25 : -1

      if (maxMembers > 0 && currentMemberCount >= maxMembers) {
        return {
          error: `Team member limit reached. Upgrade your plan to add more members.`
        }
      }

      // Generate invitation token
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      // Create invitation
      const invitationData: NewTeamInvitation = {
        teamId: team.id,
        invitedByUserId: user.id,
        email: data.email,
        role: data.role,
        token,
        expiresAt
      }

      const [invitation] = await db
        .insert(teamInvitations)
        .values(invitationData)
        .returning()

      // Check if user already exists and if email is verified
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1)

      // Send invitation email
      const isExistingUser = existingUser.length > 0
      const emailResult = await sendInvitationEmail(
        data.email,
        user.name || user.walletAddress,
        team.name,
        data.role,
        token,
        isExistingUser
      )

      if (!emailResult.success) {
        // Delete the invitation if email failed
        await db
          .delete(teamInvitations)
          .where(eq(teamInvitations.id, invitation.id))

        return { error: 'Failed to send invitation email. Please try again.' }
      }

      // Log activity
      await logActivity(
        team.id,
        user.id,
        ActivityType.INVITE_TEAM_MEMBER,
        await getIpAddress()
      )

      revalidatePath(appRoutes.dashboard.base)
      return { success: `Invitation sent to ${data.email}` }
    } catch (_error) {
      return { error: 'Failed to send invitation. Please try again.' }
    }
  }
)

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _formData, user) => {
    try {
      const team = await getTeamForUser()
      if (!team) {
        return { error: 'Team not found' }
      }

      // Check if user has permission to remove members
      const userMembership = team.teamMembers.find(
        (member: any) => member.userId === user.id
      )
      if (!userMembership || userMembership.role !== 'owner') {
        return { error: 'Only team owners can remove members' }
      }

      // Find the member to remove
      const memberToRemove = team.teamMembers.find(
        (member: any) => member.id === data.memberId
      )
      if (!memberToRemove) {
        return { error: 'Team member not found' }
      }

      // Prevent removing yourself
      if (memberToRemove.userId === user.id) {
        return { error: 'You cannot remove yourself from the team' }
      }

      // Prevent removing the last owner
      const owners = team.teamMembers.filter(
        (member: any) => member.role === 'owner'
      )
      if (memberToRemove.role === 'owner' && owners.length === 1) {
        return { error: 'Cannot remove the last team owner' }
      }

      // Get team details to check if it's a team plan
      const [teamDetails] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, team.id))
        .limit(1)

      // Before removing, check if user will have any teams left
      const removedUserId = memberToRemove.userId
      const userOtherTeams = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, removedUserId),
            ne(teamMembers.teamId, team.id)
          )
        )

      // Remove the team member
      await db.delete(teamMembers).where(eq(teamMembers.id, data.memberId))

      // If user has no other teams, ensure they have their intrinsic team
      if (userOtherTeams.length === 0) {
        // Get user details
        const [removedUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, removedUserId))
          .limit(1)

        if (removedUser) {
          // Determine the plan for the removed user's new team
          let userNewPlanId = 'free'
          let isUserTeamPlan = false
          let userTeamOwnerId: number | null = null
          let subscriptionExpiresAt: Date | null = null

          // Check if the removed user owns a team plan
          if (
            teamDetails.isTeamPlan &&
            teamDetails.teamOwnerId === removedUserId
          ) {
            // The removed user is the team plan owner, they keep their plan
            userNewPlanId = teamDetails.planId
            isUserTeamPlan = true
            userTeamOwnerId = removedUserId
            subscriptionExpiresAt = teamDetails.subscriptionExpiresAt
          }

          // Create a new intrinsic team for the user
          const [newTeam] = await db
            .insert(teams)
            .values({
              name: `${truncateAddress(removedUser.walletAddress)}'s Team`,
              planId: userNewPlanId,
              isTeamPlan: isUserTeamPlan,
              teamOwnerId: userTeamOwnerId,
              subscriptionExpiresAt: subscriptionExpiresAt
            })
            .returning()

          // Add user back to their new intrinsic team as owner
          await db.insert(teamMembers).values({
            userId: removedUserId,
            teamId: newTeam.id,
            role: 'owner'
          })
        }
      }

      // Log activity
      await logActivity(
        team.id,
        user.id,
        ActivityType.REMOVE_TEAM_MEMBER,
        await getIpAddress()
      )

      revalidatePath(appRoutes.dashboard.base)
      return { success: 'Team member removed successfully' }
    } catch (_error) {
      return { error: 'Failed to remove team member. Please try again.' }
    }
  }
)

export const acceptInvitation = validatedActionWithUser(
  acceptInvitationSchema,
  async (data, _formData, user) => {
    try {
      // Find the invitation
      let invitation
      if (data.token) {
        invitation = await db
          .select()
          .from(teamInvitations)
          .where(
            and(
              eq(teamInvitations.token, data.token),
              eq(teamInvitations.status, 'pending')
            )
          )
          .limit(1)
      } else if (data.invitationId) {
        invitation = await db
          .select()
          .from(teamInvitations)
          .where(
            and(
              eq(teamInvitations.id, data.invitationId),
              eq(teamInvitations.status, 'pending')
            )
          )
          .limit(1)
      } else {
        return { error: 'Invalid invitation' }
      }

      if (!invitation.length) {
        return { error: 'Invalid or expired invitation' }
      }

      const invite = invitation[0]

      // Check if invitation has expired
      if (new Date() > invite.expiresAt) {
        return { error: 'This invitation has expired' }
      }

      // Check if user is trying to accept their own invitation
      if (invite.invitedByUserId === user.id) {
        return { error: 'You cannot accept your own invitation' }
      }

      // Check if user is already a member of this team
      const existingMembership = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, invite.teamId),
            eq(teamMembers.userId, user.id)
          )
        )
        .limit(1)

      if (existingMembership.length > 0) {
        return { error: 'You are already a member of this team' }
      }

      // Check if user is already in another team (excluding intrinsic teams)
      const currentTeams = await db
        .select({
          teamId: teamMembers.teamId,
          teamName: teams.name,
          userId: teamMembers.userId
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(eq(teamMembers.userId, user.id))

      // Check if user has a non-intrinsic team (teams with more than 1 member)
      for (const team of currentTeams) {
        const teamMemberCount = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.teamId, team.teamId))

        if (teamMemberCount.length > 1) {
          return {
            error:
              'You are already in a team. Please leave your current team before joining a new one. Go to Team Settings and click "Leave Team".'
          }
        }
      }

      // Handle email validation and update logic
      if (!user.email) {
        // User doesn't have an email, check if the invitation email is already linked to another user
        const existingUserWithEmail = await db
          .select()
          .from(users)
          .where(eq(users.email, invite.email))
          .limit(1)

        if (existingUserWithEmail.length > 0) {
          return {
            error:
              'This email is already linked to another user account. Only that user can accept this invitation.'
          }
        }

        // Update user's email with the invitation email
        await db
          .update(users)
          .set({
            email: invite.email,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id))
      } else {
        // User has an email, check if it matches the invitation email
        if (user.email !== invite.email) {
          return {
            error: 'This invitation was sent to a different email address'
          }
        }
      }

      // If user is accepting via invitationId, ensure they have the correct email
      if (data.invitationId && user.email !== invite.email) {
        return {
          error: 'This invitation was sent to a different email address'
        }
      }

      // Add user to team
      await db.insert(teamMembers).values({
        teamId: invite.teamId,
        userId: user.id,
        role: invite.role
      })

      // Update invitation status
      await db
        .update(teamInvitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(teamInvitations.id, invite.id))

      // Log activity
      await logActivity(
        invite.teamId,
        user.id,
        ActivityType.ACCEPT_INVITATION,
        await getIpAddress()
      )

      revalidatePath(appRoutes.dashboard.base)
      return { success: 'Successfully joined the team!' }
    } catch (_error) {
      return { error: 'Failed to accept invitation. Please try again.' }
    }
  }
)

export const rejectInvitation = validatedActionWithUser(
  rejectInvitationSchema,
  async (data, _formData, user) => {
    try {
      // Find the invitation
      const [invite] = await db
        .select()
        .from(teamInvitations)
        .where(eq(teamInvitations.id, data.invitationId))
        .limit(1)

      if (!invite) {
        return { error: 'Invitation not found' }
      }

      // Check if invitation is for the current user
      if (invite.email !== user.email) {
        return { error: 'This invitation is not for you' }
      }

      // Check if already processed
      if (invite.status !== 'pending') {
        return { error: 'This invitation has already been processed' }
      }

      // Update invitation status
      await db
        .update(teamInvitations)
        .set({
          status: 'rejected',
          updatedAt: new Date()
        })
        .where(eq(teamInvitations.id, invite.id))

      revalidatePath(appRoutes.dashboard.invitations)
      return { success: 'Invitation declined.' }
    } catch (_error) {
      return { error: 'Failed to decline invitation. Please try again.' }
    }
  }
)

export const updateTeamMemberRole = validatedActionWithUser(
  updateTeamMemberRoleSchema,
  async (data, _formData, user) => {
    try {
      const team = await getTeamForUser()
      if (!team) {
        return { error: 'Team not found' }
      }

      // Check if user has permission to update roles
      const userMembership = team.teamMembers.find(
        (member: any) => member.userId === user.id
      )
      if (!userMembership || userMembership.role !== 'owner') {
        return { error: 'Only team owners can update member roles' }
      }

      // Find the member to update
      const memberToUpdate = team.teamMembers.find(
        (member: any) => member.id === data.memberId
      )
      if (!memberToUpdate) {
        return { error: 'Team member not found' }
      }

      // Check if the role is already the same
      if (memberToUpdate.role === data.role) {
        return { error: 'Member already has this role' }
      }

      // Prevent demoting the last owner
      const owners = team.teamMembers.filter(
        (member: any) => member.role === 'owner'
      )
      if (
        memberToUpdate.role === 'owner' &&
        owners.length === 1 &&
        data.role === 'member'
      ) {
        return { error: 'Cannot demote the last team owner' }
      }

      // Update the team member role
      await db
        .update(teamMembers)
        .set({
          role: data.role
        })
        .where(eq(teamMembers.id, data.memberId))

      // Log activity
      await logActivity(
        team.id,
        user.id,
        ActivityType.UPDATE_PROFILE,
        await getIpAddress()
      )

      revalidatePath(appRoutes.dashboard.base)
      return { success: `Member role updated to ${data.role}` }
    } catch (_error) {
      return { error: 'Failed to update member role. Please try again.' }
    }
  }
)

export const leaveTeam = validatedActionWithUser(
  leaveTeamSchema,
  async (_data, _formData, user) => {
    try {
      const team = await getTeamForUser()
      if (!team) {
        return { error: 'Team not found' }
      }

      // Check if this is an intrinsic team (only 1 member)
      if (team.teamMembers.length === 1) {
        return { error: 'You cannot leave your personal team' }
      }

      // Find user's membership
      const userMembership = team.teamMembers.find(
        (member: any) => member.userId === user.id
      )
      if (!userMembership) {
        return { error: 'You are not a member of this team' }
      }

      // Handle ownership transfer if user is the last owner
      const owners = team.teamMembers.filter(
        (member: any) => member.role === 'owner'
      )
      const isLastOwner = userMembership.role === 'owner' && owners.length === 1

      if (isLastOwner) {
        // Find the oldest member to transfer ownership to
        const otherMembers = team.teamMembers.filter(
          (member: any) => member.userId !== user.id && member.role === 'member'
        )

        if (otherMembers.length === 0) {
          return {
            error:
              'You cannot leave the team as the only owner. Please promote another member to owner first, or remove all other members to dissolve the team.'
          }
        }

        // Transfer ownership to the oldest member
        const oldestMember = otherMembers.sort(
          (a: any, b: any) =>
            new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
        )[0]

        await db
          .update(teamMembers)
          .set({ role: 'owner' })
          .where(eq(teamMembers.id, oldestMember.id))

        // Log ownership transfer activity
        await logActivity(
          team.id,
          user.id,
          ActivityType.UPDATE_TEAM_MEMBER_ROLE,
          await getIpAddress()
        )
      }

      // Get team details to check plan ownership
      const [teamDetails] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, team.id))
        .limit(1)

      // Remove user from team
      await db
        .delete(teamMembers)
        .where(
          and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, team.id))
        )

      // Determine the plan for the user's new personal team
      let userNewPlanId = 'free'

      // If the leaving user is the team owner of a team plan, they keep their plan
      if (teamDetails.isTeamPlan && teamDetails.teamOwnerId === user.id) {
        userNewPlanId = teamDetails.planId

        // Check if there's another team member with a team plan to take over
        const remainingMembers = team.teamMembers.filter(
          (member: any) => member.userId !== user.id
        )

        let newTeamOwnerId: number | null = null

        // Check each remaining member for team plan ownership
        for (const member of remainingMembers) {
          const [memberTeams] = await db
            .select()
            .from(teams)
            .where(
              and(
                eq(teams.teamOwnerId, member.userId),
                eq(teams.isTeamPlan, true)
              )
            )
            .limit(1)

          if (memberTeams) {
            newTeamOwnerId = member.userId
            break
          }
        }

        // Update the team's plan and owner
        if (newTeamOwnerId) {
          // Another member has a team plan, transfer ownership
          await db
            .update(teams)
            .set({
              teamOwnerId: newTeamOwnerId,
              updatedAt: new Date()
            })
            .where(eq(teams.id, team.id))
        } else {
          // No other member has a team plan, downgrade to free
          await db
            .update(teams)
            .set({
              planId: 'free',
              isTeamPlan: false,
              teamOwnerId: null,
              subscriptionExpiresAt: null,
              updatedAt: new Date()
            })
            .where(eq(teams.id, team.id))
        }
      }

      // Create a new intrinsic team for the user
      const [newTeam] = await db
        .insert(teams)
        .values({
          name: `${truncateAddress(user.walletAddress)}'s Team`,
          planId: userNewPlanId,
          isTeamPlan:
            teamDetails.isTeamPlan && teamDetails.teamOwnerId === user.id,
          teamOwnerId:
            teamDetails.isTeamPlan && teamDetails.teamOwnerId === user.id
              ? user.id
              : null,
          subscriptionExpiresAt:
            teamDetails.isTeamPlan && teamDetails.teamOwnerId === user.id
              ? teamDetails.subscriptionExpiresAt
              : null
        })
        .returning()

      // Add user to their new intrinsic team as owner
      await db.insert(teamMembers).values({
        userId: user.id,
        teamId: newTeam.id,
        role: 'owner'
      })

      // Log activity
      await logActivity(
        team.id,
        user.id,
        ActivityType.REMOVE_TEAM_MEMBER,
        await getIpAddress()
      )

      revalidatePath(appRoutes.dashboard.base)
      revalidatePath(appRoutes.dashboard.settings.team)
      return { success: 'You have successfully left the team' }
    } catch (_error) {
      return { error: 'Failed to leave team. Please try again.' }
    }
  }
)

export async function refreshDashboardData() {
  try {
    // Revalidate all dashboard-related paths to ensure fresh data
    revalidatePath(appRoutes.dashboard.base)
    revalidatePath(appRoutes.pricing)
    revalidatePath(appRoutes.dashboard.settings.base)
    revalidatePath(appRoutes.dashboard.settings.team)
    revalidatePath(appRoutes.dashboard.activity)

    // Also revalidate API paths to bust server-side cache
    revalidatePath(apiEndpoints.user.profile)
    revalidatePath(apiEndpoints.user.subscription)
    revalidatePath(apiEndpoints.team)

    return { success: true }
  } catch (error) {
    console.error('Failed to refresh dashboard data:', error)
    return { success: false }
  }
}
