import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { cancelTradeSchema } from '@/lib/schemas/trade'
import { cancelTrade } from '@/services/trade'

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
    const validatedData = cancelTradeSchema.parse({
      tradeId,
      reason: body.reason
    })

    const result = await cancelTrade(
      validatedData.tradeId,
      session.user.id,
      validatedData.reason
    )

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error cancelling trade:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel trade'
      },
      { status: 500 }
    )
  }
}
