import 'server-only'

import { eq, and, or } from 'drizzle-orm'

import { getTransactionStatus } from '@/lib/blockchain/blockchain-transaction'
import { db } from '@/lib/db/drizzle'
import { paymentHistory, teams } from '@/lib/db/schema'
import { type TransactionStatus } from '@/types/transaction'

interface PendingTransaction {
  transactionHash: string
  chainId: number
  teamId: number
  userId: number
  planId: string
  amount: string
  currency: string
  status: TransactionStatus
}

export class TransactionService {
  static async trackTransaction(transaction: PendingTransaction) {
    const existing = await db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.transactionHash, transaction.transactionHash))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(paymentHistory).values({
        teamId: transaction.teamId,
        userId: transaction.userId,
        planId: transaction.planId,
        transactionHash: transaction.transactionHash,
        chainId: transaction.chainId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: 'pending'
      })
    }

    return transaction.transactionHash
  }

  static async updateTransactionStatus(
    transactionHash: string,
    status: TransactionStatus
  ) {
    // Update the transaction status
    await db
      .update(paymentHistory)
      .set({ status })
      .where(eq(paymentHistory.transactionHash, transactionHash))

    // If status is confirmed, also update the team's plan
    if (status === 'confirmed') {
      const [transaction] = await db
        .select()
        .from(paymentHistory)
        .where(eq(paymentHistory.transactionHash, transactionHash))
        .limit(1)

      if (transaction && transaction.planId && transaction.teamId) {
        // Only update team plan if it's actually a team plan
        const isTeamPlan = transaction.planId.toLowerCase().includes('team')
        if (isTeamPlan) {
          try {
            await db
              .update(teams)
              .set({
                planId: transaction.planId,
                isTeamPlan: true,
                updatedAt: new Date()
              })
              .where(eq(teams.id, transaction.teamId))
          } catch (_) {
            // Log error but don't fail the status update
          }
        }
      }
    }
  }

  static async getPendingTransactions(userId?: number, teamId?: number) {
    const conditions = []

    if (userId) {
      conditions.push(eq(paymentHistory.userId, userId))
    }

    if (teamId) {
      conditions.push(eq(paymentHistory.teamId, teamId))
    }

    const baseCondition = eq(paymentHistory.status, 'pending')
    const whereClause =
      conditions.length > 0
        ? and(baseCondition, or(...conditions))
        : baseCondition

    return await db.select().from(paymentHistory).where(whereClause)
  }

  static async checkTransactionOnChain(
    transactionHash: string,
    chainId: number
  ): Promise<TransactionStatus> {
    try {
      const result = await getTransactionStatus(transactionHash, chainId)

      if (result.status === 'confirmed') {
        // Check if the transaction was successful or reverted
        if (result.receipt?.status === 'success') {
          return 'confirmed'
        } else {
          return 'failed'
        }
      } else if (result.status === 'failed') {
        return 'failed'
      } else {
        // Transaction is still pending
        return 'pending'
      }
    } catch (_) {
      // If we can't get the status, assume it's still pending
      return 'pending'
    }
  }

  static async syncPendingTransactions(userId?: number, teamId?: number) {
    const pendingTxs = await this.getPendingTransactions(userId, teamId)

    const updates = await Promise.all(
      pendingTxs.map(async tx => {
        const status = await this.checkTransactionOnChain(
          tx.transactionHash,
          tx.chainId
        )

        if (status !== 'pending' && status !== tx.status) {
          await this.updateTransactionStatus(tx.transactionHash, status)

          // If transaction is confirmed, update the team's plan
          if (status === 'confirmed' && tx.planId && tx.teamId) {
            // Only update team plan if it's actually a team plan
            const isTeamPlan = tx.planId.toLowerCase().includes('team')
            if (isTeamPlan) {
              try {
                await db
                  .update(teams)
                  .set({
                    planId: tx.planId,
                    isTeamPlan: true,
                    updatedAt: new Date()
                  })
                  .where(eq(teams.id, tx.teamId))
              } catch (_) {
                // Log error but don't fail the sync
              }
            }
          }

          return { ...tx, status }
        }

        return null
      })
    )

    return updates.filter(Boolean)
  }
}
