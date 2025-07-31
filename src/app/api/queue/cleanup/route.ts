import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { queueManager } from '@/lib/queue/manager'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin (you'll need to fetch user data from DB)
    const { users } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { db } = await import('@/lib/db/drizzle')

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Clean up old completed/failed jobs
    await queueManager.cleanup()

    return NextResponse.json({
      success: true,
      message: 'Queue cleanup completed'
    })
  } catch (error) {
    console.error('Error in POST /api/queue/cleanup:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
