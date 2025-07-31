import { NextRequest, NextResponse } from 'next/server'

import { createPublicClient, http, formatEther } from 'viem'

import { withAdminAuth } from '@/lib/api/auth-middleware'
import {
  getEscrowCoreAddress,
  getViemChain,
  ESCROW_CORE_ABI
} from '@/lib/blockchain'

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

async function handler(
  req: NextRequest,
  _context: { session: any; params?: any }
) {
  try {
    const { searchParams } = new URL(req.url)
    const chainId = parseInt(searchParams.get('chainId') || '')
    const type = searchParams.get('type') || 'active' // 'active' or 'disputed'
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')

    const contractAddress = getEscrowCoreAddress(chainId)
    const chain = getViemChain(chainId)

    if (!contractAddress || !chain) {
      return NextResponse.json(
        {
          type: 'configuration_error',
          error: 'Smart contract not configured for this network',
          chainId,
          chainName: chain?.name || `Chain ${chainId}`
        },
        { status: 404 }
      )
    }

    // Create public client for reading contract
    const publicClient = createPublicClient({
      chain,
      transport: http()
    })

    let escrowIds: readonly bigint[] = []
    let totalCount = 0

    if (type === 'disputed') {
      // Get disputed escrows
      escrowIds = (await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ESCROW_CORE_ABI,
        functionName: 'getDisputedEscrows'
      })) as readonly bigint[]
      totalCount = escrowIds.length
    } else {
      // Get active escrows with pagination
      const result = (await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ESCROW_CORE_ABI,
        functionName: 'getActiveEscrows',
        args: [BigInt(offset), BigInt(limit)]
      })) as readonly [readonly bigint[], bigint]
      escrowIds = result[0]
      totalCount = Number(result[1])
    }

    // Fetch details for each escrow
    const escrowDetailsPromises = escrowIds.map(id =>
      publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ESCROW_CORE_ABI,
        functionName: 'getEscrowDetails',
        args: [id]
      })
    )

    const escrowDetails = await Promise.all(escrowDetailsPromises)
    const nativeCurrency = chain.nativeCurrency.symbol

    const escrows = escrowDetails.map((details, index) => {
      const d = details as readonly [
        string,
        string,
        bigint,
        bigint,
        number,
        bigint,
        bigint,
        bigint,
        string
      ]
      return {
        escrowId: Number(escrowIds[index]),
        buyer: d[0],
        seller: d[1],
        amount: formatEther(d[2]),
        fee: formatEther(d[3]),
        status: EscrowStatus[d[4] as keyof typeof EscrowStatus],
        statusCode: d[4],
        createdAt: new Date(Number(d[5]) * 1000).toISOString(),
        fundedAt:
          d[6] > 0n ? new Date(Number(d[6]) * 1000).toISOString() : null,
        disputeWindow: Number(d[7]),
        metadata: d[8],
        nativeCurrency
      }
    })

    return NextResponse.json({
      escrows,
      pagination: {
        offset,
        limit,
        total: totalCount,
        hasMore: offset + limit < totalCount
      },
      contractInfo: {
        address: contractAddress,
        chainId,
        chainName: chain.name
      }
    })
  } catch (error) {
    console.error('Error fetching escrow list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch escrow data' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
