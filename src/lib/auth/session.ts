import { cookies } from 'next/headers'

import { SignJWT, jwtVerify } from 'jose'

import { timeConstants } from '@/config/app-routes'
import { envServer } from '@/config/env.server'

const key = new TextEncoder().encode(envServer.AUTH_SECRET)

type SessionData = {
  user: { id: number; walletAddress: string }
  sessionToken: string
  expires: string
}

export async function signToken(payload: SessionData) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key)
}

export async function verifyToken(input: string) {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256']
  })
  return payload as SessionData
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value
  if (!session) return null
  return await verifyToken(session)
}

export async function setSession(
  user: { id: number; walletAddress: string },
  sessionToken: string
) {
  const expiresInOneDay = new Date(Date.now() + timeConstants.DAY)
  const session: SessionData = {
    user: { id: user.id, walletAddress: user.walletAddress },
    sessionToken,
    expires: expiresInOneDay.toISOString()
  }
  const encryptedSession = await signToken(session)

  // Only use secure cookies in production
  const isProduction = envServer.NODE_ENV === 'production'

  ;(await cookies()).set('session', encryptedSession, {
    expires: expiresInOneDay,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/' // Ensure cookie is available for all paths
  })
}

export async function clearSession() {
  ;(await cookies()).delete({
    name: 'session',
    path: '/'
  })
}
