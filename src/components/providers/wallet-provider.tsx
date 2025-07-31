'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

import { LoadingScreen } from '@/components/blocks/loading-screen'
import {
  getWalletProvider,
  WalletProviders,
  type WalletProvider as WalletProviderType
} from '@/config/wallet-provider'
import { BlockchainProvider, NetworkProvider } from '@/context'

// Dynamically load wallet providers
const ThirdwebProvider = dynamic(
  () => import('./thirdweb-provider').then(mod => mod.ThirdwebProvider),
  { ssr: false, loading: () => <LoadingScreen /> }
)

const WagmiRainbowKitProvider = dynamic(
  () => import('./wagmi-provider').then(mod => mod.WagmiRainbowKitProvider),
  { ssr: false, loading: () => <LoadingScreen /> }
)

// Define provider mapping for easy extension
const PROVIDER_COMPONENTS: Record<
  WalletProviderType,
  React.ComponentType<{ children: React.ReactNode }>
> = {
  [WalletProviders.THIRDWEB]: ThirdwebProvider,
  [WalletProviders.RAINBOW_KIT]: WagmiRainbowKitProvider
}

interface WalletProviderProps {
  children: React.ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const currentProvider = getWalletProvider()

  const ProviderComponent = useMemo(() => {
    const Component = PROVIDER_COMPONENTS[currentProvider]
    if (!Component) {
      throw new Error(
        `No provider component configured for: ${currentProvider}`
      )
    }
    return Component
  }, [currentProvider])

  return (
    <NetworkProvider>
      <ProviderComponent>
        <BlockchainProvider>{children}</BlockchainProvider>
      </ProviderComponent>
    </NetworkProvider>
  )
}
