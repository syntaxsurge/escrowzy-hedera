import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { getDailyBattleLimit } from '@/services/battle'

export async function GET(_request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dailyLimit = await getDailyBattleLimit(session.user.id)

    return NextResponse.json(dailyLimit)
  } catch (error) {
    console.error('Error getting daily battle limit:', error)
    return NextResponse.json(
      { error: 'Failed to get daily battle limit' },
      { status: 500 }
    )
  }
}
