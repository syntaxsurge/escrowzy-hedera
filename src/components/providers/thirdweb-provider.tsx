'use client'

import { ThirdwebProvider as ThirdwebReactProvider } from 'thirdweb/react'

import { LoadingScreen } from '@/components/blocks/loading-screen'
import { envPublic } from '@/config/env.public'

interface ThirdwebProviderProps {
  children: React.ReactNode
}

export function ThirdwebProvider({ children }: ThirdwebProviderProps) {
  if (!envPublic.NEXT_PUBLIC_THIRDWEB_CLIENT_ID) {
    return <LoadingScreen />
  }

  return <ThirdwebReactProvider>{children}</ThirdwebReactProvider>
}
