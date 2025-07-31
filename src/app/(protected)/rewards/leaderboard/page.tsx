'use client'

import { useState, useEffect } from 'react'

import { motion } from 'framer-motion'
import {
  Trophy,
  Medal,
  Crown,
  TrendingUp,
  Users,
  Star,
  Zap,
  Flame
} from 'lucide-react'

import { PageHeader } from '@/components/blocks/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRewards } from '@/hooks/use-rewards'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib'

type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time'

export default function LeaderboardPage() {
  const { user } = useSession()
  const { leaderboard } = useRewards(user?.id)
  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time')
  const [animatedRank, setAnimatedRank] = useState(0)

  // Find current user's rank
  const userRank =
    leaderboard?.findIndex((entry: any) => entry.userId === user?.id) ?? -1
  const userEntry = leaderboard?.[userRank]

  useEffect(() => {
    if (userRank >= 0) {
      // Animate rank number
      const timer = setTimeout(() => {
        setAnimatedRank(userRank + 1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [userRank])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className='h-6 w-6 text-yellow-500' />
      case 2:
        return <Medal className='h-6 w-6 text-gray-400' />
      case 3:
        return <Medal className='h-6 w-6 text-amber-600' />
      default:
        return <Star className='h-5 w-5 text-purple-500' />
    }
  }

  const getRankGradient = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-500 to-amber-500'
      case 2:
        return 'from-gray-400 to-gray-500'
      case 3:
        return 'from-amber-600 to-orange-600'
      default:
        return 'from-purple-500 to-pink-500'
    }
  }

  return (
    <div className='container mx-auto space-y-6 p-6'>
      {/* Header */}
      <PageHeader
        title='GLOBAL LEADERBOARD'
        subtitle='Compete with players worldwide'
        icon={<Trophy className='h-8 w-8 text-white' />}
      />

      {/* User Stats Card */}
      {userEntry && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className='border-2 border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-4'>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className={cn(
                      'flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br shadow-lg',
                      getRankGradient(userRank + 1)
                    )}
                  >
                    <span className='text-2xl font-bold text-white'>
                      #{animatedRank}
                    </span>
                  </motion.div>
                  <div>
                    <p className='text-xl font-bold'>{user?.name || 'You'}</p>
                    <div className='mt-1 flex items-center gap-2'>
                      <Badge className='border-purple-500/50 bg-gradient-to-r from-purple-900/60 to-pink-900/60 text-purple-200 dark:from-purple-500/20 dark:to-pink-500/20 dark:text-purple-300'>
                        Level {userEntry.level}
                      </Badge>
                      <Badge className='border-yellow-500/50 bg-gradient-to-r from-yellow-900/60 to-amber-900/60 text-yellow-200 dark:from-yellow-500/20 dark:to-amber-500/20 dark:text-yellow-300'>
                        <Trophy className='mr-1 h-3 w-3' />
                        {userEntry.xp.toLocaleString()} XP
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-muted-foreground text-sm'>Your Rank</p>
                  <motion.p
                    className='text-3xl font-bold'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    #{animatedRank}
                  </motion.p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Period Selector */}
      <Tabs
        value={period}
        onValueChange={v => setPeriod(v as LeaderboardPeriod)}
      >
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='daily'>Daily</TabsTrigger>
          <TabsTrigger value='weekly'>Weekly</TabsTrigger>
          <TabsTrigger value='monthly'>Monthly</TabsTrigger>
          <TabsTrigger value='all_time'>All Time</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className='mt-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Trophy className='h-5 w-5 text-yellow-500' />
                Top Players -{' '}
                {period
                  .replace('_', ' ')
                  .replace(/\b\w/g, l => l.toUpperCase())}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Top 3 Podium */}
              <div className='mb-8 grid grid-cols-3 gap-4'>
                {leaderboard?.slice(0, 3).map((entry: any, index: number) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'relative',
                      index === 0 && 'order-2',
                      index === 1 && 'order-1',
                      index === 2 && 'order-3'
                    )}
                  >
                    <Card
                      className={cn(
                        'border-2 transition-all hover:shadow-lg',
                        index === 0 &&
                          'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-amber-500/10',
                        index === 1 &&
                          'border-gray-400/50 bg-gradient-to-br from-gray-400/10 to-gray-500/10',
                        index === 2 &&
                          'border-amber-600/50 bg-gradient-to-br from-amber-600/10 to-orange-600/10'
                      )}
                    >
                      <CardContent className='p-4 text-center'>
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 2, delay: index * 0.2 }}
                          className='mb-2 flex justify-center'
                        >
                          {getRankIcon(index + 1)}
                        </motion.div>
                        <p className='truncate font-bold'>{entry.name}</p>
                        <p className='text-muted-foreground text-sm'>
                          Level {entry.level}
                        </p>
                        <p className='mt-2 text-xl font-bold'>
                          {entry.xp.toLocaleString()}
                        </p>
                        <p className='text-muted-foreground text-xs'>XP</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Full Leaderboard */}
              <div className='space-y-2'>
                {leaderboard?.slice(3).map((entry: any, index: number) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.5) }}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-md',
                      entry.userId === user?.id &&
                        'border-purple-500/50 bg-purple-500/5'
                    )}
                  >
                    <div className='flex items-center gap-3'>
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20'>
                        <span className='font-bold'>#{index + 4}</span>
                      </div>
                      <div>
                        <p className='font-semibold'>{entry.name}</p>
                        <div className='mt-1 flex items-center gap-2'>
                          <Badge className='dark:bg-secondary border-gray-300 bg-gray-700 text-xs text-gray-100 dark:border-gray-600 dark:text-gray-300'>
                            Lvl {entry.level}
                          </Badge>
                          {entry.loginStreak > 0 && (
                            <Badge className='dark:bg-secondary border-orange-300 bg-orange-700 text-xs text-orange-100 dark:border-orange-600 dark:text-orange-300'>
                              <Flame className='mr-1 h-3 w-3' />
                              {entry.loginStreak} streak
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='text-lg font-bold'>
                        {entry.xp.toLocaleString()}
                      </p>
                      <p className='text-muted-foreground text-xs'>XP</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {(!leaderboard || leaderboard.length === 0) && (
                <div className='py-12 text-center'>
                  <Trophy className='text-muted-foreground/50 mx-auto mb-4 h-12 w-12' />
                  <p className='text-lg font-medium'>No players yet</p>
                  <p className='text-muted-foreground mt-2 text-sm'>
                    Be the first to claim the top spot!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stats Summary */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <Card className='border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Total Players</p>
                <p className='text-2xl font-bold'>{leaderboard?.length || 0}</p>
              </div>
              <Users className='h-8 w-8 text-purple-500' />
            </div>
          </CardContent>
        </Card>

        <Card className='border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-amber-500/10'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Top Score</p>
                <p className='text-2xl font-bold'>
                  {leaderboard?.[0]?.xp.toLocaleString() || 0}
                </p>
              </div>
              <Zap className='h-8 w-8 text-yellow-500' />
            </div>
          </CardContent>
        </Card>

        <Card className='border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Avg Level</p>
                <p className='text-2xl font-bold'>
                  {leaderboard?.length
                    ? Math.round(
                        leaderboard.reduce(
                          (acc: number, e: any) => acc + e.level,
                          0
                        ) / leaderboard.length
                      )
                    : 0}
                </p>
              </div>
              <TrendingUp className='h-8 w-8 text-green-500' />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
