import { checkAdminRole } from '@/services/user'

import { DashboardLayoutClient } from '../../../components/layout/dashboard-layout'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const isAdmin = await checkAdminRole()

  return (
    <DashboardLayoutClient isAdmin={isAdmin}>{children}</DashboardLayoutClient>
  )
}
