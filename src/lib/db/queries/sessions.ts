import { randomBytes } from 'crypto'

import { eq, and, gt, lt } from 'drizzle-orm'

import { db } from '../drizzle'
import { sessions } from '../schema'

export async function createSession(
  userId: number,
  ipAddress?: string,
  userAgent?: string
) {
  const sessionToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      sessionToken,
      ipAddress,
      userAgent,
      expiresAt
    })
    .returning()

  return session
}

export async function validateSession(sessionToken: string) {
  const now = new Date()

  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(eq(sessions.sessionToken, sessionToken), gt(sessions.expiresAt, now))
    )
    .limit(1)

  if (!session) {
    return null
  }

  // Update last active timestamp
  await db
    .update(sessions)
    .set({ lastActiveAt: now })
    .where(eq(sessions.id, session.id))

  return session
}

export async function deleteSession(sessionToken: string) {
  await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken))
}

export async function deleteUserSessions(userId: number) {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}

export async function cleanupExpiredSessions() {
  const now = new Date()

  await db.delete(sessions).where(lt(sessions.expiresAt, now))
}

export async function getUserSessions(userId: number) {
  return await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(sessions.lastActiveAt)
}

export async function extendSession(sessionToken: string) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await db
    .update(sessions)
    .set({
      expiresAt,
      lastActiveAt: new Date()
    })
    .where(eq(sessions.sessionToken, sessionToken))
}
