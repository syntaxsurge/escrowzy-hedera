import { randomBytes, createHash } from 'crypto'

import { and, desc, eq } from 'drizzle-orm'

import { securityConstants } from '@/config/business-constants'
import { statusConstants } from '@/config/status-constants'
import { db } from '@/lib/db/drizzle'
import { apiKeys, paymentHistory, teamMembers } from '@/lib/db/schema'
import { getUser } from '@/services/user'

const API_KEY_PREFIX = 'esk_'
const API_KEY_LENGTH = securityConstants.API_KEY_LENGTH

export interface ApiKeyCreate {
  name: string
  expiresIn?: number // days
}

export interface ApiKeyResponse {
  id: number
  name: string
  keyPrefix: string
  lastUsedAt: Date | null
  expiresAt: Date | null
  isActive: boolean
  createdAt: Date
  fullKey?: string // Only returned on creation
}

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const keyBytes = randomBytes(API_KEY_LENGTH)
  const key = API_KEY_PREFIX + keyBytes.toString('base64url')
  const hash = createHash('sha256').update(key).digest('hex')
  const prefix = key.substring(0, 10) + '...'

  return { key, hash, prefix }
}

export async function createApiKey(
  data: ApiKeyCreate
): Promise<ApiKeyResponse> {
  const authUser = await getUser()

  if (!authUser) {
    throw new Error('User not authenticated')
  }

  // Get user's team membership
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, authUser.id),
    with: {
      team: true
    }
  })

  if (!membership) {
    throw new Error('User does not belong to a team')
  }

  const userTeam = membership.team

  if (!userTeam) {
    throw new Error('User does not belong to a team')
  }

  // Check if user has enterprise subscription
  const hasEnterprise = await db.query.paymentHistory.findFirst({
    where: and(
      eq(paymentHistory.teamId, userTeam.id),
      eq(paymentHistory.planId, statusConstants.subscriptionPlans.ENTERPRISE),
      eq(paymentHistory.status, 'confirmed')
    )
  })

  if (!hasEnterprise) {
    throw new Error('API keys are only available for Enterprise plan users')
  }

  // Check existing API keys limit (10 per team)
  const existingKeys = await db.query.apiKeys.findMany({
    where: and(eq(apiKeys.teamId, userTeam.id), eq(apiKeys.isActive, true))
  })

  if (existingKeys.length >= 10) {
    throw new Error('Maximum number of API keys (10) reached')
  }

  // Generate new API key
  const { key, hash, prefix } = generateApiKey()

  // Calculate expiration date if provided
  let expiresAt = null
  if (data.expiresIn && data.expiresIn > 0) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + data.expiresIn)
  }

  // Create API key in database
  const [apiKey] = await db
    .insert(apiKeys)
    .values({
      userId: authUser.id,
      teamId: userTeam.id,
      name: data.name,
      keyHash: hash,
      keyPrefix: prefix,
      expiresAt,
      permissions: ['escrow:read', 'escrow:write'],
      rateLimitPerHour: securityConstants.API_RATE_LIMITS.enterprise
    })
    .returning()

  return {
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    lastUsedAt: apiKey.lastUsedAt,
    expiresAt: apiKey.expiresAt,
    isActive: apiKey.isActive,
    createdAt: apiKey.createdAt,
    fullKey: key // Return full key only on creation
  }
}

export async function getApiKeys(): Promise<ApiKeyResponse[]> {
  const authUser = await getUser()

  if (!authUser) {
    throw new Error('User not authenticated')
  }

  // Get user's team membership
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, authUser.id),
    with: {
      team: true
    }
  })

  if (!membership) {
    throw new Error('User does not belong to a team')
  }

  const userTeam = membership.team

  if (!userTeam) {
    throw new Error('User does not belong to a team')
  }

  // Get all API keys for the team
  const keys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.teamId, userTeam.id),
    orderBy: [desc(apiKeys.createdAt)]
  })

  return keys.map(key => ({
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    lastUsedAt: key.lastUsedAt,
    expiresAt: key.expiresAt,
    isActive: key.isActive,
    createdAt: key.createdAt
  }))
}

export async function revokeApiKey(keyId: number): Promise<void> {
  const authUser = await getUser()

  if (!authUser) {
    throw new Error('User not authenticated')
  }

  // Get user's team membership
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, authUser.id),
    with: {
      team: true
    }
  })

  if (!membership) {
    throw new Error('User does not belong to a team')
  }

  // Get the API key
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.id, keyId)
  })

  if (!apiKey) {
    throw new Error('API key not found')
  }

  // Verify the key belongs to user's team
  if (apiKey.teamId !== membership.teamId) {
    throw new Error('Not authorized to revoke this API key')
  }

  // Revoke the key
  await db
    .update(apiKeys)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(apiKeys.id, keyId))
}

export async function validateApiKey(key: string): Promise<{
  valid: boolean
  userId?: number
  teamId?: number
  permissions?: string[]
  rateLimitPerHour?: number
}> {
  // Hash the provided key
  const hash = createHash('sha256').update(key).digest('hex')

  // Find the API key
  const apiKey = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyHash, hash), eq(apiKeys.isActive, true))
  })

  if (!apiKey) {
    return { valid: false }
  }

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false }
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({
      lastUsedAt: new Date(),
      usageCount: apiKey.usageCount + 1
    })
    .where(eq(apiKeys.id, apiKey.id))

  return {
    valid: true,
    userId: apiKey.userId,
    teamId: apiKey.teamId,
    permissions: apiKey.permissions as string[],
    rateLimitPerHour: apiKey.rateLimitPerHour
  }
}

export async function getApiKeyUsageStats(keyId: number): Promise<{
  usageCount: number
  lastUsedAt: Date | null
  rateLimitPerHour: number
}> {
  const authUser = await getUser()

  if (!authUser) {
    throw new Error('User not authenticated')
  }

  // Get user's team membership
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, authUser.id)
  })

  if (!membership) {
    throw new Error('User does not belong to a team')
  }

  const apiKey = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, keyId), eq(apiKeys.teamId, membership.teamId))
  })

  if (!apiKey) {
    throw new Error('API key not found')
  }

  return {
    usageCount: apiKey.usageCount,
    lastUsedAt: apiKey.lastUsedAt,
    rateLimitPerHour: apiKey.rateLimitPerHour
  }
}
