import { NextResponse } from 'next/server'

import { desc } from 'drizzle-orm'

import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { jobQueue } from '@/lib/db/schema'
import { queueManager } from '@/lib/queue/manager'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get queue statistics
    const stats = await queueManager.getStats()

    // Get recent jobs
    const recentJobs = await db
      .select()
      .from(jobQueue)
      .orderBy(desc(jobQueue.createdAt))
      .limit(20)

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentJobs: recentJobs.map(job => ({
          id: job.id,
          type: job.type,
          status: job.status,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          scheduledAt: job.scheduledAt,
          availableAt: job.availableAt,
          processedAt: job.processedAt,
          completedAt: job.completedAt,
          failedAt: job.failedAt,
          error: job.error,
          createdAt: job.createdAt
        }))
      }
    })
  } catch (error) {
    console.error('Error in GET /api/queue/stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
