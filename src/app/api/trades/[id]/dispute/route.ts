import { NextResponse } from 'next/server'

import { ZodError } from 'zod'

import { getSession } from '@/lib/auth/session'
import { disputeTradeSchema } from '@/lib/schemas/trade'
import { disputeTrade } from '@/services/trade'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const session = await getSession()
    if (!session) {
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

    // Validate input
    const validatedData = disputeTradeSchema.parse({
      ...body,
      tradeId
    })

    // Raise dispute
    const result = await disputeTrade(validatedData, session.user.id)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Error in POST /api/trades/[id]/dispute:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
