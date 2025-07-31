'use client'

import { Network } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useNetwork } from '@/context'
import { useDialogState } from '@/hooks/use-dialog-state'
import { cn } from '@/lib'
import {
  DEFAULT_CHAIN_ID,
  getChainLogo,
  isSupportedChainId,
  SUPPORTED_NETWORKS,
  type SupportedChainIds
} from '@/lib/blockchain'

interface NetworkSelectorFallbackProps {
  className?: string
  showLabel?: boolean
  isAuthenticated?: boolean
}

export function NetworkSelectorFallback({
  className,
  showLabel = true
}: NetworkSelectorFallbackProps) {
  const menuState = useDialogState()
  const { selectedChainId, setSelectedChainId } = useNetwork()

  const currentNetwork = isSupportedChainId(selectedChainId)
    ? SUPPORTED_NETWORKS[selectedChainId]
    : SUPPORTED_NETWORKS[DEFAULT_CHAIN_ID as SupportedChainIds]

  const currentChainId = isSupportedChainId(selectedChainId)
    ? selectedChainId
    : (DEFAULT_CHAIN_ID as SupportedChainIds)
  const currentLogo = getChainLogo(currentChainId)

  return (
    <DropdownMenu
      open={menuState.isOpen}
      onOpenChange={open => (open ? menuState.open() : menuState.close())}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className={cn(
            'hover:bg-accent/50 border-border bg-background/50 hover:border-accent flex h-10 items-center gap-2 rounded-xl border px-4 py-2 transition-all',
            className
          )}
        >
          <div className='flex items-center gap-3'>
            <div className='bg-muted flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg'>
              {currentLogo ? (
                <img
                  src={currentLogo}
                  alt={`${currentNetwork?.name} logo`}
                  className='h-4 w-4 object-contain'
                />
              ) : (
                <Network className='text-muted-foreground h-3.5 w-3.5' />
              )}
            </div>
            {showLabel && (
              <span className='text-foreground hidden text-sm font-medium sm:inline'>
                {currentNetwork?.name || 'Select Network'}
              </span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='border-border bg-background/95 mt-2 w-64 rounded-xl border shadow-xl backdrop-blur-xl'
      >
        <div className='p-2'>
          <div className='mb-2 px-3 py-2'>
            <div className='text-muted-foreground flex items-center justify-between text-xs font-medium'>
              <span>Network</span>
              <span>Chain ID</span>
            </div>
          </div>
          {Object.entries(SUPPORTED_NETWORKS).map(([id, network]) => {
            const chainLogo = getChainLogo(Number(id))
            return (
              <DropdownMenuItem
                key={id}
                onClick={() => {
                  setSelectedChainId(Number(id) as SupportedChainIds)
                  menuState.close()
                }}
                className={cn(
                  'hover:bg-accent cursor-pointer rounded-lg px-3 py-3 transition-all',
                  selectedChainId === Number(id) &&
                    'bg-primary/10 text-primary hover:bg-primary/15'
                )}
              >
                <div className='flex w-full items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg',
                        selectedChainId === Number(id)
                          ? 'bg-primary/20'
                          : 'bg-muted'
                      )}
                    >
                      {chainLogo ? (
                        <img
                          src={chainLogo}
                          alt={`${network.name} logo`}
                          className='h-5 w-5 object-contain'
                        />
                      ) : (
                        <Network
                          className={cn(
                            'h-4 w-4',
                            selectedChainId === Number(id)
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          )}
                        />
                      )}
                    </div>
                    <span className='text-sm font-medium'>{network.name}</span>
                  </div>
                  <span className='text-muted-foreground text-sm font-medium'>
                    {id}
                  </span>
                </div>
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
