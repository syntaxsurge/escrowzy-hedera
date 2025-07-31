import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { getTradeStats } from '@/services/trade'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get trade statistics for the user
    const stats = await getTradeStats(session.user.id)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error in GET /api/trades/stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
