import { eq, ilike, or } from 'drizzle-orm'
import type { SQL, ExtractTablesWithRelations } from 'drizzle-orm'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js'

import { normalizeWalletAddress } from '@/lib/utils/string'

import { db } from '../drizzle'
import { users } from '../schema'
import type * as schema from '../schema'

type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

/**
 * Find a user by wallet address (automatically normalizes the address)
 * @param walletAddress - The wallet address to search for
 * @returns The user if found, null otherwise
 */
export async function findUserByWalletAddress(walletAddress: string) {
  const normalizedAddress = normalizeWalletAddress(walletAddress)

  const result = await db
    .select()
    .from(users)
    .where(eq(users.walletAddress, normalizedAddress))
    .limit(1)

  return result[0] || null
}

// Alias for backwards compatibility
export const getUserByWalletAddress = findUserByWalletAddress

/**
 * Find a user by ID
 * @param userId - The user ID to search for
 * @returns The user if found, null otherwise
 */
export async function findUserById(userId: number) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return result[0] || null
}

/**
 * Create a new user with normalized wallet address
 * @param data - User data to insert
 * @param tx - Optional transaction to use
 * @returns The created user
 */
export async function createUser(
  data: {
    walletAddress: string
    email?: string
    name?: string
    role?: string
    emailVerified?: boolean
  },
  tx?: Transaction
) {
  const dbOrTx = tx || db

  const [newUser] = await dbOrTx
    .insert(users)
    .values({
      ...data,
      walletAddress: normalizeWalletAddress(data.walletAddress),
      role: data.role || 'user'
    })
    .returning()

  return newUser
}

/**
 * Search users by wallet address, email, or name (automatically normalizes wallet address in search)
 * @param searchTerm - The search term
 * @returns Array of matching users
 */
export async function searchUsers(searchTerm: string) {
  if (!searchTerm) return []

  // Normalize the search term for wallet address comparison
  const normalizedSearchTerm = normalizeWalletAddress(searchTerm)

  return await db
    .select()
    .from(users)
    .where(
      or(
        ilike(users.walletAddress, `%${normalizedSearchTerm}%`),
        ilike(users.email, `%${searchTerm}%`),
        ilike(users.name, `%${searchTerm}%`)
      )
    )
}

/**
 * Build a search condition for users that can be used in complex queries
 * @param searchTerm - The search term
 * @returns SQL condition for searching users
 */
export function buildUserSearchCondition(searchTerm: string): SQL | undefined {
  if (!searchTerm) return undefined

  const normalizedSearchTerm = normalizeWalletAddress(searchTerm)

  return or(
    ilike(users.walletAddress, `%${normalizedSearchTerm}%`),
    ilike(users.email, `%${searchTerm}%`),
    ilike(users.name, `%${searchTerm}%`)
  )
}

/**
 * Update a user by ID
 * @param userId - The user ID
 * @param data - Data to update (wallet address will be normalized if provided)
 * @returns The updated user
 */
export async function updateUser(
  userId: number,
  data: Partial<{
    walletAddress: string
    email: string
    name: string
    role: string
    emailVerified: boolean
  }>
) {
  const updateData = { ...data }

  // Normalize wallet address if it's being updated
  if (updateData.walletAddress) {
    updateData.walletAddress = normalizeWalletAddress(updateData.walletAddress)
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      ...updateData,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId))
    .returning()

  return updatedUser
}
