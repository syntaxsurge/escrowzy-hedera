import { NextRequest } from 'next/server'

import { eq } from 'drizzle-orm'

import { apiResponses } from '@/lib/api/server-utils'
import { db } from '@/lib/db/drizzle'
import { teamInvitations } from '@/lib/db/schema'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Delete the invitation
    const result = await db
      .delete(teamInvitations)
      .where(eq(teamInvitations.token, token))
      .returning({ id: teamInvitations.id })

    if (!result.length) {
      return apiResponses.notFound('Invitation')
    }

    return apiResponses.success({
      success: true,
      message: 'Invitation declined successfully'
    })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to decline invitation')
  }
}
