import 'server-only'
import { cookies } from 'next/headers'

import { desc, eq } from 'drizzle-orm'

import { verifyToken } from '@/lib/auth/session'
import { validateSession } from '@/lib/db/queries/sessions'

import { db } from '../lib/db/drizzle'
import {
  activityLogs,
  teamMembers,
  users,
  ActivityType
} from '../lib/db/schema'

export async function getUser() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie || !sessionCookie.value) {
    return null
  }

  let sessionData
  try {
    sessionData = await verifyToken(sessionCookie.value)
  } catch (_error) {
    // Invalid JWT - just return null, middleware will handle cookie cleanup
    return null
  }

  // Validate session structure
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number' ||
    !sessionData.sessionToken ||
    !sessionData.expires
  ) {
    return null
  }

  // Check JWT expiry
  if (new Date(sessionData.expires) < new Date()) {
    return null
  }

  try {
    // Validate session exists in database and is not expired
    const dbSession = await validateSession(sessionData.sessionToken)
    if (!dbSession) {
      // Session doesn't exist in DB or is expired
      return null
    }

    // Check if user ID matches
    if (dbSession.userId !== sessionData.user.id) {
      return null
    }

    // Get user from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionData.user.id))
      .limit(1)

    if (user.length === 0) {
      // User doesn't exist
      return null
    }

    // Return the user data
    return user[0]
  } catch (error) {
    // Database error - fail closed (deny access)
    console.error('Session validation error:', error)
    return null
  }
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1)

  return result[0]
}

export async function getActivityLogs() {
  const user = await getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const team = await getTeamForUser()
  if (!team) {
    throw new Error('User has no team')
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.teamId, team.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10)
}

export async function getTeamForUser() {
  const user = await getUser()
  if (!user) {
    return null
  }

  // Get all team memberships for the user
  const allMemberships = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  walletAddress: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!allMemberships.length) {
    return null
  }

  // Prioritize collaborative teams (teams with more than 1 member) over intrinsic teams
  const collaborativeTeam = allMemberships.find(
    membership => membership.team.teamMembers.length > 1
  )

  // Return collaborative team if exists, otherwise return the first intrinsic team
  const selectedMembership = collaborativeTeam || allMemberships[0]
  return selectedMembership?.team || null
}

export const getTeam = getTeamForUser

export async function checkAdminRole() {
  const user = await getUser()
  if (!user) {
    return false
  }

  return user.role === 'admin'
}

export async function logActivity(
  userId: number,
  teamId: number,
  activityType: ActivityType,
  _activityData?: any
) {
  await db.insert(activityLogs).values({
    userId,
    teamId,
    action: activityType,
    timestamp: new Date()
  })
}

export async function getPaymentHistory(teamId: number) {
  const { paymentHistory } = await import('../lib/db/schema')
  return await db
    .select()
    .from(paymentHistory)
    .where(eq(paymentHistory.teamId, teamId))
    .orderBy(desc(paymentHistory.createdAt))
}
