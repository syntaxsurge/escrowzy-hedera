'use client'

import { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib'

interface ActionAlertProps {
  title: string
  description: string
  icon: ReactNode
  badge?: string
  actionCount?: number
  variant?: 'warning' | 'danger' | 'info' | 'success'
  className?: string
  progressBar?: boolean
  progressValue?: number
}

const variants = {
  warning: {
    border: 'border-orange-500/50',
    bg: 'bg-gradient-to-br from-orange-500/20 via-red-500/20 to-yellow-500/20',
    hover:
      'hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-500/30',
    iconBg: 'bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500',
    titleColor: 'from-orange-500 via-red-500 to-yellow-500',
    textColor: 'text-orange-600 dark:text-orange-400',
    badgeBg: 'bg-gradient-to-r from-orange-500 to-red-500',
    progressBg: 'bg-gradient-to-r from-orange-500 to-red-500',
    pulseBg: 'bg-gradient-to-r from-orange-600/10 to-red-600/10'
  },
  danger: {
    border: 'border-red-500/50',
    bg: 'bg-gradient-to-br from-red-500/20 via-pink-500/20 to-purple-500/20',
    hover: 'hover:border-red-500 hover:shadow-2xl hover:shadow-red-500/30',
    iconBg: 'bg-gradient-to-br from-red-500 via-pink-500 to-purple-500',
    titleColor: 'from-red-500 via-pink-500 to-purple-500',
    textColor: 'text-red-600 dark:text-red-400',
    badgeBg: 'bg-gradient-to-r from-red-500 to-pink-600',
    progressBg: 'bg-gradient-to-r from-red-500 to-pink-500',
    pulseBg: 'bg-gradient-to-r from-red-600/10 to-pink-600/10'
  },
  info: {
    border: 'border-blue-500/50',
    bg: 'bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20',
    hover: 'hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/30',
    iconBg: 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500',
    titleColor: 'from-blue-500 via-indigo-500 to-purple-500',
    textColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    progressBg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    pulseBg: 'bg-gradient-to-r from-blue-600/10 to-indigo-600/10'
  },
  success: {
    border: 'border-green-500/50',
    bg: 'bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20',
    hover: 'hover:border-green-500 hover:shadow-2xl hover:shadow-green-500/30',
    iconBg: 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500',
    titleColor: 'from-green-500 via-emerald-500 to-teal-500',
    textColor: 'text-green-600 dark:text-green-400',
    badgeBg: 'bg-gradient-to-r from-green-500 to-emerald-600',
    progressBg: 'bg-gradient-to-r from-green-500 to-emerald-500',
    pulseBg: 'bg-gradient-to-r from-green-600/10 to-emerald-600/10'
  }
}

export function ActionAlert({
  title,
  description,
  icon,
  badge,
  actionCount,
  variant = 'warning',
  className,
  progressBar = false,
  progressValue = 75
}: ActionAlertProps) {
  const v = variants[variant]

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 backdrop-blur-sm transition-all hover:scale-[1.02]',
        v.border,
        v.bg,
        v.hover,
        className
      )}
    >
      <div className={cn('absolute inset-0 animate-pulse', v.pulseBg)} />
      <div
        className='absolute top-0 left-0 h-full w-2 animate-pulse bg-gradient-to-b'
        style={{
          background: `linear-gradient(to bottom, var(--tw-gradient-stops))`
        }}
      />

      <div className='relative z-10 p-6'>
        <div className='flex items-start gap-4'>
          <div className='relative'>
            <div
              className={cn(
                'absolute inset-0 animate-pulse rounded-full opacity-60 blur-xl',
                v.iconBg
              )}
            />
            <div className={cn('relative rounded-xl p-3 shadow-xl', v.iconBg)}>
              <div className='h-6 w-6 text-white'>{icon}</div>
            </div>
          </div>

          <div className='flex-1'>
            <div className='mb-2 flex items-center gap-3'>
              <h3
                className={cn(
                  'bg-gradient-to-r bg-clip-text text-xl font-black text-transparent',
                  v.titleColor
                )}
              >
                {title}
              </h3>
              {badge && (
                <Badge
                  className={cn(
                    'animate-pulse border-0 text-white shadow-lg',
                    v.badgeBg
                  )}
                >
                  {badge}
                </Badge>
              )}
            </div>
            <p className={cn('text-sm font-medium', v.textColor)}>
              {description}
            </p>
            {progressBar && (
              <div className='mt-3 flex items-center gap-2'>
                <div className='h-2 flex-1 overflow-hidden rounded-full bg-black/20 dark:bg-white/20'>
                  <div
                    className={cn(
                      'h-full animate-pulse rounded-full',
                      v.progressBg
                    )}
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
                <span
                  className={cn('text-xs font-bold uppercase', v.textColor)}
                >
                  Time Limited
                </span>
              </div>
            )}
          </div>

          {actionCount !== undefined && (
            <div className='flex flex-col items-center gap-2'>
              <div className={cn('text-3xl font-black', v.textColor)}>
                {actionCount}
              </div>
              <span
                className={cn(
                  'text-xs tracking-wider uppercase',
                  v.textColor,
                  'opacity-80'
                )}
              >
                Pending
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
