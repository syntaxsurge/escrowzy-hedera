import * as React from 'react'

import { type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib'

interface LoadingButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  loadingText?: string
  asChild?: boolean
}

export function LoadingButton({
  isLoading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || isLoading}
      className={cn(className)}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
