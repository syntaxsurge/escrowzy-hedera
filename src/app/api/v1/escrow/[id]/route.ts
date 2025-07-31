import { NextRequest } from 'next/server'

import { getEscrowCoreAddress } from '@/lib/blockchain'
import { getEscrowById } from '@/lib/db/queries/escrow'
import {
  withApiAuth,
  createApiErrorResponse,
  createApiSuccessResponse
} from '@/lib/middleware/api-auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Authenticate API request
  const auth = await withApiAuth(request, 'escrow:read')

  if (!auth.authorized) {
    return createApiErrorResponse(auth.error || 'Unauthorized', 401)
  }

  try {
    const params = await context.params
    const escrowId = params.id

    // Fetch escrow data from database
    const escrowData = await getEscrowById(escrowId)

    if (!escrowData) {
      return createApiErrorResponse('Escrow not found', 404)
    }

    // Add contract address based on chain
    const contractAddress = getEscrowCoreAddress(escrowData.chainId) || ''

    return createApiSuccessResponse({
      escrow: {
        ...escrowData,
        transactionHash: escrowData.metadata?.transactionHash || null,
        contractAddress
      }
    })
  } catch (error: any) {
    console.error('Error fetching escrow:', error)
    return createApiErrorResponse(
      error.message || 'Failed to fetch escrow',
      500
    )
  }
}
