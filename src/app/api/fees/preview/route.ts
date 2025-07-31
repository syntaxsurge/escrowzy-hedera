import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { getFeePreview } from '@/services/fee'

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
    const amountStr = searchParams.get('amount')

    if (!amountStr) {
      return NextResponse.json(
        { success: false, error: 'Amount parameter is required' },
        { status: 400 }
      )
    }

    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Calculate fee preview
    const feePreview = await getFeePreview(session.user.id, amount)

    return NextResponse.json({
      success: true,
      data: feePreview
    })
  } catch (error) {
    console.error('Error in GET /api/fees/preview:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
