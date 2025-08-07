import { withAdminAuth } from '@/lib/api/auth-middleware'
import { withEscrowValidation } from '@/lib/blockchain/contract-validation'
import { formatNativeAmount } from '@/lib/utils/token-helpers'

// Escrow Status Enum
const EscrowStatus = {
  0: 'CREATED',
  1: 'FUNDED',
  2: 'DELIVERED',
  3: 'CONFIRMED',
  4: 'DISPUTED',
  5: 'REFUNDED',
  6: 'CANCELLED',
  7: 'COMPLETED'
} as const

// Handler wrapped with both admin auth and escrow validation
const handler = withEscrowValidation(
  async ({ escrowService, chainId }, request: Request) => {
    const { searchParams } = new URL(request.url)
    const _type = searchParams.get('type') || 'active' // 'active' or 'disputed'
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get active escrows using the service
    const escrowIds = await escrowService.getActiveEscrows()
    const totalCount = escrowIds.length

    // Apply pagination
    const paginatedIds = escrowIds.slice(offset, offset + limit)

    // Fetch details for each escrow using the service
    const escrowDetailsPromises = paginatedIds.map(id =>
      escrowService.getEscrowDetails(id)
    )

    const escrowDetails = await Promise.all(escrowDetailsPromises)
    const contractInfo = await escrowService.getContractInfo()

    const escrows = escrowDetails.map((details, index) => {
      return {
        escrowId: paginatedIds[index],
        buyer: details.buyer,
        seller: details.seller,
        amount: formatNativeAmount(details.amount, chainId),
        fee: formatNativeAmount(details.fee, chainId),
        status: EscrowStatus[details.status as keyof typeof EscrowStatus],
        statusCode: details.status,
        createdAt: new Date(Number(details.createdAt) * 1000).toISOString(),
        fundedAt:
          details.fundedAt > 0n
            ? new Date(Number(details.fundedAt) * 1000).toISOString()
            : null,
        disputeWindow: Number(details.disputeWindow),
        metadata: details.metadata,
        nativeCurrency: contractInfo.nativeCurrency
      }
    })

    return {
      escrows,
      pagination: {
        offset,
        limit,
        total: totalCount,
        hasMore: offset + limit < totalCount
      },
      contractInfo: {
        address: contractInfo.address,
        chainId,
        chainName: contractInfo.chainName
      }
    }
  }
)

export const GET = withAdminAuth(handler as any)
