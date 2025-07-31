import { cookies } from 'next/headers'

import { apiResponses } from '@/lib/api/server-utils'
import { clearSession, verifyToken } from '@/lib/auth/session'
import { deleteSession } from '@/lib/db/queries/sessions'

export async function POST() {
  try {
    // Get session token from cookie to delete from database
    const sessionCookie = (await cookies()).get('session')

    if (sessionCookie?.value) {
      try {
        const sessionData = await verifyToken(sessionCookie.value)
        if (sessionData?.sessionToken) {
          // Delete session from database
          await deleteSession(sessionData.sessionToken)
        }
      } catch (error) {
        // Session might be invalid, continue with logout
        console.error('Error deleting session from database:', error)
      }
    }

    // Clear the session cookie
    await clearSession()

    return apiResponses.success({ success: true })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to sign out')
  }
}
