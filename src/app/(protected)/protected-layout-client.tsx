'use client'

import { ClientOnly } from '@/components/client-only'
import { Footer } from '@/components/layout/footer'
import Header from '@/components/layout/header'
import { AuthDependentProviders } from '@/components/providers/auth-dependent-providers'
import { AuthProvider } from '@/components/providers/auth-provider'
import { useSubscriptionValidation } from '@/hooks/use-subscription-validation'
import type { User } from '@/lib/db/schema'

function LayoutWithSubscriptionValidation({
  children
}: {
  children: React.ReactNode
}) {
  // Validate subscription status on mount and when focus changes
  useSubscriptionValidation()

  return (
    <section className='bg-background text-foreground flex min-h-screen flex-col'>
      <Header />
      <main className='flex-1'>{children}</main>
      <Footer />
    </section>
  )
}

export default function ProtectedLayoutClient({
  children,
  user: _user
}: {
  children: React.ReactNode
  user: User
}) {
  return (
    <ClientOnly>
      <AuthProvider>
        <AuthDependentProviders>
          <LayoutWithSubscriptionValidation>
            {children}
          </LayoutWithSubscriptionValidation>
        </AuthDependentProviders>
      </AuthProvider>
    </ClientOnly>
  )
}
