'use client'

import { Activity } from 'lucide-react'

import { cn } from '@/lib'
import { getOKXErrorMessage, formatPrice } from '@/lib/utils/market'

interface PriceDisplayProps {
  title: string
  price: number | null
  error?: {
    type: string
    message: string
  } | null
  loading?: boolean
  currency?: string
  className?: string
  icon?: React.ReactNode
  iconColor?: string
  size?: 'sm' | 'md' | 'lg'
}

export function PriceDisplay({
  title,
  price,
  error,
  loading = false,
  currency,
  className,
  icon = <Activity className='h-4 w-4' />,
  iconColor = 'text-blue-500',
  size = 'md'
}: PriceDisplayProps) {
  const sizeClasses = {
    sm: {
      container: 'p-3',
      title: 'text-xs',
      price: 'text-lg',
      error: 'text-xs',
      currency: 'text-xs'
    },
    md: {
      container: 'p-4',
      title: 'text-sm',
      price: 'text-2xl',
      error: 'text-sm',
      currency: 'text-xs'
    },
    lg: {
      container: 'p-5',
      title: 'text-base',
      price: 'text-3xl',
      error: 'text-base',
      currency: 'text-sm'
    }
  }

  const styles = sizeClasses[size]

  return (
    <div
      className={cn(
        'border-border/50 bg-muted/50 rounded-lg border',
        styles.container,
        className
      )}
    >
      <div className='mb-2 flex items-center gap-2'>
        <span className={iconColor}>{icon}</span>
        <span
          className={cn('text-muted-foreground font-semibold', styles.title)}
        >
          {title}
        </span>
      </div>
      <p className={cn('font-bold', styles.price)}>
        {loading ? (
          <span className='text-muted-foreground'>Loading...</span>
        ) : price !== null ? (
          formatPrice(price)
        ) : (
          <span className={cn('text-muted-foreground', styles.error)}>
            {getOKXErrorMessage(error)}
          </span>
        )}
      </p>
      {currency && (
        <p className={cn('text-muted-foreground mt-1', styles.currency)}>
          {currency}
        </p>
      )}
    </div>
  )
}

interface InlinePriceDisplayProps {
  label: string
  price: number | null
  error?: {
    type: string
    message: string
  } | null
  priceClassName?: string
  errorClassName?: string
}

export function InlinePriceDisplay({
  label,
  price,
  error,
  priceClassName = 'ml-2 font-bold text-blue-600 dark:text-blue-400',
  errorClassName = 'ml-2 text-xs text-muted-foreground'
}: InlinePriceDisplayProps) {
  return (
    <div>
      <span className='text-muted-foreground'>{label}:</span>
      {price !== null ? (
        <span className={priceClassName}>{formatPrice(price)}</span>
      ) : (
        <span className={errorClassName}>{getOKXErrorMessage(error)}</span>
      )}
    </div>
  )
}
