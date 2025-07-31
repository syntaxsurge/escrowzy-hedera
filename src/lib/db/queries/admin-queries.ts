import {
  eq,
  desc,
  and,
  sql,
  gte,
  lte,
  or,
  like,
  count,
  inArray
} from 'drizzle-orm'

import { db } from '../drizzle'
import {
  users,
  teams,
  teamMembers,
  activityLogs,
  teamInvitations,
  paymentHistory,
  userSubscriptions
} from '../schema'

// User Management Queries
export async function getAllUsers(
  page: number = 1,
  limit: number = 20,
  search?: string,
  role?: string
) {
  const offset = (page - 1) * limit

  const conditions = []
  if (search) {
    conditions.push(
      or(like(users.email, `%${search}%`), like(users.name, `%${search}%`))
    )
  }
  if (role) {
    conditions.push(eq(users.role, role))
  }

  const [usersList, totalCount] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        walletAddress: users.walletAddress,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        planId: sql<string>`(
          SELECT t.plan_id FROM teams t
          INNER JOIN team_members tm ON t.id = tm.team_id
          WHERE tm.user_id = users.id AND tm.role = 'owner'
          LIMIT 1
        )`
      })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: count() })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
  ])

  return {
    users: usersList,
    totalCount: totalCount[0]?.count || 0,
    totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
    currentPage: page
  }
}

export async function getUserDetailsForAdmin(userId: string) {
  const userIdInt = parseInt(userId)
  const [userDetails] = await db
    .select({
      user: users,
      planId: sql<string>`(
        SELECT t.plan_id FROM teams t
        INNER JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = users.id AND tm.role = 'owner'
        LIMIT 1
      )`,
      personalPlanId: sql<string>`(
        SELECT us.plan_id
        FROM user_subscriptions us
        WHERE us.user_id = users.id AND us.is_active = true
        ORDER BY us.created_at DESC
        LIMIT 1
      )`
    })
    .from(users)
    .where(eq(users.id, userIdInt))

  if (!userDetails) {
    return null
  }

  return {
    user: userDetails.user,
    planId: userDetails.planId || 'free',
    personalPlanId: userDetails.personalPlanId || 'free'
  }
}

export async function updateUserByAdmin(
  userId: string,
  data: {
    name?: string
    email?: string
    role?: string
  }
) {
  const userIdInt = parseInt(userId)
  const [updatedUser] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(users.id, userIdInt))
    .returning()

  return updatedUser
}

export async function updateUserPlanByAdmin(userId: string, planId: string) {
  // Find the user's team where they are the owner
  const userTeam = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, parseInt(userId)),
        eq(teamMembers.role, 'owner')
      )
    )
    .limit(1)

  if (userTeam.length === 0) {
    throw new Error('User does not own any team')
  }

  const teamId = userTeam[0].teamId

  // Set expiration date based on plan
  const expirationDate = new Date()
  if (planId === 'free') {
    // Free plan doesn't expire
    const [updated] = await db
      .update(teams)
      .set({
        planId,
        isTeamPlan: false,
        subscriptionExpiresAt: null,
        updatedAt: new Date()
      })
      .where(eq(teams.id, teamId))
      .returning()
    return updated
  } else {
    // Paid plans expire in 30 days from now
    expirationDate.setDate(expirationDate.getDate() + 30)

    // Determine if this is a team plan
    const isTeamPlan = planId.toLowerCase().includes('team')

    const [updated] = await db
      .update(teams)
      .set({
        planId,
        isTeamPlan,
        subscriptionExpiresAt: expirationDate,
        updatedAt: new Date()
      })
      .where(eq(teams.id, teamId))
      .returning()
    return updated
  }
}

