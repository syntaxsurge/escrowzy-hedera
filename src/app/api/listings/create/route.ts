import { NextRequest } from 'next/server'

import { eq, and, gte, or, isNull } from 'drizzle-orm'

import { apiResponses } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { userSubscriptions } from '@/lib/db/schema'
import { createListingSchema } from '@/lib/schemas/listings'
import { createListing, canUserCreateListing } from '@/services/listings'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return apiResponses.unauthorized('Please sign in to create a listing')
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createListingSchema.safeParse(body)

    if (!validationResult.success) {
      return apiResponses.badRequest('Invalid input')
    }

    const input = validationResult.data

    // Get user's subscription tier
    const userSub = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, session.user.id),
          eq(userSubscriptions.isActive, true),
          or(
            isNull(userSubscriptions.subscriptionExpiresAt),
            gte(userSubscriptions.subscriptionExpiresAt, new Date())
          )
        )
      )
      .limit(1)

    const subscriptionTier =
      userSub.length > 0
        ? userSub[0].planId === 'enterprise'
          ? 'enterprise'
          : userSub[0].planId === 'pro'
            ? 'pro'
            : 'free'
        : 'free'

    // Check if user can create more listings
    const canCreate = await canUserCreateListing(
      session.user.id,
      subscriptionTier
    )

    if (!canCreate.canCreate) {
      return apiResponses.forbidden(canCreate.reason || 'Cannot create listing')
    }

    // Create the listing (works for both P2P and domain)
    const listing = await createListing(session.user.id, input)

    return apiResponses.success({
      listing,
      message:
        input.listingCategory === 'domain'
          ? 'Domain listing created successfully'
          : 'Listing created successfully'
    })
  } catch (error) {
    return apiResponses.error(`Failed to create listing: ${error}`)
  }
}
