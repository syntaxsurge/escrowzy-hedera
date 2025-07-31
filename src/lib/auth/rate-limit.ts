import { NextRequest } from 'next/server'

import { httpHeaders } from '@/config/api-endpoints'

// Simple in-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

export function rateLimit(
  config: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10 // 10 requests per 15 minutes
  }
) {
  return async (request: NextRequest): Promise<boolean> => {
    // Get client identifier (IP + user agent)
    const ip =
      request.headers.get(httpHeaders.rateLimit.forwardedFor) ||
      request.headers.get(httpHeaders.rateLimit.realIp) ||
      'unknown'
    const userAgent =
      request.headers.get(httpHeaders.rateLimit.userAgent) || 'unknown'
    const identifier = `${ip}:${userAgent}`

    const now = Date.now()
    const windowStart = now - config.windowMs

    // Clean up old entries
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < windowStart) {
        rateLimitMap.delete(key)
      }
    }

    // Get or create rate limit entry
    let rateLimitInfo = rateLimitMap.get(identifier)

    if (!rateLimitInfo || rateLimitInfo.resetTime < now) {
      // New window
      rateLimitInfo = {
        count: 1,
        resetTime: now + config.windowMs
      }
      rateLimitMap.set(identifier, rateLimitInfo)
      return true // Allow request
    }

    // Check if limit exceeded
    if (rateLimitInfo.count >= config.maxRequests) {
      return false // Deny request
    }

    // Increment counter
    rateLimitInfo.count++
    rateLimitMap.set(identifier, rateLimitInfo)
    return true // Allow request
  }
}

// Specific rate limiters for different endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5 // 5 auth attempts per 15 minutes
})

export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 60 // 60 requests per minute
})
