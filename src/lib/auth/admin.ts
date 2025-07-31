import { requireAdmin } from './auth-utils'

/**
 * Authenticate admin request for API routes
 * Returns user data and admin status
 */
export async function authenticateAdminRequest(_request: Request) {
  const { user, error } = await requireAdmin()

  if (error || !user) {
    return {
      isAdmin: false,
      user: null,
      error: error || 'Authentication required'
    }
  }

  return {
    isAdmin: true,
    user,
    error: null
  }
}
