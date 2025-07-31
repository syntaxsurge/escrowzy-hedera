import 'server-only'
import { eq, and, desc, sql, isNotNull } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import {
  teamMembers,
  paymentHistory,
  userSubscriptions,
  teams
} from '@/lib/db/schema'
import { PLAN_HIERARCHY } from '@/lib/utils/subscription'

export async function getLatestHighestPlanBuyer(
  teamId: number
): Promise<number | null> {
  // Get all team members
  const members = await db
    .select({
      userId: teamMembers.userId
    })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId))

  if (members.length === 0) {
    return null
  }

  // Get all confirmed payments for this team, ordered by creation date desc
  const payments = await db
    .select({
      userId: paymentHistory.userId,
      planId: paymentHistory.planId,
      createdAt: paymentHistory.createdAt
    })
    .from(paymentHistory)
    .where(
      and(
        eq(paymentHistory.teamId, teamId),
        eq(paymentHistory.status, 'confirmed')
      )
    )
    .orderBy(desc(paymentHistory.createdAt))

  if (payments.length === 0) {
    return null
  }

  // Find the user with the latest highest plan purchase
  let latestHighestBuyer: {
    userId: number
    planLevel: number
    createdAt: Date
  } | null = null

  for (const payment of payments) {
    const planLevel = PLAN_HIERARCHY[payment.planId.toLowerCase()] ?? 0

    if (!latestHighestBuyer || planLevel > latestHighestBuyer.planLevel) {
      latestHighestBuyer = {
        userId: payment.userId,
        planLevel,
        createdAt: payment.createdAt
      }
    }
  }

  return latestHighestBuyer?.userId ?? null
}
export async function getUserPersonalSubscription(userId: number) {
  const subscriptions = await db
    .select()
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.isActive, true)
      )
    )

  // Filter out team plans - only return individual plans
  const personalSubscription = subscriptions.find(
    sub => !sub.planId.toLowerCase().includes('team')
  )

  return personalSubscription || null
}
export async function updatePersonalSubscription(
  userId: number,
  planId: string,
  expiresAt?: Date | null
): Promise<void> {
  const isPersonalPlan = !planId.toLowerCase().includes('team')

  // For personal plans, check if user already has a personal (non-team) subscription record
  const existing = await db
    .select()
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        isPersonalPlan
          ? sql`${userSubscriptions.planId} NOT LIKE '%team%'`
          : sql`${userSubscriptions.planId} LIKE '%team%'`
      )
    )
    .limit(1)

  if (existing.length > 0) {
    // Update existing subscription of the same type
    await db
      .update(userSubscriptions)
      .set({
        planId,
        subscriptionExpiresAt: expiresAt,
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, existing[0].id))
  } else {
    // Create new subscription record
    await db.insert(userSubscriptions).values({
      userId,
      planId,
      subscriptionExpiresAt: expiresAt,
      isActive: true
    })
  }
} /**
 * Process expired team subscriptions
 */

export async function processExpiredSubscriptions() {
  const now = new Date()

  // Find all teams with expired subscriptions
  const expiredTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(eq(teams.isTeamPlan, true), isNotNull(teams.subscriptionExpiresAt))
    )

  let processed = 0

  for (const team of expiredTeams) {
    const [teamData] = await db
      .select({ subscriptionExpiresAt: teams.subscriptionExpiresAt })
      .from(teams)
      .where(eq(teams.id, team.id))
      .limit(1)

    if (
      teamData?.subscriptionExpiresAt &&
      new Date(teamData.subscriptionExpiresAt) < now
    ) {
      await db
        .update(teams)
        .set({
          planId: 'free',
          isTeamPlan: false,
          teamOwnerId: null,
          subscriptionExpiresAt: null,
          updatedAt: now
        })
        .where(eq(teams.id, team.id))

      processed++
    }
  }

  return { processed }
}
/**
 * Validate and update subscription status
 */

