import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth/auth-utils'
import { getBattleStats } from '@/services/battle'

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { user, error } = await requireAuth()
    if (error) {
      return error
    }

    const params = await context.params
    const userId = parseInt(params.userId)

    // Only allow users to get their own stats unless admin
    if (user!.id !== userId && user!.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stats = await getBattleStats(userId)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting battle stats:', error)
    return NextResponse.json(
      { error: 'Failed to get battle stats' },
      { status: 500 }
    )
  }
}
