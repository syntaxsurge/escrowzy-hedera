import { NextRequest, NextResponse } from 'next/server'

import { apiResponses } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'
import { findUserById } from '@/lib/db/queries/users'

type Session = {
  user: { id: number; walletAddress: string }
  expires: string
}

export type AuthenticatedHandler = (
  req: NextRequest,
  context: {
    session: Session
    params?: any
  }
) => Promise<NextResponse>

/**
 * Middleware wrapper that handles authentication for API routes
 * Automatically checks session and returns unauthorized if not authenticated
 */
export function withAuth(
  handler: AuthenticatedHandler
): (req: NextRequest, context: any) => Promise<NextResponse> {
  return async (req: NextRequest, context: any) => {
    try {
      const session = await getSession()

      if (!session) {
        return apiResponses.unauthorized('Authentication required')
      }

      return handler(req, { session, params: context?.params })
    } catch (error) {
      return apiResponses.handleError(error, 'Authentication error')
    }
  }
}

/**
 * Middleware wrapper for admin-only API routes
 */
export function withAdminAuth(
  handler: AuthenticatedHandler
): (req: NextRequest, context: any) => Promise<NextResponse> {
  return async (req: NextRequest, context: any) => {
    try {
      const session = await getSession()

      if (!session) {
        return apiResponses.unauthorized('Authentication required')
      }

      // Check if user has admin role
      const user = await findUserById(session.user.id)
      if (!user || user.role !== 'admin') {
        return apiResponses.forbidden('Admin access required')
      }

      return handler(req, { session, params: context?.params })
    } catch (error) {
      return apiResponses.handleError(error, 'Authentication error')
    }
  }
}
