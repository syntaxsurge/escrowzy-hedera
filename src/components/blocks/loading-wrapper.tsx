import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib'

interface LoadingWrapperProps {
  isLoading: boolean
  children: React.ReactNode
  className?: string
  loadingClassName?: string
  variant?: 'default' | 'inline' | 'fullscreen' | 'button'
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function LoadingWrapper({
  isLoading,
  children,
  className,
  loadingClassName,
  variant = 'default',
  size = 'md',
  label
}: LoadingWrapperProps) {
  if (!isLoading) return <>{children}</>

  const sizeMap = {
    sm: 'h-12',
    md: 'h-24',
    lg: 'h-48'
  }

  switch (variant) {
    case 'button':
      return (
        <>
          <Spinner size='sm' className='mr-2' />
          {label || 'Loading...'}
        </>
      )

    case 'inline':
      return (
        <span
          className={cn('inline-flex items-center gap-2', loadingClassName)}
        >
          <Spinner size='sm' />
          {label && <span className='text-sm'>{label}</span>}
        </span>
      )

    case 'fullscreen':
      return (
        <div
          className={cn(
            'bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm',
            loadingClassName
          )}
        >
          <div className='flex flex-col items-center gap-4'>
            <Spinner size='lg' />
            {label && <p className='text-muted-foreground text-sm'>{label}</p>}
          </div>
        </div>
      )

    default:
      return (
        <div
          className={cn(
            'flex items-center justify-center',
            sizeMap[size],
            className,
            loadingClassName
          )}
        >
          <div className='flex flex-col items-center gap-2'>
            <Spinner size={size} />
            {label && <p className='text-muted-foreground text-sm'>{label}</p>}
          </div>
        </div>
      )
  }
}
