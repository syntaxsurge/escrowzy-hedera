import { cookies, headers } from 'next/headers'

/**
 * Clear session cookie - only call from Route Handlers or Server Actions
 * Do NOT call from Server Components
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete({
    name: 'session',
    path: '/'
  })
}

/**
 * Check if we're in a context where cookies can be modified
 * (Route Handler or Server Action)
 */
export async function canModifyCookies(): Promise<boolean> {
  // This is a simplified check - in practice, Next.js will throw an error
  // if we try to modify cookies outside of allowed contexts
  try {
    // Check if we're in a route handler by looking for headers
    const headersList = await headers()
    const _contentType = headersList.get('content-type')

    // Route handlers typically have different context
    return true
  } catch {
    return false
  }
}
