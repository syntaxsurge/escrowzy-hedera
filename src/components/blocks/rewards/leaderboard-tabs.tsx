'use client'

import { useState } from 'react'

import { motion } from 'framer-motion'
import { Trophy, Swords, DollarSign, Activity, Users } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib'

import { Leaderboard } from './leaderboard'

interface LeaderboardTabsProps {
  xpLeaderboard?: any[]
  battleLeaderboard?: any[]
  tradeLeaderboard?: any[]
  streakLeaderboard?: any[]
  currentUserId?: number
  period?: 'daily' | 'weekly' | 'monthly' | 'all_time'
  className?: string
}

export function LeaderboardTabs({
  xpLeaderboard = [],
  battleLeaderboard = [],
  tradeLeaderboard = [],
  streakLeaderboard = [],
  currentUserId,
  period = 'all_time',
  className
}: LeaderboardTabsProps) {
  const [activeTab, setActiveTab] = useState('xp')

  const categories = [
    {
      id: 'xp',
      label: 'XP Leaders',
      icon: Trophy,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      data: xpLeaderboard,
      description: 'Top players by experience points'
    },
    {
      id: 'battles',
      label: 'Battle Champions',
      icon: Swords,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      data: battleLeaderboard,
      description: 'Most victories in the arena'
    },
    {
      id: 'trades',
      label: 'Trade Masters',
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      data: tradeLeaderboard,
      description: 'Highest trading volume'
    },
    {
      id: 'streaks',
      label: 'Dedication',
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      data: streakLeaderboard,
      description: 'Longest login streaks'
    }
  ]

  const _activeCategory = categories.find(c => c.id === activeTab)

  return (
    <div className={cn('space-y-6', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid h-auto w-full grid-cols-4 p-1'>
          {categories.map(category => {
            const Icon = category.icon
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className='data-[state=active]:bg-background flex flex-col items-center gap-1 py-3'
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    activeTab === category.id
                      ? category.color
                      : 'text-muted-foreground'
                  )}
                />
                <span className='text-xs font-medium'>{category.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category.id} value={category.id} className='mt-6'>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className='mb-4 flex items-center gap-3'>
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    category.bgColor
                  )}
                >
                  <category.icon className={cn('h-5 w-5', category.color)} />
                </div>
                <div>
                  <h3 className='text-lg font-bold'>{category.label}</h3>
                  <p className='text-muted-foreground text-sm'>
                    {category.description}
                  </p>
                </div>
              </div>

              {category.data.length > 0 ? (
                <Leaderboard
                  entries={category.data}
                  currentUserId={currentUserId}
                  period={period}
                />
              ) : (
                <div className='rounded-lg border border-dashed p-8 text-center'>
                  <Users className='text-muted-foreground/50 mx-auto h-12 w-12' />
                  <p className='text-muted-foreground mt-2 text-sm'>
                    No data available for this leaderboard yet
                  </p>
                  <p className='text-muted-foreground/70 mt-1 text-xs'>
                    Be the first to claim the top spot!
                  </p>
                </div>
              )}
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Period selector */}
      <div className='flex items-center justify-center gap-2'>
        {(['daily', 'weekly', 'monthly', 'all_time'] as const).map(p => (
          <button
            key={p}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              period === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
            onClick={() => {
              // This would typically trigger a data refresh with the new period
              console.log('Period changed to:', p)
            }}
          >
            {p.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  )
}
