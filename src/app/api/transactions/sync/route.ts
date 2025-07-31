import { NextRequest } from 'next/server'

import { eq } from 'drizzle-orm'

import { apiResponses } from '@/lib/api/server-utils'
import { requireAuth } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import { teamMembers } from '@/lib/db/schema'
import { TransactionService } from '@/services/transaction'

export async function POST(_request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    // Get user's teams
    const userTeams = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user.id))

    const teamIds = userTeams.map(t => t.teamId)

    // Sync transactions for all user's teams
    const updates = []
    for (const teamId of teamIds) {
      const teamUpdates = await TransactionService.syncPendingTransactions(
        user.id,
        teamId
      )
      updates.push(...teamUpdates)
    }

    return apiResponses.success({
      synced: updates.length,
      updates: updates.map(u => ({
        transactionHash: u?.transactionHash,
        status: u?.status,
        planId: u?.planId,
        chainId: u?.chainId
      }))
    })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to sync transactions')
  }
}
