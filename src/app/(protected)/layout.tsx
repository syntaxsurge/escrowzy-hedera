import { redirect } from 'next/navigation'

import { AuthGuard } from '@/components/auth/auth-guard'
import { appRoutes } from '@/config/app-routes'
import { getUser } from '@/services/user'

import ProtectedLayoutClient from './protected-layout-client'

export default async function Layout({
  children
}: {
  children: React.ReactNode
}) {
  // Server-side authentication check
  const user = await getUser()

  if (!user) {
    redirect(appRoutes.home)
  }

  return (
    <AuthGuard>
      <ProtectedLayoutClient user={user}>{children}</ProtectedLayoutClient>
    </AuthGuard>
  )
}
