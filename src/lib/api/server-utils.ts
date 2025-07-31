import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { serverConfig } from '@/config/business-constants'
import { envPublic } from '@/config/env.public'
import { envServer } from '@/config/env.server'

/**
 * Server-side fetch options
 */
interface ServerFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
}

/**
 * Get server URL for server-side fetch operations
 * Handles both development and production environments
 *
 * @returns Base server URL
 */
async function getServerUrl(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') || serverConfig.defaultHost

  if (envPublic.NEXT_PUBLIC_APP_URL) {
    return envPublic.NEXT_PUBLIC_APP_URL
  }

  // Improved protocol detection
  const forwardedProto = headersList.get('x-forwarded-proto')
  const forwardedHost = headersList.get('x-forwarded-host') || host

  // Check various indicators for HTTPS
  const isSecure =
    forwardedProto === 'https' ||
    headersList.get('x-forwarded-ssl') === 'on' ||
    headersList.get('x-forwarded-port') === '443' ||
    (!forwardedProto &&
      !host.includes('localhost') &&
      !host.includes(serverConfig.localhostIp))

  const protocol = isSecure ? 'https' : serverConfig.defaultProtocol
  return `${protocol}://${forwardedHost}`
}

/**
 * Server-side fetch utility
 * Automatically resolves URLs and forwards cookies
 *
 * @param path - API path (can start with or without /)
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function serverFetch<T = any>(
  path: string,
  options: ServerFetchOptions = {}
): Promise<T> {
  const baseUrl = await getServerUrl()
  const headersList = await headers()

  const url = path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Cookie: headersList.get('cookie') || '',
      ...options.headers
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch: ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

/**
 * Centralized API response utilities for route handlers
 * Provides consistent response formats across all API routes
 *
 * @example
 * // In an API route handler
 * export async function GET() {
 *   try {
 *     const data = await fetchData()
 *     return apiResponses.success(data)
 *   } catch (error) {
 *     return apiResponses.handleError(error, 'Failed to fetch data')
 *   }
 * }
 */
export const apiResponses = {
  /**
   * Generic error response
   * @param message - Error message
   * @param status - HTTP status code (default: 500)
   */
  error: (message: string, status: number = 500) =>
    NextResponse.json({ error: message }, { status }),

  /**
   * Success response with data
   * @param data - Response data
   * @param status - HTTP status code (default: 200)
   */
  success: <T = any>(data: T, status: number = 200) =>
    NextResponse.json(data, { status }),

  /**
   * Validation error for missing required fields
   * @param fields - Array of missing field names
   */
  validationError: (fields: string[]) =>
    NextResponse.json(
      { error: `Missing required fields: ${fields.join(', ')}` },
      { status: 400 }
    ),

  /**
   * Handle and log errors consistently
   * @param error - Error object
   * @param message - User-friendly error message
   */
  handleError: (error: unknown, message: string) => {
    console.error(message, error)
    const errorMessage =
      envServer.NODE_ENV === 'development' && error instanceof Error
        ? `${message}: ${error.message}`
        : message
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  },

  /**
   * Common authentication responses
   */
  unauthorized: (message = 'Unauthorized - Authentication required') =>
    NextResponse.json({ error: message }, { status: 401 }),

  forbidden: (message = 'Forbidden - Insufficient permissions') =>
    NextResponse.json({ error: message }, { status: 403 }),

  notFound: (resource = 'Resource') =>
    NextResponse.json({ error: `${resource} not found` }, { status: 404 }),

  /**
   * Rate limiting response
   */
  rateLimited: (message = 'Too many requests') =>
    NextResponse.json({ error: message }, { status: 429 }),

  /**
   * Too many requests response (alias for rateLimited)
   */
  tooManyRequests: (message = 'Too many requests') =>
    NextResponse.json({ error: message }, { status: 429 }),

  /**
   * Method not allowed response
   */
  methodNotAllowed: (allowed: string[]) =>
    NextResponse.json(
      { error: 'Method not allowed' },
      {
        status: 405,
        headers: { Allow: allowed.join(', ') }
      }
    ),

  /**
   * Bad request response
   */
  badRequest: (message = 'Bad request') =>
    NextResponse.json({ error: message }, { status: 400 }),

  /**
   * Created response (201)
   */
  created: <T = any>(data: T) => NextResponse.json(data, { status: 201 }),

  /**
   * No content response (204)
   */
  noContent: () => new NextResponse(null, { status: 204 }),

  /**
   * Accepted response (202)
   */
  accepted: <T = any>(data?: T) =>
    NextResponse.json(data || { message: 'Request accepted' }, { status: 202 })
}

/**
 * Wrap async route handlers with consistent error handling
 *
 * @param handler - Async route handler function
 * @returns Wrapped handler with error handling
 *
 * @example
 * export const GET = withErrorHandler(async (request) => {
 *   const data = await riskyOperation()
 *   return apiResponses.success(data)
 * })
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return apiResponses.handleError(error, 'An unexpected error occurred')
    }
  }
}
