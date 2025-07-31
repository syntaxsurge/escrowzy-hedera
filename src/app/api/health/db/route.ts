import { apiResponses } from '@/lib/api/server-utils'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Test actual table access
    await db.select().from(users).limit(1)

    return apiResponses.success({
      status: 'healthy',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database health check failed:', error)

    // Check for specific Supabase error
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    return apiResponses.error(`Database unhealthy: ${errorMessage}`, 503)
  }
}
