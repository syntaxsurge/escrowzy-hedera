'use client'

import { useRouter } from 'next/navigation'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from 'react'

import { apiEndpoints, localStorageKeys } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { api } from '@/lib/api/http-client'
import type { User } from '@/lib/db/schema'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: Error | null
  checkAuth: () => Promise<void>
  clearAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const clearAuth = useCallback(() => {
    setUser(null)
    setError(null)
    // Clear any cached data
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(localStorageKeys.authChecked)
    }
  }, [])

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await api.get(apiEndpoints.user.profile)

      if (response.success && response.data?.user) {
        setUser(response.data.user)
        // Mark auth as checked
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            localStorageKeys.authChecked,
            Date.now().toString()
          )
        }
      } else if (!response.success && response.status === 401) {
        // Unauthorized - clear auth and redirect
        clearAuth()
        router.push(appRoutes.home)
      } else {
        clearAuth()
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      setError(err instanceof Error ? err : new Error('Authentication failed'))
      clearAuth()

      // If 401, redirect to home
      if ((err as any)?.response?.status === 401) {
        router.push(appRoutes.home)
      }
    } finally {
      setIsLoading(false)
    }
  }, [clearAuth, router])

  // Check auth on mount and when tab becomes visible
  useEffect(() => {
    checkAuth()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-check auth when tab becomes visible
        const lastCheck = window.localStorage.getItem(
          localStorageKeys.authChecked
        )
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

        if (!lastCheck || parseInt(lastCheck) < fiveMinutesAgo) {
          checkAuth()
        }
      }
    }

    const handleFocus = () => {
      // Also check on window focus
      const lastCheck = window.localStorage.getItem(
        localStorageKeys.authChecked
      )
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

      if (!lastCheck || parseInt(lastCheck) < fiveMinutesAgo) {
        checkAuth()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkAuth])

  // Listen for auth-related errors from API calls via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === localStorageKeys.authLogout && e.newValue === 'true') {
        // Another tab logged out
        clearAuth()
        router.push(appRoutes.home)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [clearAuth, router])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        checkAuth,
        clearAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
