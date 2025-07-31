import { redirect } from 'next/navigation'

import { appRoutes } from '@/config/app-routes'
import { getUser } from '@/services/user'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
  fallbackUrl?: string
}

export async function AuthGuard({
  children,
  requireAdmin = false,
  fallbackUrl = appRoutes.home
}: AuthGuardProps) {
  const user = await getUser()

  if (!user) {
    redirect(fallbackUrl)
  }

  if (requireAdmin && user.role !== 'admin') {
    redirect(appRoutes.dashboard.base)
  }

  return <>{children}</>
}
