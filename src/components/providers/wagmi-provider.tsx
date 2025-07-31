'use client'

import React, { useMemo } from 'react'

import '@rainbow-me/rainbowkit/styles.css'
import {
  getDefaultConfig,
  RainbowKitProvider,
  lightTheme,
  darkTheme
} from '@rainbow-me/rainbowkit'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { WagmiProvider, createStorage } from 'wagmi'

import { envPublic } from '@/config/env.public'
import { SUPPORTED_CHAIN_IDS, getViemChain } from '@/lib/blockchain'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1
    }
  }
})

// Theme configuration
const customLightTheme = lightTheme({
  accentColor: '#7b3fe4',
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small'
})

const customDarkTheme = darkTheme({
  accentColor: '#7b3fe4',
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small'
})

// Custom storage that persists chain and connection state
const storage = createStorage({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: `${envPublic.NEXT_PUBLIC_APP_NAME}-wagmi`
})

// Initialize config outside of component to avoid re-creation
const getWagmiConfig = () => {
  const projectId = envPublic.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  if (!projectId || projectId === '') {
    throw new Error(
      'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable is required'
    )
  }

  const viemChains = SUPPORTED_CHAIN_IDS.map(id => getViemChain(id)).filter(
    Boolean
  )

  return getDefaultConfig({
    appName: envPublic.NEXT_PUBLIC_APP_NAME,
    projectId,
    chains: viemChains as any,
    ssr: true,
    storage,
    syncConnectedChain: true // This ensures the chain persists across sessions
  })
}

export function WagmiRainbowKitProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { resolvedTheme } = useTheme()

  // Memoize config to avoid re-creation
  const config = useMemo(() => getWagmiConfig(), [])

  // Determine which theme to use based on the current theme
  // Use resolvedTheme to handle 'system' theme correctly
  const currentTheme = useMemo(
    () => (resolvedTheme === 'dark' ? customDarkTheme : customLightTheme),
    [resolvedTheme]
  )

  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={currentTheme} modalSize='wide'>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default WagmiRainbowKitProvider
