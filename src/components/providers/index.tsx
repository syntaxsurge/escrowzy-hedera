'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

import { AutoChainSwitcher } from '@/components/blocks/blockchain/auto-chain-switcher'
import { ClientOnly } from '@/components/client-only'
import { Toaster } from '@/components/ui/sonner'
import { AchievementNotificationProvider } from '@/context/achievement-notification'

import { NavigationProgress } from './navigation-progress'
import { ThemeProvider } from './theme-provider'

// Lazy load Wallet components to prevent SSR issues

const WalletProvider = dynamic(
  () => import('./wallet-provider').then(mod => mod.WalletProvider),
  {
    ssr: false,
    loading: () => <div className='bg-background min-h-screen' />
  }
)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
    >
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <ClientOnly fallback={<div className='bg-background min-h-screen' />}>
        <WalletProvider>
          <AutoChainSwitcher />
          <AchievementNotificationProvider>
            {children}
          </AchievementNotificationProvider>
        </WalletProvider>
      </ClientOnly>
      <Toaster richColors closeButton position='bottom-right' offset={20} />
    </ThemeProvider>
  )
}
