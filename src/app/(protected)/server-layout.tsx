import { AuthGuard } from '@/components/auth/auth-guard'

export default async function ServerProtectedLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <AuthGuard>{children}</AuthGuard>
}
