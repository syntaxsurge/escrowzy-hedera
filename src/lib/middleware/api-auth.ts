import { NextRequest, NextResponse } from 'next/server'

import { RateLimiterMemory } from 'rate-limiter-flexible'

import { httpHeaders } from '@/config/api-endpoints'
import { validateApiKey } from '@/services/api-keys'

// Rate limiters per API key (stored in memory)
const rateLimiters = new Map<string, RateLimiterMemory>()

export interface ApiAuthContext {
  userId: number
  teamId: number
  permissions: string[]
}

export async function withApiAuth(
  request: NextRequest,
  requiredPermission?: string
): Promise<{
  authorized: boolean
  context?: ApiAuthContext
  error?: string
}> {
  // Extract API key from Authorization header
  const authHeader = request.headers.get(httpHeaders.auth.authorization)

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      error: 'Missing or invalid authorization header'
    }
  }

  const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix

  // Validate API key
  const validation = await validateApiKey(apiKey)

  if (!validation.valid) {
    return {
      authorized: false,
      error: 'Invalid or expired API key'
    }
  }

  // Check required permission if specified
  if (
    requiredPermission &&
    !validation.permissions?.includes(requiredPermission)
  ) {
    return {
      authorized: false,
      error: `Missing required permission: ${requiredPermission}`
    }
  }

  // Apply rate limiting
  const rateLimitKey = `${validation.teamId}_${validation.userId}`

  if (!rateLimiters.has(rateLimitKey)) {
    rateLimiters.set(
      rateLimitKey,
      new RateLimiterMemory({
        points: validation.rateLimitPerHour || 1000, // Default 1000 requests per hour
        duration: 3600, // 1 hour in seconds
        blockDuration: 600 // Block for 10 minutes if exceeded
      })
    )
  }

  const rateLimiter = rateLimiters.get(rateLimitKey)!

  try {
    await rateLimiter.consume(rateLimitKey, 1)
  } catch (rejRes: any) {
    return {
      authorized: false,
      error: `Rate limit exceeded. Try again in ${Math.round(rejRes.msBeforeNext / 1000)} seconds`
    }
  }

  return {
    authorized: true,
    context: {
      userId: validation.userId!,
      teamId: validation.teamId!,
      permissions: validation.permissions!
    }
  }
}

export function createApiErrorResponse(
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    {
      error: {
        message,
        code:
          status === 401
            ? 'UNAUTHORIZED'
            : status === 403
              ? 'FORBIDDEN'
              : status === 429
                ? 'RATE_LIMITED'
                : 'BAD_REQUEST'
      }
    },
    { status }
  )
}

export function createApiSuccessResponse(
  data: any,
  status: number = 200
): NextResponse {
  return NextResponse.json({ data }, { status })
}
