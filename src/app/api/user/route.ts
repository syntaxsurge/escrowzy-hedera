import { eq } from 'drizzle-orm'

import { apiResponses } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { users, emailVerificationRequests } from '@/lib/db/schema'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return apiResponses.success({ user: null })
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!user.length) {
    return apiResponses.success({ user: null })
  }

  // Get pending email verification request
  const pendingEmailRequest = await db
    .select()
    .from(emailVerificationRequests)
    .where(eq(emailVerificationRequests.userId, session.user.id))
    .limit(1)

  // Return user with pending email if exists
  const userWithPendingEmail = {
    ...user[0],
    pendingEmail:
      pendingEmailRequest.length > 0 ? pendingEmailRequest[0].email : null
  }

  return apiResponses.success({ user: userWithPendingEmail })
}
