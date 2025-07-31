'use client'

import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { isWalletProvider, WalletProviders } from '@/config/wallet-provider'
import { useUnifiedChainInfo } from '@/context'

import { NetworkSelectorFallback } from './network-selector-fallback'

// Dynamically import provider-specific components
const ThirdwebNetworkButton = dynamic(
  () =>
    import('thirdweb/react').then(mod => ({
      default: function ThirdwebNetwork() {
        const activeChain = mod.useActiveWalletChain()
        const networkSwitcher = mod.useNetworkSwitcherModal()
        const { thirdwebClient } = require('@/lib/blockchain/thirdweb-client')
        const {
          getThirdwebMainnets,
          getThirdwebTestnets
        } = require('@/lib/blockchain')

        const mainnets = getThirdwebMainnets()
        const testnets = getThirdwebTestnets()

        if (!activeChain) return <NetworkSelectorFallback />

        return (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              networkSwitcher.open({
                client: thirdwebClient,
                sections: [
                  ...(mainnets.length > 0
                    ? [
                        {
                          label: 'Mainnets',
                          chains: mainnets
                        }
                      ]
                    : []),
                  ...(testnets.length > 0
                    ? [
                        {
                          label: 'Testnets',
                          chains: testnets
                        }
                      ]
                    : [])
                ]
              })
            }}
            className='hover:bg-accent/50 border-border bg-background/50 hover:border-accent flex h-10 items-center gap-2 rounded-xl border px-4 py-2 transition-all'
          >
            <div className='flex items-center gap-3'>
              <mod.ChainProvider chain={activeChain}>
                <div className='bg-muted flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg'>
                  <mod.ChainIcon
                    client={thirdwebClient}
                    className='h-4 w-4 flex-shrink-0'
                    loadingComponent={
                      <div className='h-4 w-4 animate-pulse rounded-full bg-gray-300 dark:bg-gray-600' />
                    }
                  />
                </div>
              </mod.ChainProvider>
              <span className='text-foreground hidden text-sm font-medium sm:inline'>
                {activeChain.name || `Chain ${activeChain.id}`}
              </span>
            </div>
          </Button>
        )
      }
    })),
  { ssr: false }
)

const RainbowKitNetworkButton = dynamic(
  () =>
    import('@rainbow-me/rainbowkit').then(mod => ({
      default: function RainbowKitNetwork() {
        return (
          <mod.ConnectButton.Custom>
            {({ chain, openChainModal }) =>
              chain ? (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={openChainModal}
                  className='hover:bg-accent/50 border-border bg-background/50 hover:border-accent flex h-10 items-center gap-2 rounded-xl border px-4 py-2 transition-all'
                >
                  <div className='flex items-center gap-3'>
                    {chain.hasIcon && (
                      <div className='bg-muted flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg'>
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            className='h-4 w-4'
                          />
                        )}
                      </div>
                    )}
                    <span className='text-foreground hidden text-sm font-medium sm:inline'>
                      {chain.name || 'Unknown Chain'}
                    </span>
                  </div>
                </Button>
              ) : (
                <NetworkSelectorFallback />
              )
            }
          </mod.ConnectButton.Custom>
        )
      }
    })),
  { ssr: false }
)

interface NetworkSelectorProps {
  className?: string
  showLabel?: boolean
  isAuthenticated?: boolean
}

export function NetworkSelector({
  className,
  showLabel = true,
  isAuthenticated = false
}: NetworkSelectorProps) {
  const { chainId } = useUnifiedChainInfo()

  // If wallet is connected, use provider-specific network button
  if (chainId) {
    if (isWalletProvider(WalletProviders.THIRDWEB)) {
      return <ThirdwebNetworkButton />
    } else if (isWalletProvider(WalletProviders.RAINBOW_KIT)) {
      return <RainbowKitNetworkButton />
    }
  }

  // Fallback network selector for when wallet is not connected
  return (
    <NetworkSelectorFallback
      className={className}
      showLabel={showLabel}
      isAuthenticated={isAuthenticated}
    />
  )
}
