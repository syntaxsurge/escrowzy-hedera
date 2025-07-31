import { AuthGuard } from '@/components/auth/auth-guard'

import ClientLayout from './layout'

export default async function ProtectedLayoutWrapper({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <ClientLayout>{children}</ClientLayout>
    </AuthGuard>
  )
}
