import { NextResponse } from 'next/server'

import { eq, and, gte } from 'drizzle-orm'

import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { battleQueue } from '@/lib/db/schema'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's queue entry
    const [queueEntry] = await db
      .select({
        queuePosition: battleQueue.queuePosition,
        estimatedWaitTime: battleQueue.estimatedWaitTime,
        status: battleQueue.status
      })
      .from(battleQueue)
      .where(
        and(
          eq(battleQueue.userId, session.user.id),
          eq(battleQueue.status, 'searching'),
          gte(battleQueue.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!queueEntry) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        queuePosition: queueEntry.queuePosition || 1,
        estimatedWaitTime: queueEntry.estimatedWaitTime || 10,
        status: queueEntry.status
      }
    })
  } catch (error) {
    console.error('Error in GET /api/battles/queue-info:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
