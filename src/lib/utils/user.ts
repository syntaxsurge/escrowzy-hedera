import { truncateAddress } from '@/lib'

import { getUploadUrl } from './upload'
import type { User } from '../db/schema'

interface UserDisplayOptions {
  fallback?: string
  preferEmail?: boolean
  showWallet?: boolean
}

interface EmailVerificationStatus {
  hasEmail: boolean
  isVerified: boolean
  canProceed: boolean
}

/**
 * Check if user has a verified email address
 * Returns status object with detailed information
 */
export function checkEmailVerificationStatus(
  user: {
    email?: string | null
    emailVerified?: boolean | null
  } | null
): EmailVerificationStatus {
  if (!user) {
    return {
      hasEmail: false,
      isVerified: false,
      canProceed: false
    }
  }

  const hasEmail = Boolean(user.email)
  const isVerified = Boolean(user.emailVerified)
  const canProceed = hasEmail && isVerified

  return {
    hasEmail,
    isVerified,
    canProceed
  }
}

/**
 * Get display name for a user
 * Priority: name > email > truncated wallet address > fallback
 */
export function getUserDisplayName(
  user:
    | {
        name?: string | null
        email?: string | null
        walletAddress?: string | null
      }
    | null
    | undefined,
  options: UserDisplayOptions = {}
): string {
  const {
    fallback = 'Unknown User',
    preferEmail = false,
    showWallet = true
  } = options

  if (!user) {
    return fallback
  }

  if (preferEmail && user.email) {
    return user.email
  }

  if (user.name) {
    return user.name
  }

  if (user.email) {
    return user.email
  }

  if (showWallet && user.walletAddress) {
    return truncateAddress(user.walletAddress)
  }

  return fallback
}

/**
 * Get initials from a user's name or email
 */
export function getUserInitials(
  user:
    | {
        name?: string | null
        email?: string | null
        walletAddress?: string | null
      }
    | null
    | undefined
): string {
  if (!user) {
    return '??'
  }

  const displayName = getUserDisplayName(user, {
    showWallet: false,
    fallback: ''
  })

  if (!displayName) {
    // Use first 2 chars of wallet address if available
    if (user.walletAddress && user.walletAddress.length >= 4) {
      return user.walletAddress.slice(2, 4).toUpperCase()
    }
    return '??'
  }

  // Extract initials from name or email
  const parts = displayName.split(/[\s@._-]+/).filter(Boolean)

  if (parts.length === 0) {
    return '??'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  // Take first letter of first two parts
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function getUserAvatar(
  user: Partial<User> | null | undefined
): string | undefined {
  if (!user) return undefined

  // If user has uploaded avatar, return the URL
  if (user.avatarPath) {
    return getUploadUrl(user.avatarPath)
  }

  // Otherwise return undefined to use the default avatar
  return undefined
}
