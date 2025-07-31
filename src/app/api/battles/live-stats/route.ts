import { NextResponse } from 'next/server'

import { getBattleStats } from '@/lib/db/queries/battles'

export async function GET() {
  try {
    const stats = await getBattleStats()

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error: any) {
    console.error('Error fetching live battle stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch live battle statistics'
      },
      { status: 500 }
    )
  }
}
