/**
 * URL and API utility functions
 */

/**
 * Check if a path is an API endpoint
 */
export const isApiPath = (path: string): boolean => {
  return path.includes('/api/')
}

/**
 * Build API URLs with query params
 */
export function buildApiUrl(
  endpoint: string,
  params?: Record<string, any>
): string {
  if (!params) return endpoint

  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${endpoint}?${queryString}` : endpoint
}

/**
 * Parse query params from URL
 */
export function parseQueryParams(url: string): Record<string, string> {
  const searchParams = new URLSearchParams(url.split('?')[1] || '')
  const params: Record<string, string> = {}

  searchParams.forEach((value, key) => {
    params[key] = value
  })

  return params
}

/**
 * Remove query params from URL
 */
export function removeQueryParams(url: string): string {
  return url.split('?')[0]
}

/**
 * Check if URL is external
 */
export function isExternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname !== window.location.hostname
  } catch {
    // If it's not a valid URL (relative path), it's not external
    return false
  }
}
