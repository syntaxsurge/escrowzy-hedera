'use client'

import { ReactNode } from 'react'

import { cn } from '@/lib'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  className
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'from-primary/20 border-primary/20 relative overflow-hidden rounded-2xl border bg-gradient-to-r via-purple-600/20 to-pink-600/20 shadow-2xl backdrop-blur-sm',
        className
      )}
    >
      <div className='bg-grid-white/5 dark:bg-grid-white/10 absolute inset-0' />
      <div className='absolute top-0 left-0 h-full w-full'>
        <div className='bg-primary/20 absolute top-10 left-10 h-32 w-32 animate-pulse rounded-full blur-3xl' />
        <div className='absolute right-10 bottom-10 h-40 w-40 animate-pulse rounded-full bg-purple-600/20 blur-3xl delay-700' />
      </div>

      <div className='relative z-10 p-8'>
        <div className='flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center'>
          <div className='flex items-center gap-4'>
            <div className='relative'>
              <div className='from-primary absolute inset-0 animate-pulse rounded-xl bg-gradient-to-r to-purple-600 opacity-60 blur-lg' />
              <div className='from-primary relative rounded-xl bg-gradient-to-br via-purple-600 to-pink-600 p-3 shadow-xl'>
                {icon}
              </div>
            </div>
            <div>
              <h1 className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-4xl font-black text-transparent'>
                {title}
              </h1>
              {subtitle && (
                <p className='text-muted-foreground mt-1 text-sm'>{subtitle}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className='flex flex-wrap items-center gap-3'>{actions}</div>
          )}
        </div>
      </div>
    </div>
  )
}
