import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { okxDexClient } from '@/lib/api/okx-dex-client'
import { getSession } from '@/lib/auth/session'
import type { OKXApproveRequest } from '@/types/okx-dex'

const ApproveRequestSchema = z.object({
  chainId: z.number(),
  tokenAddress: z.string(),
  amount: z.string()
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = ApproveRequestSchema.parse(body)

    const approveRequest: OKXApproveRequest = {
      chainIndex: validatedData.chainId.toString(),
      tokenContractAddress: validatedData.tokenAddress,
      approveAmount: validatedData.amount
    }

    const approveData = await okxDexClient.getApproveTransaction(approveRequest)

    if (!approveData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate approve transaction'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      approveData
    })
  } catch (error) {
    console.error('Approve API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate approve transaction'
      },
      { status: 500 }
    )
  }
}
