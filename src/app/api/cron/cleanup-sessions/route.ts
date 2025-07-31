import { NextRequest } from 'next/server'

import { envServer } from '@/config/env.server'
import { apiResponses } from '@/lib/api/server-utils'
import { cleanupExpiredSessions } from '@/lib/db/queries/sessions'

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = envServer.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return apiResponses.unauthorized('Invalid cron secret')
  }

  try {
    // Clean up expired sessions
    await cleanupExpiredSessions()

    return apiResponses.success({
      message: 'Expired sessions cleaned up successfully'
    })
  } catch (error) {
    console.error('Error cleaning up sessions:', error)
    return apiResponses.error('Failed to clean up sessions')
  }
}
