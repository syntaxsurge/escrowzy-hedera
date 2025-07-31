import { NextRequest } from 'next/server'

import { envServer } from '@/config/env.server'
import { apiResponses } from '@/lib/api/server-utils'
import { processExpiredSubscriptions } from '@/services/subscription'

// This endpoint should be called periodically (e.g., every hour) by a cron job service
// like Vercel Cron Jobs, GitHub Actions, or an external service
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = envServer.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return apiResponses.unauthorized()
    }

    // Process all expired subscriptions
    const result = await processExpiredSubscriptions()

    return apiResponses.success({
      success: true,
      processed: result.processed,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return apiResponses.handleError(
      error,
      'Failed to process expired subscriptions'
    )
  }
}
