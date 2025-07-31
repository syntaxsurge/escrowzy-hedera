'use client'

import { ReactNode } from 'react'

import { RealtimeNotificationsProvider } from './realtime-notifications-provider'

interface AuthDependentProvidersProps {
  children: ReactNode
}

export function AuthDependentProviders({
  children
}: AuthDependentProvidersProps) {
  return (
    <RealtimeNotificationsProvider>{children}</RealtimeNotificationsProvider>
  )
}