export async function validateAndUpdateSubscriptionStatus(
  teamId: number,
  userId?: number
) {
  const teamPlan = await getTeamPlan(teamId, userId)

  // Check if team subscription has expired
  if (teamPlan.isTeamPlan && teamPlan.expiresAt) {
    const now = new Date()
    const expiresAt = new Date(teamPlan.expiresAt)

    if (expiresAt < now) {
      // Subscription expired, downgrade to free
      await db
        .update(teams)
        .set({
          planId: 'free',
          isTeamPlan: false,
          teamOwnerId: null,
          subscriptionExpiresAt: null,
          updatedAt: now
        })
        .where(eq(teams.id, teamId))

      return {
        status: 'inactive',
        planName: 'free',
        isTeamPlan: false
      }
    }
  }

  return {
    status: teamPlan.planId === 'free' ? 'inactive' : 'active',
    planName: teamPlan.planId,
    isTeamPlan: teamPlan.isTeamPlan,
    isOwner: teamPlan.isOwner
  }
}
/**
 * Get combined subscription info (team and personal)
 */

export async function getCombinedSubscriptionInfo(
  teamId: number,
  userId: number
) {
  // Get team subscription info
  const teamSubscription = await getSubscriptionValidity(teamId, userId)

  // Get personal subscription info
  const personalSubscription = await getUserPersonalSubscription(userId)

  let personalPlanInfo = {
    planName: 'free',
    isActive: false,
    daysRemaining: null as number | null,
    expiresAt: null as Date | null
  }

  if (personalSubscription) {
    // Check if this is actually a personal plan (not a team plan)
    // Team plans typically include 'team' in their plan ID
    const isPersonalPlan = !personalSubscription.planId
      .toLowerCase()
      .includes('team')

    if (isPersonalPlan) {
      let daysRemaining = null
      if (personalSubscription.subscriptionExpiresAt) {
        const now = new Date()
        const expiresAt = new Date(personalSubscription.subscriptionExpiresAt)
        const diffTime = expiresAt.getTime() - now.getTime()
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      personalPlanInfo = {
        planName: personalSubscription.planId,
        isActive:
          personalSubscription.isActive &&
          (!personalSubscription.subscriptionExpiresAt ||
            new Date(personalSubscription.subscriptionExpiresAt) > new Date()),
        daysRemaining,
        expiresAt: personalSubscription.subscriptionExpiresAt
      }
    }
  }

  return {
    teamSubscription,
    personalSubscription: personalPlanInfo
  }
}
/**
 * Get subscription validity details for a team
 */

export async function getSubscriptionValidity(teamId: number, userId?: number) {
  const teamPlan = await getTeamPlan(teamId, userId)

  let daysRemaining = null
  if (teamPlan.expiresAt) {
    const now = new Date()
    const expiresAt = new Date(teamPlan.expiresAt)
    const diffTime = expiresAt.getTime() - now.getTime()
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  return {
    isValid: teamPlan.planId !== 'free',
    isActive: teamPlan.planId !== 'free',
    planName: teamPlan.planId,
    isTeamPlan: teamPlan.isTeamPlan,
    isOwner: teamPlan.isOwner,
    status: teamPlan.planId === 'free' ? 'inactive' : 'active',
    daysRemaining,
    expiresAt: teamPlan.expiresAt
  }
}
/**
 * Get effective team plan details considering team subscriptions
 * @param teamId - The team ID to check
 * @param userId - The user ID to check team ownership
 * @returns Team plan information
 */

export async function getTeamPlan(teamId: number, userId?: number) {
  const [team] = await db
    .select({
      planId: teams.planId,
      isTeamPlan: teams.isTeamPlan,
      teamOwnerId: teams.teamOwnerId,
      subscriptionExpiresAt: teams.subscriptionExpiresAt
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1)

  if (!team) {
    return { planId: 'free', isTeamPlan: false, isOwner: false }
  }

  // Check if subscription is still valid
  const now = new Date()
  const isExpired =
    team.subscriptionExpiresAt && new Date(team.subscriptionExpiresAt) < now

  // Check if this is actually a team plan (either by flag or plan name)
  const isActuallyTeamPlan =
    team.isTeamPlan || team.planId.toLowerCase().includes('team')

  // If it's a team plan and expired, return free
  if (isActuallyTeamPlan && isExpired) {
    return { planId: 'free', isTeamPlan: false, isOwner: false }
  }

  // For team plans, check if user is the latest highest plan buyer
  let isOwner = false
  if (userId && isActuallyTeamPlan) {
    const latestHighestBuyer = await getLatestHighestPlanBuyer(teamId)
    isOwner = latestHighestBuyer === userId
  } else if (userId) {
    isOwner = team.teamOwnerId === userId
  }

  return {
    planId: team.planId,
    isTeamPlan: isActuallyTeamPlan,
    isOwner,
    expiresAt: team.subscriptionExpiresAt
  }
}
