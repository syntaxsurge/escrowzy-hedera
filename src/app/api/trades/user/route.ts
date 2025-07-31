import { NextResponse } from 'next/server'

import { ZodError } from 'zod'

import { getSession } from '@/lib/auth/session'
import { getUserTradesSchema } from '@/lib/schemas/trade'
import { getUserTrades } from '@/services/trade'
import type { TradeStatus } from '@/types/listings'
import type { TradeFilters } from '@/types/trade'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')

    // Parse status - handle comma-separated values and special status groups
    let status: string | string[] | undefined = undefined
    if (statusParam) {
      // Handle special status groups
      if (statusParam === 'active') {
        // Active trades are those in progress
        status = [
          'created',
          'awaiting_deposit',
          'funded',
          'payment_sent',
          'delivered'
        ]
      } else if (statusParam === 'active,disputed') {
        // Active and disputed trades
        status = [
          'created',
          'awaiting_deposit',
          'funded',
          'payment_sent',
          'delivered',
          'disputed'
        ]
      } else if (statusParam === 'pending') {
        // Pending trades are those waiting for action
        status = ['created', 'awaiting_deposit', 'funded']
      } else if (statusParam === 'closed') {
        // Closed trades are those that are finished
        status = ['completed', 'cancelled']
      } else if (statusParam.includes(',')) {
        status = statusParam.split(',').map(s => s.trim())
      } else {
        status = statusParam
      }
    }

    const params = {
      role: searchParams.get('role') || 'both',
      status,
      chainId: searchParams.get('chainId')
        ? parseInt(searchParams.get('chainId')!)
        : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 20,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined
    }

    // Validate input
    const validatedParams = getUserTradesSchema.parse(params)

    // Build filters
    const filters: TradeFilters = {
      ...validatedParams,
      userId: session.user.id,
      status: validatedParams.status as TradeStatus | TradeStatus[] | undefined,
      startDate: validatedParams.startDate
        ? new Date(validatedParams.startDate)
        : undefined,
      endDate: validatedParams.endDate
        ? new Date(validatedParams.endDate)
        : undefined
    }

    // Get user's trades
    const result = await getUserTrades(session.user.id, filters)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Error in GET /api/trades/user:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
