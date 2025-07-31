import { NextResponse } from 'next/server'

import { ZodError } from 'zod'

import { getSession } from '@/lib/auth/session'
import { createTradeSchema } from '@/lib/schemas/trade'
import { createTrade } from '@/services/trade'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validatedData = createTradeSchema.parse(body)

    // Get chainId from body or default to a configured chain
    const chainId = body.chainId || 1 // Default to mainnet if not provided

    // Create the trade
    const result = await createTrade({
      ...validatedData,
      buyerId: session.user.id,
      chainId
    })

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

    console.error('Error in POST /api/trades/create:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
