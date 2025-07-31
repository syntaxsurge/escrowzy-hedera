'use client'

import { mutate } from 'swr'

import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { api } from '@/lib/api/http-client'

/**
 * Clears all thirdweb and authentication related storage
 */
function clearAuthStorage(): void {
  try {
    // Clear all localStorage items that might contain auth data
    const keysToRemove: string[] = []

    // Find all thirdweb related keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        // Remove thirdweb related items (in-app wallet, auth tokens, etc)
        if (
          key.includes('thirdweb') ||
          key.includes('tw-') ||
          key.includes('wallet') ||
          key.includes('auth') ||
          key.includes('email') ||
          key.includes('google') ||
          key.includes('inApp') ||
          key.includes('embedded')
        ) {
          keysToRemove.push(key)
        }
      }
    }

    // Remove all identified keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })

    // Also clear sessionStorage for any temporary auth data
    const sessionKeysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key) {
        if (
          key.includes('thirdweb') ||
          key.includes('tw-') ||
          key.includes('wallet') ||
          key.includes('auth') ||
          key.includes('email') ||
          key.includes('google')
        ) {
          sessionKeysToRemove.push(key)
        }
      }
    }

    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key)
    })
  } catch (error) {
    console.error('Error clearing auth storage:', error)
  }
}

/**
 * Centralized wallet disconnect function that handles both session clearing and wallet disconnection
 * This ensures consistent behavior across all disconnect implementations
 */
export async function disconnectWallet(disconnect?: () => void): Promise<void> {
  try {
    // Clear the session by calling signout API
    await api.post(apiEndpoints.auth.signOut, undefined, {
      credentials: 'include'
    })

    // Clear SWR cache to remove user data
    await mutate(apiEndpoints.user.profile, null, { revalidate: false })
    await mutate(apiEndpoints.team, null, { revalidate: false })

    // Clear all authentication related storage (including email/Google auth)
    clearAuthStorage()

    // Disconnect wallet if disconnect function is provided
    if (disconnect) {
      disconnect()
    }

    // Force redirect to home page to prevent access to protected routes
    window.location.href = appRoutes.home
  } catch (error) {
    console.error('Error during wallet disconnect:', error)

    // Even if API call fails, still clear local storage and disconnect
    clearAuthStorage()

    if (disconnect) {
      try {
        disconnect()
      } catch (disconnectError) {
        console.error('Error disconnecting wallet:', disconnectError)
      }
    }

    // Still redirect even if signout fails to ensure user is logged out
    window.location.href = appRoutes.home
  }
}

/**
 * Hook to get the centralized disconnect function
 * This provides a consistent interface for all components
 */
export function useWalletDisconnect() {
  return {
    disconnect: disconnectWallet
  }
}
