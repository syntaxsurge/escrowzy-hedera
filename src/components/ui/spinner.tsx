import { Loader2 } from 'lucide-react'

import { cn } from '@/lib'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin', sizeMap[size], className)}
      aria-label='Loading'
    />
  )
}

interface LoadingSpinnerProps extends SpinnerProps {
  label?: string
}

export function LoadingSpinner({
  className,
  size = 'md',
  label = 'Loading...'
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Spinner size={size} />
      <span className='text-muted-foreground text-sm'>{label}</span>
    </div>
  )
}
