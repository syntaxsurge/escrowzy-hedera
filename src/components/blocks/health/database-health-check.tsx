'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { SystemHealthLoading } from '@/components/blocks/health/system-health-loading'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { api } from '@/lib/api/http-client'

const ALLOWED_PATHS: string[] = [appRoutes.dbError, apiEndpoints.health.db] // Paths that don't need DB

export function DatabaseHealthCheck({
  children
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  const checkDatabaseHealth = async () => {
    try {
      const response = await api.get(apiEndpoints.health.db)

      if (!response.success || response.data?.status !== 'healthy') {
        throw new Error('Database is unhealthy')
      }

      // If we're on the db-error page and DB is healthy, redirect to homepage
      if (pathname === appRoutes.dbError) {
        router.push(appRoutes.home)
      }

      setIsChecking(false)
      return true
    } catch (_error) {
      // Redirect to error page if not already there
      if (!ALLOWED_PATHS.includes(pathname)) {
        router.push(appRoutes.dbError)
      }
      setIsChecking(false)
      return false
    }
  }

  useEffect(() => {
    // Initial check
    checkDatabaseHealth()

    // If on db-error page, set up periodic checks
    if (pathname === appRoutes.dbError) {
      const interval = setInterval(() => {
        checkDatabaseHealth()
      }, 5000) // Check every 5 seconds

      return () => clearInterval(interval)
    }
  }, [pathname])

  // Show loading state during initial check
  if (isChecking && !ALLOWED_PATHS.includes(pathname)) {
    return <SystemHealthLoading />
  }

  return <>{children}</>
}
