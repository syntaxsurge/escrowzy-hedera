import { NextRequest } from 'next/server'

import { apiResponses } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'
import { deleteListing } from '@/services/listings'

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

    // Delete the listing
    const success = await deleteListing(listingId, session.user.id)

    if (!success) {
      return apiResponses.notFound(
        'Listing not found or you do not have permission to delete it'
      )
    }

    return apiResponses.success({ message: 'Listing deleted successfully' })
  } catch (error: any) {
    if (error.message === 'Cannot delete listing with active trades') {
      return apiResponses.badRequest('Cannot delete listing with active trades')
    }

    console.error('Delete listing error:', error)
    return apiResponses.error('Failed to delete listing')
  }
}
