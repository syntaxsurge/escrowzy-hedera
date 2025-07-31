'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { motion } from 'framer-motion'
import { Trophy, Zap, Flame, Target } from 'lucide-react'

import { XPBar, LevelBadge } from '@/components/blocks/rewards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { appRoutes } from '@/config/app-routes'
import { useRewards } from '@/hooks/use-rewards'
import { cn } from '@/lib'

interface RewardsWidgetProps {
  userId: number
  className?: string
}

export function RewardsWidget({ userId, className }: RewardsWidgetProps) {
  const { stats, handleDailyLogin, isLoading } = useRewards(userId)

  useEffect(() => {
    if (userId) {
      handleDailyLogin()
    }
  }, [userId, handleDailyLogin])

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className='bg-muted h-6 w-32 rounded' />
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='bg-muted h-20 rounded' />
            <div className='bg-muted h-8 rounded' />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats?.gameData) {
    return (
      <Card className={cn('border-2 border-purple-500/20', className)}>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Trophy className='h-5 w-5 text-yellow-500' />
            Start Your Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground mb-4'>
            Begin your gaming adventure and earn rewards!
          </p>
          <Link href={appRoutes.rewards.base} className='block w-full'>
            <motion.button
              className='w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg'
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className='flex items-center justify-center gap-2'>
                <Zap className='h-4 w-4' />
                Start Gaming Journey
              </span>
            </motion.button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all hover:shadow-lg',
        className
      )}
    >
      <div className='absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-0 transition-opacity group-hover:opacity-100 dark:from-purple-950/20 dark:to-pink-950/20' />

      <CardHeader className='relative'>
        <CardTitle className='flex items-center justify-between'>
          <span className='flex items-center gap-2'>
            <Trophy className='h-5 w-5 text-yellow-500' />
            Your Progress
          </span>
          <Link
            href={appRoutes.rewards.base}
            className='text-primary text-sm font-normal hover:underline'
          >
            View all →
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className='relative space-y-4'>
        <div className='flex items-center justify-between'>
          <LevelBadge
            level={stats.gameData?.level || 1}
            size='md'
            showTitle={false}
            animated={false}
          />
          <div className='text-right'>
            <p className='text-2xl font-bold'>
              {(stats.gameData?.xp || 0).toLocaleString()}
            </p>
            <p className='text-muted-foreground text-xs'>Total XP</p>
          </div>
        </div>

        <XPBar
          currentXP={stats.gameData?.xp || 0}
          requiredXP={stats.nextLevelXP || 100}
          level={stats.gameData?.level || 1}
          showAnimation={false}
        />

        <div className='grid grid-cols-3 gap-2 pt-2'>
          <motion.div
            className='bg-secondary/50 rounded-lg p-2 text-center'
            whileHover={{ scale: 1.05 }}
          >
            <Flame className='mx-auto mb-1 h-4 w-4 text-orange-500' />
            <p className='text-lg font-bold'>
              {stats.gameData?.loginStreak || 0}
            </p>
            <p className='text-muted-foreground text-xs'>Day Streak</p>
          </motion.div>

          <motion.div
            className='bg-secondary/50 rounded-lg p-2 text-center'
            whileHover={{ scale: 1.05 }}
          >
            <Trophy className='mx-auto mb-1 h-4 w-4 text-yellow-500' />
            <p className='text-lg font-bold'>
              {stats.achievements?.unlocked || 0}
            </p>
            <p className='text-muted-foreground text-xs'>Achievements</p>
          </motion.div>

          <motion.div
            className='bg-secondary/50 rounded-lg p-2 text-center'
            whileHover={{ scale: 1.05 }}
          >
            <Target className='mx-auto mb-1 h-4 w-4 text-blue-500' />
            <p className='text-lg font-bold'>
              {stats.quests?.daily?.completed || 0}/
              {stats.quests?.daily?.total || 0}
            </p>
            <p className='text-muted-foreground text-xs'>Daily Quests</p>
          </motion.div>
        </div>

        <Link href={appRoutes.rewards.base} className='block w-full'>
          <motion.button
            className='w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg'
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className='flex items-center justify-center gap-2'>
              <Zap className='h-4 w-4' />
              View Gaming Dashboard
            </span>
          </motion.button>
        </Link>
      </CardContent>
    </Card>
  )
}
