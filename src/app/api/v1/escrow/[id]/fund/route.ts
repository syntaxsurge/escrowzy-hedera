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
    const { transactionHash } = body

    // Validate transaction hash
    if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return createApiErrorResponse('Invalid transaction hash', 400)
    }

    // In production, verify the transaction on-chain
    // For now, return success response
    return createApiSuccessResponse({
      escrow: {
        id: escrowId,
        status: 'FUNDED',
        fundedAt: new Date().toISOString(),
        transactionHash
      },
      message: 'Escrow funded successfully'
    })
  } catch (error: any) {
    return createApiErrorResponse(error.message || 'Failed to fund escrow', 500)
  }
}
