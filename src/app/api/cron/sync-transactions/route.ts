import { NextRequest } from 'next/server'

import { eq } from 'drizzle-orm'

import { envServer } from '@/config/env.server'
import { apiResponses } from '@/lib/api/server-utils'
import { db } from '@/lib/db/drizzle'
import { paymentHistory } from '@/lib/db/schema'
import { TransactionService } from '@/services/transaction'

// This endpoint should be called periodically to sync pending transactions
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = envServer.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return apiResponses.unauthorized()
    }

    // Get all unique team IDs that have pending transactions
    const pendingTransactions = await db
      .selectDistinct({ teamId: paymentHistory.teamId })
      .from(paymentHistory)
      .where(eq(paymentHistory.status, 'pending'))

    let totalSynced = 0
    const syncedTransactions = []

    // Sync transactions for each team
    for (const { teamId } of pendingTransactions) {
      const updates = await TransactionService.syncPendingTransactions(
        undefined,
        teamId
      )
      totalSynced += updates.length
      syncedTransactions.push(...updates)
    }

    return apiResponses.success({
      success: true,
      synced: totalSynced,
      transactions: syncedTransactions.map(tx => ({
        transactionHash: tx?.transactionHash,
        status: tx?.status,
        teamId: tx?.teamId,
        planId: tx?.planId
      })),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return apiResponses.handleError(
      error,
      'Failed to sync pending transactions'
    )
  }
}
