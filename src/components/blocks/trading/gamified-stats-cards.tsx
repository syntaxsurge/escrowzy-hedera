'use client'

import { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib'

export interface StatCard {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  colorScheme: 'yellow' | 'blue' | 'orange' | 'red' | 'green' | 'purple'
  isLoading?: boolean
}

const colorSchemes = {
  yellow: {
    border: 'border-yellow-500/20',
    bg: 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10',
    hover:
      'hover:border-yellow-500/40 hover:shadow-xl hover:shadow-yellow-500/20',
    icon: 'bg-gradient-to-br from-yellow-500 to-orange-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
  },
  blue: {
    border: 'border-blue-500/20',
    bg: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10',
    hover: 'hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/20',
    icon: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
  },
  orange: {
    border: 'border-orange-500/20',
    bg: 'bg-gradient-to-br from-orange-500/10 to-red-500/10',
    hover:
      'hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/20',
    icon: 'bg-gradient-to-br from-orange-500 to-red-500',
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
  },
  red: {
    border: 'border-red-500/20',
    bg: 'bg-gradient-to-br from-red-500/10 to-pink-500/10',
    hover: 'hover:border-red-500/40 hover:shadow-xl hover:shadow-red-500/20',
    icon: 'bg-gradient-to-br from-red-500 to-pink-500',
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-500/20 text-red-600 dark:text-red-400'
  },
  green: {
    border: 'border-green-500/20',
    bg: 'bg-gradient-to-br from-green-500/10 to-emerald-500/10',
    hover:
      'hover:border-green-500/40 hover:shadow-xl hover:shadow-green-500/20',
    icon: 'bg-gradient-to-br from-green-500 to-emerald-500',
    text: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-500/20 text-green-600 dark:text-green-400'
  },
  purple: {
    border: 'border-purple-500/20',
    bg: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10',
    hover:
      'hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/20',
    icon: 'bg-gradient-to-br from-purple-500 to-pink-500',
    text: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
  }
}

interface GamifiedStatsCardsProps {
  cards: StatCard[]
  className?: string
  isLoading?: boolean
}

export function GamifiedStatsCards({
  cards,
  className,
  isLoading = false
}: GamifiedStatsCardsProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {cards.map((card, index) => {
        const scheme = colorSchemes[card.colorScheme]
        const cardIsLoading = isLoading || card.isLoading
        return (
          <div
            key={index}
            className={cn(
              'group relative overflow-hidden rounded-xl border-2 transition-all hover:scale-105',
              scheme.border,
              scheme.bg,
              scheme.hover
            )}
          >
            <div className='absolute inset-0 bg-gradient-to-br from-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
            <div className='relative p-6'>
              <div className='mb-2 flex items-center justify-between'>
                <div className={cn('rounded-lg p-2 shadow-lg', scheme.icon)}>
                  <div className='h-5 w-5 text-white'>{card.icon}</div>
                </div>
                {card.badge && (
                  <Badge
                    variant={card.badgeVariant}
                    className={cn('border-0', scheme.badge)}
                  >
                    {card.badge}
                  </Badge>
                )}
              </div>
              {cardIsLoading ? (
                <div className='flex h-12 items-center'>
                  <Spinner size='md' className={scheme.text} />
                </div>
              ) : (
                <div className={cn('text-4xl font-black', scheme.text)}>
                  {card.value}
                </div>
              )}
              <p className='text-muted-foreground mt-1 text-xs tracking-wider uppercase'>
                {card.title}
              </p>
              {!cardIsLoading && card.subtitle && (
                <p className='text-muted-foreground mt-1 text-xs'>
                  {card.subtitle}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
