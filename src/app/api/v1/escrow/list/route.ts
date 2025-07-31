import { NextRequest } from 'next/server'

import { listEscrows } from '@/lib/db/queries/escrow'
import {
  withApiAuth,
  createApiErrorResponse,
  createApiSuccessResponse
} from '@/lib/middleware/api-auth'

export async function GET(request: NextRequest) {
  // Authenticate API request
  const auth = await withApiAuth(request, 'escrow:read')

  if (!auth.authorized) {
    return createApiErrorResponse(auth.error || 'Unauthorized', 401)
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const buyer = searchParams.get('buyer')
    const seller = searchParams.get('seller')
    const chainId = searchParams.get('chainId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate parameters
    if (limit > 100) {
      return createApiErrorResponse('Maximum limit is 100', 400)
    }

    if (limit < 1) {
      return createApiErrorResponse('Minimum limit is 1', 400)
    }

    if (offset < 0) {
      return createApiErrorResponse('Offset must be non-negative', 400)
    }

    // Validate wallet addresses if provided
    if (buyer && !/^0x[a-fA-F0-9]{40}$/.test(buyer)) {
      return createApiErrorResponse('Invalid buyer address', 400)
    }

    if (seller && !/^0x[a-fA-F0-9]{40}$/.test(seller)) {
      return createApiErrorResponse('Invalid seller address', 400)
    }

    // Fetch escrows from database
    const result = await listEscrows({
      status: status || undefined,
      buyer: buyer || undefined,
      seller: seller || undefined,
      chainId: chainId ? parseInt(chainId) : undefined,
      limit,
      offset
    })

    return createApiSuccessResponse({
      escrows: result.escrows.map(escrow => ({
        id: escrow.id,
        buyer: escrow.buyer,
        seller: escrow.seller,
        amount: escrow.amount,
        status: escrow.status,
        createdAt: escrow.createdAt.toISOString(),
        metadata: escrow.metadata || ''
      })),
      pagination: result.pagination
    })
  } catch (error: any) {
    console.error('Error fetching escrows:', error)
    return createApiErrorResponse(
      error.message || 'Failed to fetch escrows',
      500
    )
  }
}
