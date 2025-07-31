import { NextRequest } from 'next/server'

import { apiResponses } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'
import { updateListingSchema } from '@/lib/schemas/listings'
import { updateListing, deactivateListing } from '@/services/listings'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return apiResponses.unauthorized('Please sign in to update a listing')
    }

    // Parse listing ID
    const { id } = await context.params
    const listingId = parseInt(id)
    if (isNaN(listingId)) {
      return apiResponses.badRequest('Invalid listing ID')
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateListingSchema.safeParse(body)

    if (!validationResult.success) {
      return apiResponses.badRequest('Invalid input')
    }

    const input = validationResult.data

    // Update the listing
    const updatedListing = await updateListing(
      listingId,
      session.user.id,
      input
    )

    if (!updatedListing) {
      return apiResponses.notFound(
        'Listing not found or you do not have permission to update it'
      )
    }

    return apiResponses.success({
      listing: updatedListing,
      message: 'Listing updated successfully'
    })
  } catch (error) {
    console.error('Error updating listing:', error)
    return apiResponses.error('Failed to update listing')
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return apiResponses.unauthorized('Please sign in to delete a listing')
    }

    // Parse listing ID
    const { id } = await context.params
    const listingId = parseInt(id)
    if (isNaN(listingId)) {
      return apiResponses.badRequest('Invalid listing ID')
    }

    // Deactivate the listing
    const success = await deactivateListing(listingId, session.user.id)

    if (!success) {
      return apiResponses.notFound(
        'Listing not found or you do not have permission to delete it'
      )
    }

    return apiResponses.success({
      success: true,
      message: 'Listing deactivated successfully'
    })
  } catch (error) {
    console.error('Error deactivating listing:', error)
    return apiResponses.error('Failed to deactivate listing')
  }
}
