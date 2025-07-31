import { NextRequest } from 'next/server'

import { lt, eq, or, and } from 'drizzle-orm'

import { envServer } from '@/config/env.server'
import { apiResponses } from '@/lib/api/server-utils'
import { db } from '@/lib/db/drizzle'
import { teamInvitations, battleInvitations } from '@/lib/db/schema'

export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = envServer.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return apiResponses.unauthorized()
    }

    // Delete expired team invitations
    const expiredTeamResult = await db
      .delete(teamInvitations)
      .where(lt(teamInvitations.expiresAt, new Date()))
      .returning({ id: teamInvitations.id })

    // Also delete declined team invitations (status = 'declined')
    const declinedTeamResult = await db
      .delete(teamInvitations)
      .where(eq(teamInvitations.status, 'declined'))
      .returning({ id: teamInvitations.id })

    // Clean up expired or rejected battle invitations
    const battleCleanupResult = await db
      .delete(battleInvitations)
      .where(
        or(
          // Expired invitations
          and(
            eq(battleInvitations.status, 'pending'),
            lt(battleInvitations.expiresAt, new Date())
          ),
          // Rejected invitations
          eq(battleInvitations.status, 'rejected'),
          // Old accepted invitations (older than 1 hour)
          and(
            eq(battleInvitations.status, 'accepted'),
            lt(
              battleInvitations.respondedAt,
              new Date(Date.now() - 60 * 60 * 1000)
            )
          )
        )
      )
      .returning({ id: battleInvitations.id })

    return apiResponses.success({
      success: true,
      team: {
        deletedExpired: expiredTeamResult.length,
        deletedDeclined: declinedTeamResult.length
      },
      battle: {
        deletedTotal: battleCleanupResult.length
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to cleanup invitations')
  }
}
