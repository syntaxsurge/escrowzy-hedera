'use client'

import { AlertCircle, ArrowRight, Network } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useUnifiedChainInfo, useBlockchain } from '@/context/blockchain'
import { getChainMetadata } from '@/lib/blockchain'
import { CHAINS } from '@/lib/config/chain-mappings'

export function UnsupportedChainForSwap() {
  const { chainId } = useUnifiedChainInfo()
  const { switchChain } = useBlockchain()
  const currentChain = chainId ? getChainMetadata(chainId) : null

  // Get list of supported chains
  const supportedChains = Object.values(CHAINS)
    .filter(chain => chain.okxSupported && !chain.isTestnet)
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleSwitchChain = async (targetChainId: string) => {
    try {
      if (switchChain) {
        await switchChain(Number(targetChainId))
      }
    } catch (error) {
      console.error('Failed to switch chain:', error)
    }
  }

  return (
    <div className='from-background via-background to-primary/5 dark:to-primary/10 min-h-[600px] bg-gradient-to-br py-12'>
      <div className='container mx-auto max-w-4xl px-4'>
        <Card className='relative overflow-hidden border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10'>
          <div className='absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-yellow-500 to-orange-600'>
            <div className='animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent' />
          </div>

          <div className='p-8'>
            {/* Header */}
            <div className='mb-8 flex items-center justify-center'>
              <div className='rounded-lg bg-gradient-to-br from-yellow-600 to-orange-700 p-4 shadow-lg'>
                <AlertCircle className='h-12 w-12 text-white' />
              </div>
            </div>

            {/* Title */}
            <h2 className='mb-4 text-center text-3xl font-black'>
              CHAIN NOT SUPPORTED
            </h2>

            {/* Current Chain Info */}
            <div className='mb-6 text-center'>
              <p className='text-muted-foreground mb-2 text-lg'>
                You are currently connected to:
              </p>
              <div className='inline-flex items-center gap-2 rounded-lg bg-black/10 px-4 py-2 dark:bg-white/10'>
                <Network className='h-5 w-5' />
                <span className='font-bold'>
                  {currentChain?.name || `Chain ${chainId}`}
                </span>
              </div>
            </div>

            {/* Message */}
            <p className='text-muted-foreground mb-8 text-center text-lg'>
              Token swap is not available on this network. Please switch to one
              of the supported chains below:
            </p>

            {/* Supported Chains Grid */}
            <div className='mb-8'>
              <h3 className='text-muted-foreground mb-4 text-center text-sm font-bold uppercase'>
                Supported Networks
              </h3>
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {supportedChains.map(chain => (
                  <Button
                    key={chain.chainId}
                    variant='outline'
                    className='group hover:border-primary/50 relative h-auto flex-col items-start gap-2 border-2 p-4 transition-all hover:scale-105'
                    onClick={() => handleSwitchChain(chain.chainId)}
                  >
                    <div className='flex w-full items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <span className='font-bold'>{chain.name}</span>
                      </div>
                      <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
                    </div>
                    <div className='flex w-full items-center gap-2'>
                      <Badge variant='secondary' className='text-xs'>
                        {chain.nativeCurrency.symbol}
                      </Badge>
                      <Badge variant='outline' className='text-xs'>
                        ID: {chain.chainId}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className='rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4'>
              <div className='flex items-start gap-3'>
                <AlertCircle className='mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500' />
                <div className='space-y-2'>
                  <p className='text-sm font-semibold'>
                    Why is my chain not supported?
                  </p>
                  <p className='text-muted-foreground text-sm'>
                    Token swap functionality is powered by OKX DEX aggregator,
                    which currently supports major EVM chains. We are working on
                    adding support for more networks in the future.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
