import type { PaginationParams } from '@/types/api'

import { apiResponses } from './server-utils'

export type SortOrder = 'asc' | 'desc'

export interface StandardRouteParams extends PaginationParams {
  role?: string
  [key: string]: any
}

/**
 * Extract pagination parameters from URL search params
 */
export function extractPaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    search: searchParams.get('search') || undefined,
    orderBy: searchParams.get('orderBy') || undefined,
    orderDirection: (searchParams.get('orderDirection') as SortOrder) || 'desc'
  }
}

/**
 * Extract standard route parameters including pagination
 */
export function extractStandardRouteParams(
  searchParams: URLSearchParams
): StandardRouteParams {
  return {
    ...extractPaginationParams(searchParams),
    role: searchParams.get('role') || undefined
  }
}

/**
 * Admin route handler with standard parameters
 */
export function withAdminStandardRoute<T>(
  handler: (params: StandardRouteParams) => Promise<T>,
  errorMessage = 'Request failed'
) {
  const { withAdmin } = require('@/lib/auth/auth-utils')
  return withAdmin(async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const params = extractStandardRouteParams(searchParams)
      const result = await handler(params)
      return apiResponses.success(result)
    } catch (error) {
      return apiResponses.handleError(error, errorMessage)
    }
  })
}
