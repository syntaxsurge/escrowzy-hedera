import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { getActiveDiscount } from '@/services/battle'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let activeDiscount = null
    try {
      activeDiscount = await getActiveDiscount(session.user.id)
    } catch (discountError) {
      console.error('Error fetching active discount:', discountError)
      // Return no discount instead of failing the entire request
      activeDiscount = null
    }

    if (!activeDiscount) {
      return NextResponse.json({
        success: true,
        data: {
          hasDiscount: false,
          message: 'No active battle discount'
        }
      })
    }

    // Calculate time remaining
    const now = new Date()
    const timeRemaining = activeDiscount.expiresAt.getTime() - now.getTime()
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
    const minutesRemaining = Math.floor(
      (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
    )

    return NextResponse.json({
      success: true,
      data: {
        hasDiscount: true,
        discount: activeDiscount,
        timeRemaining: {
          hours: hoursRemaining,
          minutes: minutesRemaining,
          formatted: `${hoursRemaining}h ${minutesRemaining}m`
        }
      }
    })
  } catch (error) {
    console.error('Error in GET /api/battles/active-discount:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
