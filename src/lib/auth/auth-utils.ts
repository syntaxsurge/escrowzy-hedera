import { randomBytes } from 'crypto'

import { NextResponse } from 'next/server'

import { z } from 'zod'

import { envServer } from '@/config/env.server'
import type { User } from '@/lib/db/schema'

import { getUserForRoute } from './get-user-route'

// API authentication check helper for route handlers
export async function requireAuth() {
  // Use getUserForRoute in API routes which can modify cookies
  const user = await getUserForRoute()

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }
  }

  return { user, error: null }
}

export async function requireAdmin() {
  const { user, error } = await requireAuth()

  if (error) return { user: null, error }

  if (user?.role !== 'admin') {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
  }

  return { user, error: null }
}

// Higher-order function for API route authentication
export function withAuth<T extends any[] = []>(
  handler: (
    params: { user: User; request: Request },
    ...args: T
  ) => Promise<Response>
) {
  return async function (request: Request, ...args: T): Promise<Response> {
    try {
      const { user, error } = await requireAuth()

      if (error) {
        return error
      }

      return handler({ user, request }, ...args)
    } catch (error) {
      if (envServer.NODE_ENV === 'development') {
        console.error('Auth middleware error:', error)
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Higher-order function for admin-only API routes
export function withAdmin<T extends any[] = []>(
  handler: (
    params: { user: User; request: Request },
    ...args: T
  ) => Promise<Response>
) {
  return async function (request: Request, ...args: T): Promise<Response> {
    try {
      const { user, error } = await requireAdmin()

      if (error) {
        return error
      }

      return handler({ user, request }, ...args)
    } catch (error) {
      if (envServer.NODE_ENV === 'development') {
        console.error('Admin middleware error:', error)
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Form action validation types
type ActionState = {
  error?: string
  success?: string
  [key: string]: any // This allows for additional properties
}

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User
) => Promise<T>

// Form action validation with user authentication
export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData) => {
    // Server actions can modify cookies, so use getUserForRoute
    const user = await getUserForRoute()
    if (!user) {
      throw new Error('User is not authenticated')
    }

    const result = schema.safeParse(Object.fromEntries(formData))
    if (!result.success) {
      return { error: result.error.errors[0].message }
    }

    return action(result.data, formData, user)
  }
}

// Email verification token generation
export function generateEmailVerificationToken(): string {
  return randomBytes(32).toString('hex')
}

// Generate verification token expiry (24 hours from now)
export function generateVerificationExpiry(): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + 24)
  return expiry
}

// Check if email verification token is expired
export function isVerificationTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true
  return new Date() > new Date(expiresAt)
}
