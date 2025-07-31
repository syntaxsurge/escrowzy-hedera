import { Loader2 } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib'

// Spinner Loading Component
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2',
        className
      )}
    >
      <Loader2 className={cn('text-primary animate-spin', sizeClasses[size])} />
      {label && <p className='text-muted-foreground text-sm'>{label}</p>}
    </div>
  )
}

// Page Loading Component
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className='flex h-[50vh] items-center justify-center'>
      <Spinner size='lg' label={message} />
    </div>
  )
}

// Card Skeleton Component
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card space-y-4 rounded-lg border p-6', className)}>
      <Skeleton className='h-4 w-1/2' />
      <Skeleton className='h-20' />
      <div className='flex justify-between'>
        <Skeleton className='h-4 w-1/3' />
        <Skeleton className='h-4 w-1/4' />
      </div>
    </div>
  )
}

// List Skeleton Component
interface ListSkeletonProps {
  count?: number
  className?: string
}

export function ListSkeleton({ count = 3, className }: ListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className='flex items-center space-x-4'>
          <Skeleton className='h-12 w-12 rounded-full' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-3 w-3/4' />
          </div>
        </div>
      ))}
    </div>
  )
}

// Form Skeleton Component
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className='space-y-6'>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className='space-y-2'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-10 w-full' />
        </div>
      ))}
      <Skeleton className='h-10 w-32' />
    </div>
  )
}

// Stats Widget Skeleton
export function StatsWidgetSkeleton() {
  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className='bg-card space-y-2 rounded-lg border p-6'>
          <Skeleton className='h-4 w-20' />
          <Skeleton className='h-8 w-24' />
          <Skeleton className='h-3 w-32' />
        </div>
      ))}
    </div>
  )
}

// Chat Message Skeleton
export function ChatMessageSkeleton() {
  return (
    <div className='space-y-4'>
      <div className='flex gap-3'>
        <Skeleton className='h-8 w-8 rounded-full' />
        <div className='flex-1 space-y-2'>
          <Skeleton className='h-3 w-24' />
          <Skeleton className='h-16 w-3/4' />
        </div>
      </div>
      <div className='flex justify-end gap-3'>
        <div className='flex flex-1 flex-col items-end space-y-2'>
          <Skeleton className='h-3 w-24' />
          <Skeleton className='h-16 w-3/4' />
        </div>
        <Skeleton className='h-8 w-8 rounded-full' />
      </div>
    </div>
  )
}

// Trade Card Skeleton
export function TradeCardSkeleton() {
  return (
    <div className='bg-card space-y-4 rounded-lg border p-6'>
      <div className='flex items-start justify-between'>
        <div className='space-y-2'>
          <Skeleton className='h-6 w-32' />
          <Skeleton className='h-4 w-24' />
        </div>
        <Skeleton className='h-6 w-20' />
      </div>
      <div className='space-y-2'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-3/4' />
      </div>
      <div className='flex gap-2'>
        <Skeleton className='h-9 w-24' />
        <Skeleton className='h-9 w-24' />
      </div>
    </div>
  )
}

// Listing Card Skeleton
export function ListingCardSkeleton() {
  return (
    <div className='bg-card space-y-4 rounded-lg border p-6'>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-6 w-20' />
        <Skeleton className='h-6 w-24' />
      </div>
      <div className='space-y-2'>
        <div className='flex justify-between'>
          <Skeleton className='h-4 w-20' />
          <Skeleton className='h-4 w-24' />
        </div>
        <div className='flex justify-between'>
          <Skeleton className='h-4 w-20' />
          <Skeleton className='h-4 w-32' />
        </div>
      </div>
      <Skeleton className='h-10 w-full' />
    </div>
  )
}

// Battle Arena Skeleton
export function BattleArenaSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-10 w-32' />
      </div>
      <div className='grid gap-6 md:grid-cols-2'>
        <div className='space-y-4'>
          <Skeleton className='h-6 w-24' />
          <div className='space-y-3 rounded-lg border p-6'>
            <Skeleton className='mx-auto h-20 w-20 rounded-full' />
            <Skeleton className='mx-auto h-6 w-32' />
            <Skeleton className='mx-auto h-4 w-24' />
          </div>
        </div>
        <div className='space-y-4'>
          <Skeleton className='h-6 w-24' />
          <div className='space-y-3 rounded-lg border p-6'>
            <Skeleton className='mx-auto h-20 w-20 rounded-full' />
            <Skeleton className='mx-auto h-6 w-32' />
            <Skeleton className='mx-auto h-4 w-24' />
          </div>
        </div>
      </div>
    </div>
  )
}

// Achievement Card Skeleton
export function AchievementCardSkeleton() {
  return (
    <div className='bg-card space-y-3 rounded-lg border p-6'>
      <Skeleton className='mx-auto h-16 w-16 rounded-full' />
      <Skeleton className='mx-auto h-5 w-32' />
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-9 w-full' />
    </div>
  )
}

// Dashboard Overview Skeleton
export function DashboardSkeleton() {
  return (
    <div className='space-y-6'>
      <StatsWidgetSkeleton />
      <div className='grid gap-6 md:grid-cols-2'>
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className='space-y-4'>
        <Skeleton className='h-6 w-32' />
        <ListSkeleton count={5} />
      </div>
    </div>
  )
}
