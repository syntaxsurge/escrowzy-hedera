import { forbidden } from 'next/navigation'

import { AdminLayoutClient } from '@/components/layout/admin-layout'
import { checkAdminRole } from '@/services/user'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const isAdmin = await checkAdminRole()

  if (!isAdmin) {
    forbidden()
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