export async function updateUserPersonalPlanByAdmin(
  userId: string,
  planId: string
) {
  const userIdInt = parseInt(userId)

  // Check if user has an existing subscription
  const existingSubscription = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userIdInt))
    .limit(1)

  if (existingSubscription.length === 0) {
    // Create new subscription
    const [newSubscription] = await db
      .insert(userSubscriptions)
      .values({
        userId: userIdInt,
        planId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()

    return newSubscription
  } else {
    // Update existing subscription
    const [updatedSubscription] = await db
      .update(userSubscriptions)
      .set({
        planId,
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.userId, userIdInt))
      .returning()

    return updatedSubscription
  }
}

// Team Management Queries
export async function getAllTeams(
  page: number = 1,
  limit: number = 20,
  search?: string
) {
  const offset = (page - 1) * limit

  const conditions = search ? like(teams.name, `%${search}%`) : undefined

  const [teamsList, totalCount] = await Promise.all([
    db
      .select({
        id: teams.id,
        name: teams.name,
        planId: teams.planId,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
        memberCount: sql<number>`(
          SELECT COUNT(*) FROM team_members tm
          WHERE tm.team_id = teams.id
        )`,
        ownerEmail: sql<string>`(
          SELECT u.email FROM users u
          INNER JOIN team_members tm ON u.id = tm.user_id
          WHERE tm.team_id = teams.id 
          AND tm.role = 'owner'
          LIMIT 1
        )`,
        ownerName: sql<string>`(
          SELECT u.name FROM users u
          INNER JOIN team_members tm ON u.id = tm.user_id
          WHERE tm.team_id = teams.id 
          AND tm.role = 'owner'
          LIMIT 1
        )`,
        ownerWallet: sql<string>`(
          SELECT u.wallet_address FROM users u
          INNER JOIN team_members tm ON u.id = tm.user_id
          WHERE tm.team_id = teams.id 
          AND tm.role = 'owner'
          LIMIT 1
        )`
      })
      .from(teams)
      .where(conditions)
      .orderBy(desc(teams.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ count: count() }).from(teams).where(conditions)
  ])

  return {
    teams: teamsList,
    totalCount: totalCount[0]?.count || 0,
    totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
    currentPage: page
  }
}

// Platform Statistics Queries
export async function getPlatformStats() {
  const [userStats, planStats, activityStats, teamStats] = await Promise.all([
    // User statistics
    db
      .select({
        totalUsers: count(),
        emailUsers: sql<number>`COUNT(CASE WHEN ${users.email} IS NOT NULL THEN 1 END)`,
        adminUsers: sql<number>`COUNT(CASE WHEN ${users.role} = 'admin' THEN 1 END)`,
        walletUsers: sql<number>`COUNT(CASE WHEN ${users.walletAddress} IS NOT NULL THEN 1 END)`
      })
      .from(users),

    // Plan statistics (from teams)
    db
      .select({
        totalTeams: count(),
        freeTeams: sql<number>`COUNT(CASE WHEN ${teams.planId} = 'free' THEN 1 END)`,
        proTeams: sql<number>`COUNT(CASE WHEN ${teams.planId} = 'pro' THEN 1 END)`,
        enterpriseTeams: sql<number>`COUNT(CASE WHEN ${teams.planId} = 'enterprise' THEN 1 END)`
      })
      .from(teams),

    // Activity statistics
    db
      .select({
        totalActivities: count(),
        todayActivities: sql<number>`COUNT(CASE WHEN ${activityLogs.timestamp} >= CURRENT_DATE THEN 1 END)`,
        weekActivities: sql<number>`COUNT(CASE WHEN ${activityLogs.timestamp} >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END)`
      })
      .from(activityLogs),

    // Team statistics
    db
      .select({
        totalTeams: count(),
        totalTeamMembers: sql<number>`(SELECT COUNT(*) FROM team_members)`,
        avgTeamSize: sql<number>`COALESCE((SELECT AVG(member_count) FROM (SELECT COUNT(*) as member_count FROM team_members tm GROUP BY tm.team_id) as team_sizes), 0)`
      })
      .from(teams)
  ])

  // Get recent signups (last 30 days)
  const recentSignups = await db
    .select({
      date: sql<string>`DATE(${users.createdAt})`,
      count: count()
    })
    .from(users)
    .where(gte(users.createdAt, sql`CURRENT_DATE - INTERVAL '30 days'`))
    .groupBy(sql`DATE(${users.createdAt})`)
    .orderBy(sql`DATE(${users.createdAt})`)

  // Get team creation trend (last 30 days)
  const teamCreationTrend = await db
    .select({
      date: sql<string>`DATE(${teams.createdAt})`,
      count: count()
    })
    .from(teams)
    .where(gte(teams.createdAt, sql`CURRENT_DATE - INTERVAL '30 days'`))
    .groupBy(sql`DATE(${teams.createdAt})`)
    .orderBy(sql`DATE(${teams.createdAt})`)

  return {
    users: userStats[0],
    plans: planStats[0],
    activity: activityStats[0],
    teams: teamStats[0],
    charts: {
      recentSignups,
      teamCreationTrend
    }
  }
}

// Activity Logs Queries
export async function getActivityLogs(
  page: number = 1,
  limit: number = 50,
  userId?: string,
  activityType?: string,
  startDate?: Date,
  endDate?: Date
) {
  const offset = (page - 1) * limit

  const conditions = []
  if (userId) conditions.push(eq(activityLogs.userId, parseInt(userId)))
  if (activityType) conditions.push(eq(activityLogs.action, activityType))
  if (startDate) conditions.push(gte(activityLogs.timestamp, startDate))
  if (endDate) conditions.push(lte(activityLogs.timestamp, endDate))

  const [logs, totalCount] = await Promise.all([
    db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        userEmail: users.email,
        userName: users.name,
        teamId: activityLogs.teamId,
        teamName: teams.name,
        activityType: activityLogs.action,
        activityData: sql<any>`'{}'::jsonb`,
        timestamp: activityLogs.timestamp,
        read: activityLogs.read,
        notificationType: activityLogs.notificationType,
        title: activityLogs.title,
        message: activityLogs.message,
        actionUrl: activityLogs.actionUrl,
        metadata: activityLogs.metadata
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .leftJoin(teams, eq(activityLogs.teamId, teams.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: count() })
      .from(activityLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
  ])

  return {
    logs,
    totalCount: totalCount[0]?.count || 0,
    totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
    currentPage: page
  }
}

// Bulk Operations
export async function bulkUpdateUserRoles(
  updates: Array<{ userId: string; role: string }>
) {
  const results = await Promise.all(
    updates.map(({ userId, role }) =>
      db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, parseInt(userId)))
        .returning()
    )
  )

  return results.flat()
}

