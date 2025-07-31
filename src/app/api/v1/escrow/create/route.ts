import { NextRequest } from 'next/server'

import { timeConstants } from '@/config/app-routes'
import {
  tradeConstants,
  validationConstants
} from '@/config/business-constants'
import { getEscrowCoreAddress, DEFAULT_CHAIN_ID } from '@/lib/blockchain'
import { createEscrow } from '@/lib/db/queries/escrow'
import { getUserByWalletAddress } from '@/lib/db/queries/users'
import {
  withApiAuth,
  createApiErrorResponse,
  createApiSuccessResponse
} from '@/lib/middleware/api-auth'

export async function POST(request: NextRequest) {
  // Authenticate API request
  const auth = await withApiAuth(request, 'escrow:write')

  if (!auth.authorized) {
    return createApiErrorResponse(auth.error || 'Unauthorized', 401)
  }

  try {
    const body = await request.json()
    const { seller, amount, disputeWindow, metadata, chainId, currency } = body

    // Validate required fields
    if (!seller || !amount) {
      return createApiErrorResponse(
        'Missing required fields: seller and amount',
        400
      )
    }

    // Validate seller address
    if (!validationConstants.ETHEREUM_ADDRESS_REGEX.test(seller)) {
      return createApiErrorResponse('Invalid seller address', 400)
    }

    // Validate amount
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return createApiErrorResponse('Invalid amount', 400)
    }

    if (amountNum > tradeConstants.MAX_TRADE_AMOUNT) {
      return createApiErrorResponse('Amount exceeds maximum limit', 400)
    }

    // Validate dispute window if provided
    if (disputeWindow !== undefined) {
      if (
        typeof disputeWindow !== 'number' ||
        disputeWindow < timeConstants.HOUR / 1000 ||
        disputeWindow > (30 * timeConstants.DAY) / 1000
      ) {
        return createApiErrorResponse(
          'Dispute window must be between 1 hour and 30 days (in seconds)',
          400
        )
      }
    }

    // Get seller user from database
    const sellerUser = await getUserByWalletAddress(seller)
    if (!sellerUser) {
      return createApiErrorResponse('Seller not found in system', 404)
    }

    // Use the chain ID from request or default
    const escrowChainId = chainId || DEFAULT_CHAIN_ID

    // Get contract address for the chain
    const contractAddress = getEscrowCoreAddress(escrowChainId) || ''

    // Create escrow in database
    const escrowData = await createEscrow({
      buyerId: auth.context!.userId,
      sellerId: sellerUser.id,
      amount: amount.toString(),
      currency: currency || 'ETH',
      chainId: escrowChainId,
      contractAddress: contractAddress,
      disputeWindow: disputeWindow || timeConstants.DAY / 1000, // Default 24 hours in seconds
      metadata: metadata || null,
      teamId: auth.context!.teamId
    })

    return createApiSuccessResponse(
      {
        escrow: {
          id: escrowData.id,
          buyer: escrowData.buyer,
          seller: escrowData.seller,
          amount: escrowData.amount,
          disputeWindow: escrowData.disputeWindow,
          metadata: escrowData.metadata,
          status: escrowData.status,
          createdAt: escrowData.createdAt.toISOString(),
          transactionHash: null,
          chainId: escrowChainId,
          contractAddress
        },
        instructions: {
          fundingAddress: contractAddress,
          requiredAmount: amount,
          message:
            'Send the exact amount to the funding address to activate the escrow'
        }
      },
      201
    )
  } catch (error: any) {
    console.error('Error creating escrow:', error)
    return createApiErrorResponse(
      error.message || 'Failed to create escrow',
      500
    )
  }
}
