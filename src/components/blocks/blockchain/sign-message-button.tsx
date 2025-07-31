'use client'

import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useUnifiedWalletInfo } from '@/context'
import { useUnifiedWalletAuth } from '@/hooks/blockchain/use-unified-wallet-auth'
import { cn } from '@/lib'

interface SignMessageButtonProps {
  className?: string
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  children?: React.ReactNode
}

export function SignMessageButton({
  className,
  variant = 'default',
  size = 'default',
  children = 'Sign to Access Dashboard'
}: SignMessageButtonProps) {
  const { isConnected } = useUnifiedWalletInfo()
  const { authenticate, isAuthenticating } = useUnifiedWalletAuth()

  if (!isConnected) {
    return null
  }

  return (
    <Button
      onClick={authenticate}
      disabled={isAuthenticating}
      variant={variant}
      size={size}
      className={cn(className)}
    >
      {isAuthenticating ? (
        <>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          Signing...
        </>
      ) : (
        children
      )}
    </Button>
  )
}
