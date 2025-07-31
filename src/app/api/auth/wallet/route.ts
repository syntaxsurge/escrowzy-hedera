import { NextRequest } from 'next/server'

import { eq } from 'drizzle-orm'
import requestIp from 'request-ip'
import { verifyMessage } from 'viem'

import { truncateAddress } from '@/lib'
import { apiResponses } from '@/lib/api/server-utils'
import { authRateLimit } from '@/lib/auth/rate-limit'
import { setSession, getSession, clearSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { createSession, deleteSession } from '@/lib/db/queries/sessions'
import { findUserByWalletAddress, createUser } from '@/lib/db/queries/users'
import {
  teams,
  teamMembers,
  ActivityType,
  activityLogs,
  users
} from '@/lib/db/schema'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const isAllowed = await authRateLimit(request)
  if (!isAllowed) {
    return apiResponses.tooManyRequests(
      'Too many authentication attempts. Please try again later.'
    )
  }

  try {
    const { message, signature, address, socialEmail, socialName } =
      await request.json()

    if (!message || !signature || !address) {
      return apiResponses.validationError(
        ['message', 'signature', 'address'].filter(field => {
          return !{ message, signature, address }[field]
        })
      )
    }

    // Get IP address and user agent
    const ipAddress = requestIp.getClientIp(request as any) || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Verify the signature
    let isValid = false
    try {
      isValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`
      })
    } catch (_) {
      return apiResponses.unauthorized('Invalid signature')
    }

    if (!isValid) {
      return apiResponses.unauthorized('Invalid signature')
    }

    // Check if user exists using centralized function
    let user
    try {
      user = await findUserByWalletAddress(address)
    } catch (_) {
      throw new Error('Database connection failed')
    }

    if (!user) {
      // Create new user and team in a transaction
      try {
        user = await db.transaction(async tx => {
          // Create new user using centralized function
          const newUser = await createUser(
            {
              walletAddress: address,
              email: socialEmail || undefined,
              name: socialName || undefined,
              role: 'user',
              // Auto-verify email if it comes from social login
              emailVerified: socialEmail ? true : false
            },
            tx
          )

          // Create default team for the user
          const normalizedAddr = newUser.walletAddress
          const [newTeam] = await tx
            .insert(teams)
            .values({
              name: `${truncateAddress(normalizedAddr)}'s Team`,
              planId: 'free'
            })
            .returning()

          // Add user to team as owner
          await tx.insert(teamMembers).values({
            userId: newUser.id,
            teamId: newTeam.id,
            role: 'owner'
          })

          // Log wallet connection activity with IP address
          await tx.insert(activityLogs).values({
            teamId: newTeam.id,
            userId: newUser.id,
            action: ActivityType.WALLET_CONNECTED,
            ipAddress
          })

          return newUser
        })
      } catch (error) {
        // If creation fails due to duplicate email, return a user-friendly error
        if (
          error instanceof Error &&
          error.message.includes('users_email_unique')
        ) {
          return apiResponses.badRequest(
            'This email has already been used by another user with a different wallet address. Please disconnect your wallet and use another email instead.'
          )
        }
        throw error
      }
    } else {
      // Update email and/or name if user doesn't have them and social login provides them
      const updates: {
        email?: string
        name?: string
        emailVerified?: boolean
      } = {}
      if (!user.email && socialEmail) {
        updates.email = socialEmail
        // Auto-verify email if it comes from social login
        updates.emailVerified = true
      }
      if (!user.name && socialName) {
        updates.name = socialName
      }

      if (Object.keys(updates).length > 0) {
        try {
          const { updateUser } = await import('@/lib/db/queries/users')
          const updatedUser = await updateUser(user.id, updates)
          if (updatedUser) {
            if (updates.email) user.email = updates.email
            if (updates.name) user.name = updates.name
            if (updates.emailVerified)
              user.emailVerified = updates.emailVerified
          }
        } catch (error) {
          // If update fails (e.g., email already taken), return a user-friendly error
          if (
            error instanceof Error &&
            error.message.includes('users_email_unique')
          ) {
            return apiResponses.badRequest(
              'This email has already been used by another user with a different wallet address. Please disconnect your wallet and use another email instead.'
            )
          }
          console.error('Failed to update user info from social login:', error)
        }
      }

      // Log activity for existing user
      const userTeam = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, user.id))
        .limit(1)

      if (userTeam.length) {
        await db.insert(activityLogs).values({
          teamId: userTeam[0].teamId,
          userId: user.id,
          action: ActivityType.SIGN_IN,
          ipAddress
        })
      }
    }

    // Ensure user exists and has a valid ID
    if (!user || !user.id) {
      return apiResponses.error('Failed to authenticate user', 500)
    }

    // Verify user exists in database before creating session
    const verifyUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (verifyUser.length === 0) {
      return apiResponses.error('User verification failed', 500)
    }

    // Create database session
    let dbSession
    try {
      dbSession = await createSession(user.id, ipAddress, userAgent)
    } catch (error) {
      console.error('Failed to create database session:', error)
      return apiResponses.error('Failed to create session', 500)
    }

    // Set session cookie with database session token
    try {
      await setSession(user, dbSession.sessionToken)
    } catch (error) {
      console.error('Failed to set session cookie:', error)
      // Clean up the database session if cookie setting fails
      await deleteSession(dbSession.sessionToken)
      return apiResponses.error('Failed to establish session', 500)
    }

    return apiResponses.success({ success: true, user })
  } catch (error) {
    return apiResponses.handleError(error, 'Authentication failed')
  }
}

function generateSecureNonce(): string {
  // Generate a secure nonce that meets SIWE requirements:
  // - At least 8 characters
  // - Only alphanumeric characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let nonce = ''

  // Generate 12 characters to be safe (more than minimum 8)
  for (let i = 0; i < 12; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return nonce
}

export async function GET(_request: NextRequest) {
  // Generate nonce for signing
  const nonce = generateSecureNonce()

  return apiResponses.success({ nonce })
}

export async function DELETE(_request: NextRequest) {
  try {
    // Get current session
    const session = await getSession()

    if (session) {
      // Delete database session
      await deleteSession(session.sessionToken)
    }

    // Clear session cookie
    await clearSession()

    return apiResponses.success({ success: true })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to clear session')
  }
}
