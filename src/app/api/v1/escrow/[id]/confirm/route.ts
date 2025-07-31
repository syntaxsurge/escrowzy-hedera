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
    // const body = await request.json()
    // const { signature, message } = body

    // In production, verify signature and execute on-chain
    // For now, return success response
    return createApiSuccessResponse({
      escrow: {
        id: escrowId,
        status: 'CONFIRMED',
        confirmedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      },
      message: 'Delivery confirmed and funds released to seller'
    })
  } catch (error: any) {
    return createApiErrorResponse(
      error.message || 'Failed to confirm delivery',
      500
    )
  }
}
