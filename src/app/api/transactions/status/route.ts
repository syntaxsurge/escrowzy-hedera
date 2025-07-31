import { NextRequest } from 'next/server'

import { apiResponses } from '@/lib/api/server-utils'
import { requireAuth } from '@/lib/auth/auth-utils'
import { updateStatusSchema } from '@/lib/schemas/transaction'
import { TransactionService } from '@/services/transaction'

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    const { transactionHash, status } = updateStatusSchema.parse(body)

    await TransactionService.updateTransactionStatus(transactionHash, status)

    return apiResponses.success({ updated: true })
  } catch (error) {
    return apiResponses.handleError(
      error,
      'Failed to update transaction status'
    )
  }
}
