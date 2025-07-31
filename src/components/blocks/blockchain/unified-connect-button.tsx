'use client'

import dynamic from 'next/dynamic'

import { inAppWallet } from 'thirdweb/wallets/in-app'

import { appRoutes } from '@/config/app-routes'
import { isWalletProvider, WalletProviders } from '@/config/wallet-provider'

const RainbowKitConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then(mod => mod.ConnectButton),
  { ssr: false }
)

const ThirdwebConnectButton = dynamic(
  () =>
    import('thirdweb/react').then(mod => ({
      default: function ThirdwebConnectButtonWrapper() {
        const { thirdwebClient } = require('@/lib/blockchain/thirdweb-client')
        const { ConnectButton } = mod
        const { createWallet } = require('thirdweb/wallets')
        const {
          getSupportedThirdwebChains,
          getThirdwebChain
        } = require('@/lib/blockchain')
        const { useNetwork } = require('@/context')

        const { selectedChainId } = useNetwork()
        const supportedChains = getSupportedThirdwebChains()
        const defaultChain = getThirdwebChain(selectedChainId)

        // Configure in-app wallet with social login options
        const wallets = [
          inAppWallet({
            auth: {
              options: [
                'email',
                'google',
                'apple',
                'facebook',
                'discord',
                'github'
              ]
            }
          }),
          createWallet('io.metamask'),
          createWallet('com.coinbase.wallet'),
          createWallet('me.rainbow'),
          createWallet('walletConnect')
        ]

        return (
          <ConnectButton
            client={thirdwebClient}
            chains={supportedChains}
            chain={defaultChain}
            wallets={wallets}
            autoConnect={{ timeout: 15000 }}
            connectModal={{
              showThirdwebBranding: false,
              size: 'wide',
              termsOfServiceUrl: appRoutes.terms,
              privacyPolicyUrl: appRoutes.privacy,
              requireApproval: false
            }}
            connectButton={{
              label: 'Sign in'
            }}
            appMetadata={{
              name: require('@/config/env.public').envPublic
                .NEXT_PUBLIC_APP_NAME,
              url: typeof window !== 'undefined' ? window.location.origin : ''
            }}
          />
        )
      }
    })),
  { ssr: false }
)

// Version without auto-connect for when we know user is disconnected
const ThirdwebConnectButtonNoAuto = dynamic(
  () =>
    import('thirdweb/react').then(mod => ({
      default: function ThirdwebConnectButtonWrapper() {
        const { thirdwebClient } = require('@/lib/blockchain/thirdweb-client')
        const { ConnectButton } = mod
        const { createWallet } = require('thirdweb/wallets')
        const {
          getSupportedThirdwebChains,
          getThirdwebChain
        } = require('@/lib/blockchain')
        const { useNetwork } = require('@/context')

        const { selectedChainId } = useNetwork()
        const supportedChains = getSupportedThirdwebChains()
        const defaultChain = getThirdwebChain(selectedChainId)

        // Configure in-app wallet with social login options
        const wallets = [
          inAppWallet({
            auth: {
              options: [
                'email',
                'google',
                'apple',
                'facebook',
                'discord',
                'github'
              ]
            }
          }),
          createWallet('io.metamask'),
          createWallet('com.coinbase.wallet'),
          createWallet('me.rainbow'),
          createWallet('walletConnect')
        ]

        return (
          <ConnectButton
            client={thirdwebClient}
            chains={supportedChains}
            chain={defaultChain}
            wallets={wallets}
            autoConnect={false} // Disable auto-connect
            connectModal={{
              showThirdwebBranding: false,
              size: 'wide',
              termsOfServiceUrl: appRoutes.terms,
              privacyPolicyUrl: appRoutes.privacy,
              requireApproval: false
            }}
            connectButton={{
              label: 'Sign in'
            }}
            appMetadata={{
              name: require('@/config/env.public').envPublic
                .NEXT_PUBLIC_APP_NAME,
              url: typeof window !== 'undefined' ? window.location.origin : ''
            }}
          />
        )
      }
    })),
  { ssr: false }
)

export function UnifiedConnectButton({
  skipAutoConnect = false
}: { skipAutoConnect?: boolean } = {}) {
  if (isWalletProvider(WalletProviders.THIRDWEB)) {
    return skipAutoConnect ? (
      <ThirdwebConnectButtonNoAuto />
    ) : (
      <ThirdwebConnectButton />
    )
  }

  return <RainbowKitConnectButton />
}
