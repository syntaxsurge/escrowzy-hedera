import { NextRequest } from 'next/server'

import { apiResponses } from '@/lib/api/server-utils'
import { requireAuth } from '@/lib/auth/auth-utils'
import { trackTransactionSchema } from '@/lib/schemas/transaction'
import { TransactionService } from '@/services/transaction'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    const transaction = trackTransactionSchema.parse(body)

    // Verify user has access to this team
    if (transaction.userId !== user.id) {
      return apiResponses.forbidden('Access denied')
    }

    await TransactionService.trackTransaction({
      ...transaction,
      status: 'pending'
    })

    return apiResponses.success({ tracked: true })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to track transaction')
  }
}
