'use client'

import { useEffect, useState } from 'react'

import { motion } from 'framer-motion'
import {
  TrendingUp,
  Award,
  Swords,
  Activity,
  Coins,
  Target,
  Flame
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiEndpoints } from '@/config/api-endpoints'
import { cn } from '@/lib'
import { api } from '@/lib/api/http-client'
import type { UserGameData, UserTradingStats } from '@/lib/db/schema'

interface QuickStatsData {
  gameData: UserGameData | null
  tradingStats: UserTradingStats | null
  activeTrades: number
  pendingTrades: number
}

export function QuickStatsWidget({ userId }: { userId: number }) {
  const [stats, setStats] = useState<QuickStatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [gameDataRes, tradingStatsRes, tradesRes] = await Promise.all([
          api.get(`${apiEndpoints.rewards.stats}?userId=${userId}`),
          api.get(apiEndpoints.users.tradingStats(userId.toString())),
          api.get(
            apiEndpoints.trades.userWithParams(
              'status=created,funded&limit=100'
            )
          )
        ])

        const activeTrades =
          tradesRes.data?.data?.trades?.filter(
            (t: any) => t.status === 'funded' || t.status === 'delivered'
          ).length || 0

        const pendingTrades =
          tradesRes.data?.data?.trades?.filter(
            (t: any) => t.status === 'created'
          ).length || 0

        setStats({
          gameData: gameDataRes.data?.gameData || null,
          tradingStats: tradingStatsRes.data?.data || null,
          activeTrades,
          pendingTrades
        })
      } catch (error) {
        console.error('Failed to fetch quick stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [userId])

  if (isLoading) {
    return (
      <Card className='border-2 border-indigo-500/20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/10 dark:to-purple-900/10'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Activity className='h-5 w-5 text-indigo-500' />
            <span className='bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400'>
              Quick Stats
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
            {[...Array(8)].map((_, i) => (
              <div key={i} className='bg-muted h-20 animate-pulse rounded-lg' />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const quickStats = [
    {
      id: 'trades',
      label: 'Total Trades',
      value: stats?.tradingStats?.totalTrades || 0,
      subValue: `${stats?.tradingStats?.successfulTrades || 0} successful`,
      icon: TrendingUp,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/10 to-cyan-500/10'
    },
    {
      id: 'active',
      label: 'Active Trades',
      value: stats?.activeTrades || 0,
      subValue: `${stats?.pendingTrades || 0} pending`,
      icon: Activity,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-500/10 to-emerald-500/10'
    },
    {
      id: 'xp',
      label: 'Experience',
      value: stats?.gameData?.xp || 0,
      subValue: `Level ${stats?.gameData?.level || 1}`,
      icon: Award,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-500/10 to-pink-500/10'
    },
    {
      id: 'combatPower',
      label: 'Combat Power',
      value: stats?.gameData?.combatPower || 100,
      subValue: 'Battle strength',
      icon: Swords,
      gradient: 'from-red-500 to-orange-500',
      bgGradient: 'from-red-500/10 to-orange-500/10'
    },
    {
      id: 'volume',
      label: 'Trade Volume',
      value: formatVolume(stats?.tradingStats?.totalVolume || '0'),
      subValue: 'Total value',
      icon: Coins,
      gradient: 'from-yellow-500 to-amber-500',
      bgGradient: 'from-yellow-500/10 to-amber-500/10'
    },
    {
      id: 'rating',
      label: 'Trust Score',
      value: `${stats?.tradingStats?.rating || 5.0}★`,
      subValue: 'Reputation',
      icon: Target,
      gradient: 'from-indigo-500 to-blue-500',
      bgGradient: 'from-indigo-500/10 to-blue-500/10'
    },
    {
      id: 'streak',
      label: 'Login Streak',
      value: stats?.gameData?.loginStreak || 0,
      subValue: 'Days',
      icon: Flame,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-500/10 to-red-500/10'
    },
    {
      id: 'disputes',
      label: 'Disputes Won',
      value: stats?.tradingStats?.disputesWon || 0,
      subValue: `${stats?.tradingStats?.disputesLost || 0} lost`,
      icon: Award,
      gradient: 'from-teal-500 to-cyan-500',
      bgGradient: 'from-teal-500/10 to-cyan-500/10'
    }
  ]

  return (
    <Card className='border-2 border-indigo-500/20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/10 dark:to-purple-900/10'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Activity className='h-5 w-5 text-indigo-500' />
          </motion.div>
          <span className='bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent'>
            Quick Stats
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              className='group relative'
            >
              <div className='relative overflow-hidden rounded-xl border border-gray-300 bg-gradient-to-br from-white to-gray-50 p-3 transition-all hover:border-indigo-500/50 dark:border-gray-700 dark:from-gray-900/50 dark:to-gray-800/50'>
                <div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100',
                    stat.bgGradient
                  )}
                />

                <div className='relative'>
                  <div className='mb-2 flex items-center justify-between'>
                    <span className='text-xs text-gray-600 dark:text-gray-400'>
                      {stat.label}
                    </span>
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br',
                        stat.gradient
                      )}
                    >
                      <stat.icon className='h-3 w-3 text-white' />
                    </motion.div>
                  </div>

                  <div className='text-lg font-bold text-gray-900 dark:text-white'>
                    {stat.value}
                  </div>

                  <div className='text-xs text-gray-600 dark:text-gray-400'>
                    {stat.subValue}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function formatVolume(volume: string): string {
  const num = parseFloat(volume)
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toFixed(0)
}
