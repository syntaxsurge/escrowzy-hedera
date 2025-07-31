import { NextResponse } from 'next/server'

import { eq, and } from 'drizzle-orm'

import {
  generateEmailVerificationToken,
  generateVerificationExpiry,
  requireAuth
} from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import { emailVerificationRequests, users } from '@/lib/db/schema'
import type { NewEmailVerificationRequest } from '@/lib/db/schema'
import { sendVerificationEmail } from '@/lib/email'

export async function POST() {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active verification request for this user
    const activeRequest = await db
      .select()
      .from(emailVerificationRequests)
      .where(eq(emailVerificationRequests.userId, user.id))
      .limit(1)

    if (!activeRequest || activeRequest.length === 0) {
      return NextResponse.json(
        { error: 'No pending email verification' },
        { status: 400 }
      )
    }

    const pendingEmail = activeRequest[0].email

    // Check if this email is already verified by current user
    if (user.email === pendingEmail && user.emailVerified) {
      // Remove the verification request since email is already verified
      await db
        .delete(emailVerificationRequests)
        .where(eq(emailVerificationRequests.userId, user.id))

      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Check if another user has already verified this email
    const existingVerifiedUser = await db
      .select()
      .from(users)
      .where(and(eq(users.email, pendingEmail), eq(users.emailVerified, true)))
      .limit(1)

    if (existingVerifiedUser.length > 0) {
      // Remove the verification request since email is already verified by another user
      await db
        .delete(emailVerificationRequests)
        .where(eq(emailVerificationRequests.userId, user.id))

      return NextResponse.json(
        { error: 'This email is already verified by another user' },
        { status: 400 }
      )
    }

    // Delete old verification request
    await db
      .delete(emailVerificationRequests)
      .where(eq(emailVerificationRequests.userId, user.id))

    // Generate new verification token and expiry
    const verificationToken = generateEmailVerificationToken()
    const verificationExpiry = generateVerificationExpiry()

    // Create new verification request
    const verificationRequest: NewEmailVerificationRequest = {
      userId: user.id,
      email: pendingEmail,
      token: verificationToken,
      expiresAt: verificationExpiry
    }

    await db.insert(emailVerificationRequests).values(verificationRequest)

    // Send verification email
    const emailResult = await sendVerificationEmail(
      pendingEmail,
      verificationToken
    )

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    )
  }
}
