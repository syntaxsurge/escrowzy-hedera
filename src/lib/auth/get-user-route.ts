import 'server-only'
import { cookies } from 'next/headers'

import { eq } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { validateSession } from '@/lib/db/queries/sessions'
import { users } from '@/lib/db/schema'

import { clearSessionCookie } from './cookie-utils'
import { verifyToken } from './session'

/**
 * Get user for Route Handlers - can clear invalid cookies
 * Use this in API routes where cookie modification is allowed
 */
export async function getUserForRoute() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie || !sessionCookie.value) {
    return null
  }

  let sessionData
  try {
    sessionData = await verifyToken(sessionCookie.value)
  } catch (_error) {
    // Invalid JWT - clear the cookie in route handler
    await clearSessionCookie()
    return null
  }

  // Validate session structure
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number' ||
    !sessionData.sessionToken ||
    !sessionData.expires
  ) {
    await clearSessionCookie()
    return null
  }

  // Check JWT expiry
  if (new Date(sessionData.expires) < new Date()) {
    await clearSessionCookie()
    return null
  }

  try {
    // Validate session exists in database and is not expired
    const dbSession = await validateSession(sessionData.sessionToken)
    if (!dbSession) {
      // Session doesn't exist in DB or is expired - clear cookie
      await clearSessionCookie()
      return null
    }

    // Check if user ID matches
    if (dbSession.userId !== sessionData.user.id) {
      await clearSessionCookie()
      return null
    }

    // Get user from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionData.user.id))
      .limit(1)

    if (user.length === 0) {
      // User doesn't exist - clear session
      await clearSessionCookie()
      return null
    }

    // Return the user data
    return user[0]
  } catch (error) {
    // Database error - fail closed (deny access)
    console.error('Session validation error in route:', error)
    return null
  }
}
