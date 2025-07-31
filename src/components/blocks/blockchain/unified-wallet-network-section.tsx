'use client'

import dynamic from 'next/dynamic'

import { Network, Wallet } from 'lucide-react'

import {
  DisconnectButton,
  NetworkButton,
  WalletAddressButton,
  WalletSectionHeader
} from '@/components/blocks/wallet-controls'
import { isWalletProvider, WalletProviders } from '@/config/wallet-provider'
import { useUnifiedWalletInfo } from '@/context'
import { useWalletDisconnect } from '@/hooks/blockchain/use-wallet-disconnect'

// Lazy load provider-specific components
const RainbowKitConnectButton = dynamic(
  () =>
    import('@rainbow-me/rainbowkit').then(mod => ({
      default: mod.ConnectButton.Custom
    })),
  { ssr: false }
)

const ThirdwebWalletContent = dynamic(
  () =>
    import('thirdweb/react').then(mod => ({
      default: function ThirdwebContent({
        address,
        onCloseMenu
      }: {
        address?: string
        onCloseMenu?: () => void
      }) {
        const activeWallet = mod.useActiveWallet()
        const activeChain = mod.useActiveWalletChain()
        const networkSwitcher = mod.useNetworkSwitcherModal()
        const walletDetailsModal = mod.useWalletDetailsModal()

        const { thirdwebClient } = require('@/lib/blockchain/thirdweb-client')
        const {
          getThirdwebMainnets,
          getThirdwebTestnets
        } = require('@/lib/blockchain')

        const mainnets = getThirdwebMainnets()
        const testnets = getThirdwebTestnets()

        return (
          <>
            {/* Wallet Address */}
            {activeWallet && address && (
              <div>
                <WalletSectionHeader
                  icon={<Wallet className='h-4 w-4' />}
                  label='Wallet'
                />
                <div className='ml-6'>
                  <div className='overflow-hidden rounded-lg'>
                    <WalletAddressButton
                      address={address}
                      onClick={() => {
                        onCloseMenu?.()
                        walletDetailsModal.open({ client: thirdwebClient })
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Network Selector */}
            {activeChain && (
              <div>
                <WalletSectionHeader
                  icon={<Network className='h-4 w-4' />}
                  label='Network'
                />
                <div className='ml-6'>
                  <div className='overflow-hidden rounded-lg'>
                    <NetworkButton
                      chainName={activeChain.name || `Chain ${activeChain.id}`}
                      chainIcon={
                        <mod.ChainProvider chain={activeChain}>
                          <mod.ChainIcon
                            client={thirdwebClient}
                            className='h-6 w-6 flex-shrink-0 rounded-full'
                            loadingComponent={
                              <div className='h-6 w-6 animate-pulse rounded-full bg-gray-300 dark:bg-gray-600' />
                            }
                          />
                        </mod.ChainProvider>
                      }
                      onClick={() => {
                        onCloseMenu?.()
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
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )
      }
    })),
  { ssr: false }
)

interface WalletNetworkSectionProps {
  address?: string
  onCloseMenu?: () => void
  showWalletButton?: boolean
}

export function WalletNetworkSection({
  address,
  onCloseMenu,
  showWalletButton = false
}: WalletNetworkSectionProps) {
  const { disconnect: walletDisconnect } = useUnifiedWalletInfo()
  const { disconnect } = useWalletDisconnect()

  // Handle disconnect action
  const handleDisconnect = async () => {
    onCloseMenu?.()
    await disconnect(walletDisconnect)
  }

  if (showWalletButton) {
    return (
      <div className='p-2'>
        <DisconnectButton onClick={handleDisconnect} />
      </div>
    )
  }

  return (
    <div className='space-y-3 border-b border-gray-100/50 px-4 py-3 dark:border-gray-700/50'>
      {isWalletProvider(WalletProviders.THIRDWEB) ? (
        <ThirdwebWalletContent address={address} onCloseMenu={onCloseMenu} />
      ) : (
        <RainbowKitWalletContent address={address} onCloseMenu={onCloseMenu} />
      )}
    </div>
  )
}

// RainbowKit implementation
function RainbowKitWalletContent({
  address: _address,
  onCloseMenu
}: {
  address?: string
  onCloseMenu?: () => void
}) {
  return (
    <>
      {/* Wallet Address */}
      <div>
        <WalletSectionHeader
          icon={<Wallet className='h-4 w-4' />}
          label='Wallet'
        />
        <div className='ml-6'>
          <div className='overflow-hidden rounded-lg'>
            <RainbowKitConnectButton>
              {({ account, openAccountModal }) =>
                account && (
                  <WalletAddressButton
                    address={account.address}
                    onClick={() => {
                      onCloseMenu?.()
                      openAccountModal()
                    }}
                  />
                )
              }
            </RainbowKitConnectButton>
          </div>
        </div>
      </div>

      {/* Network Selector */}
      <div>
        <WalletSectionHeader
          icon={<Network className='h-4 w-4' />}
          label='Network'
        />
        <div className='ml-6'>
          <div className='overflow-hidden rounded-lg'>
            <RainbowKitConnectButton>
              {({ chain, openChainModal }) =>
                chain && (
                  <NetworkButton
                    chainName={chain.name || 'Unknown Chain'}
                    chainIcon={
                      chain.hasIcon && (
                        <div
                          className='h-6 w-6 flex-shrink-0 overflow-hidden rounded-full'
                          style={{ background: chain.iconBackground }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              className='h-6 w-6'
                            />
                          )}
                        </div>
                      )
                    }
                    isUnsupported={chain.unsupported}
                    onClick={() => {
                      onCloseMenu?.()
                      openChainModal()
                    }}
                  />
                )
              }
            </RainbowKitConnectButton>
          </div>
        </div>
      </div>
    </>
  )
}
