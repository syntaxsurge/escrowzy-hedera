import { NextResponse } from 'next/server'

import { z } from 'zod'

import { resolveDispute } from '@/lib/db/queries/admin-disputes'
import { checkAdminRole } from '@/services/user'

const resolveDisputeSchema = z.object({
  resolution: z.enum(['release_to_seller', 'refund_to_buyer', 'split']),
  notes: z.string().min(10, 'Notes must be at least 10 characters'),
  splitPercentage: z.number().min(0).max(100).optional()
})

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const isAdmin = await checkAdminRole()
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tradeId = parseInt(params.id)
    if (isNaN(tradeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid trade ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = resolveDisputeSchema.parse(body)

    // If split resolution, ensure percentage is provided
    if (
      validatedData.resolution === 'split' &&
      !validatedData.splitPercentage
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Split percentage required for split resolution'
        },
        { status: 400 }
      )
    }

    const updatedTrade = await resolveDispute(
      tradeId,
      validatedData.resolution,
      validatedData.notes,
      validatedData.splitPercentage
    )

    return NextResponse.json({
      success: true,
      trade: updatedTrade
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Error resolving dispute:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resolve dispute' },
      { status: 500 }
    )
  }
}