export async function deleteUserByAdmin(userId: string) {
  // Delete user and cascade to related records
  await db.transaction(async tx => {
    const userIdInt = parseInt(userId)

    // Get all teams where user is a member
    const userTeamMemberships = await tx
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userIdInt))

    // Collect teams that will be deleted (where user is the only member)
    const teamsToDelete = []
    for (const membership of userTeamMemberships) {
      const memberCount = await tx
        .select({ count: count() })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, membership.teamId))

      if (memberCount[0].count === 1) {
        teamsToDelete.push(membership.teamId)
      }
    }

    // Delete all activity logs for teams that will be deleted
    if (teamsToDelete.length > 0) {
      await tx
        .delete(activityLogs)
        .where(inArray(activityLogs.teamId, teamsToDelete))
    }

    // Delete all team invitations for teams that will be deleted
    if (teamsToDelete.length > 0) {
      await tx
        .delete(teamInvitations)
        .where(inArray(teamInvitations.teamId, teamsToDelete))
    }

    // Delete all payment history for teams that will be deleted
    if (teamsToDelete.length > 0) {
      await tx
        .delete(paymentHistory)
        .where(inArray(paymentHistory.teamId, teamsToDelete))
    }

    // Remove any pending invitations sent to this user's email
    const user = await tx
      .select()
      .from(users)
      .where(eq(users.id, userIdInt))
      .limit(1)
    if (user.length > 0 && user[0].email) {
      await tx
        .delete(teamInvitations)
        .where(eq(teamInvitations.email, user[0].email))
    }

    // Remove any pending invitations sent by this user
    await tx
      .delete(teamInvitations)
      .where(eq(teamInvitations.invitedByUserId, userIdInt))

    // Delete user's subscriptions
    await tx
      .delete(userSubscriptions)
      .where(eq(userSubscriptions.userId, userIdInt))

    // Delete user's payment history
    await tx.delete(paymentHistory).where(eq(paymentHistory.userId, userIdInt))

    // Delete team memberships
    await tx.delete(teamMembers).where(eq(teamMembers.userId, userIdInt))

    // Now safe to delete teams where user was the only member
    for (const teamId of teamsToDelete) {
      await tx.delete(teams).where(eq(teams.id, teamId))
    }

    // Delete remaining user's activity logs
    await tx.delete(activityLogs).where(eq(activityLogs.userId, userIdInt))

    // Finally, delete the user
    await tx.delete(users).where(eq(users.id, userIdInt))
  })

  return { success: true }
}

// Activity Log Management
export async function deleteActivityLogs(ids: number[]) {
  await db
    .delete(activityLogs)
    .where(or(...ids.map(id => eq(activityLogs.id, id))))

  return ids.length
}
