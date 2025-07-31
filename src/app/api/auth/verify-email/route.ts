import { NextRequest, NextResponse } from 'next/server'

import { eq, and } from 'drizzle-orm'

import { appRoutes } from '@/config/app-routes'
import { envPublic } from '@/config/env.public'
import { isVerificationTokenExpired } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import { users, emailVerificationRequests } from '@/lib/db/schema'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL(
          `${appRoutes.dashboard.settings.base}?error=missing-token`,
          envPublic.NEXT_PUBLIC_APP_URL
        )
      )
    }

    // Find verification request with this token
    const [verificationRequest] = await db
      .select({
        request: emailVerificationRequests,
        user: users
      })
      .from(emailVerificationRequests)
      .innerJoin(users, eq(emailVerificationRequests.userId, users.id))
      .where(eq(emailVerificationRequests.token, token))
      .limit(1)

    if (!verificationRequest) {
      return NextResponse.redirect(
        new URL(
          `${appRoutes.dashboard.settings.base}?error=invalid-token`,
          envPublic.NEXT_PUBLIC_APP_URL
        )
      )
    }

    // Check if token is expired
    if (isVerificationTokenExpired(verificationRequest.request.expiresAt)) {
      return NextResponse.redirect(
        new URL(
          `${appRoutes.dashboard.settings.base}?error=expired-token`,
          envPublic.NEXT_PUBLIC_APP_URL
        )
      )
    }

    // Start a transaction to handle unique verified email enforcement
    await db.transaction(async tx => {
      const { request, user } = verificationRequest

      // Check if another user already has this email verified
      const existingVerifiedUser = await tx
        .select()
        .from(users)
        .where(
          and(eq(users.email, request.email), eq(users.emailVerified, true))
        )
        .limit(1)

      // If another user already verified this email, throw error
      if (existingVerifiedUser.length > 0) {
        throw new Error('email-already-verified')
      }

      // Update user to verify email
      await tx
        .update(users)
        .set({
          email: request.email,
          emailVerified: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id))

      // Delete all verification requests for this email
      await tx
        .delete(emailVerificationRequests)
        .where(eq(emailVerificationRequests.email, request.email))
    })

    // Redirect to general settings with success message
    return NextResponse.redirect(
      new URL(
        `${appRoutes.dashboard.settings.base}?success=email-verified`,
        envPublic.NEXT_PUBLIC_APP_URL
      )
    )
  } catch (error: any) {
    console.error('Email verification error:', error)

    // Handle specific error for already verified email
    if (error.message === 'email-already-verified') {
      return NextResponse.redirect(
        new URL(
          `${appRoutes.dashboard.settings.base}?error=email-already-verified`,
          envPublic.NEXT_PUBLIC_APP_URL
        )
      )
    }

    return NextResponse.redirect(
      new URL(
        `${appRoutes.dashboard.settings.base}?error=verification-failed`,
        envPublic.NEXT_PUBLIC_APP_URL
      )
    )
  }
}
