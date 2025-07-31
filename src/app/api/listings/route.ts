import { NextRequest } from 'next/server'

import { apiResponses } from '@/lib/api/server-utils'
import { getListingsQuerySchema } from '@/lib/schemas/listings'
import { getActiveListings } from '@/services/listings'

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const queryObject = {
      listingType: searchParams.get('listingType') || undefined,
      tokenOffered: searchParams.get('tokenOffered') || undefined,
      minAmount: searchParams.get('minAmount') || undefined,
      maxAmount: searchParams.get('maxAmount') || undefined,
      paymentMethod: searchParams.get('paymentMethod') || undefined,
      userId: searchParams.get('userId') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined
    }

    // Remove undefined values
    const cleanedQuery = Object.fromEntries(
      Object.entries(queryObject).filter(([_, v]) => v !== undefined)
    )

    // Validate query parameters
    const validationResult = getListingsQuerySchema.safeParse(cleanedQuery)

    if (!validationResult.success) {
      return apiResponses.badRequest('Invalid query parameters')
    }

    const query = validationResult.data

    // Get listings
    const result = await getActiveListings(query)

    // Calculate pagination metadata
    const { page = 1, limit = 20 } = query
    const totalPages = Math.ceil(result.total / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return apiResponses.success({
      listings: result.listings,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    })
  } catch (error) {
    console.error('Error fetching listings:', error)
    return apiResponses.error('Failed to fetch listings')
  }
}
