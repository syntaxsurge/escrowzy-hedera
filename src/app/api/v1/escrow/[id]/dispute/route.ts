import { NextRequest } from 'next/server'

import {
  withApiAuth,
  createApiErrorResponse,
  createApiSuccessResponse
} from '@/lib/middleware/api-auth'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Authenticate API request
  const auth = await withApiAuth(request, 'escrow:write')

  if (!auth.authorized) {
    return createApiErrorResponse(auth.error || 'Unauthorized', 401)
  }

  try {
    const params = await context.params
    const escrowId = params.id
    const body = await request.json()
    const { reason, evidence } = body

    // Validate dispute data
    if (!reason) {
      return createApiErrorResponse('Dispute reason is required', 400)
    }

    // In production, create dispute on-chain
    // For now, return success response
    return createApiSuccessResponse({
      escrow: {
        id: escrowId,
        status: 'DISPUTED',
        disputedAt: new Date().toISOString()
      },
      dispute: {
        id: `dispute_${Date.now()}`,
        escrowId,
        reason,
        evidence: evidence || null,
        createdBy: auth.context!.userId,
        createdAt: new Date().toISOString(),
        status: 'PENDING_REVIEW'
      },
      message:
        'Dispute raised successfully. An arbitrator will review your case.'
    })
  } catch (error: any) {
    return createApiErrorResponse(
      error.message || 'Failed to raise dispute',
      500
    )
  }
}
