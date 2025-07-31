'use client'

import { useEffect, useState } from 'react'

import {
  Swords,
  Trophy,
  Scroll,
  Award,
  Shield,
  Flame,
  LayoutDashboard,
  History
} from 'lucide-react'
import useSWR from 'swr'

import { GameHubSidebar } from '@/components/blocks/rewards'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { api } from '@/lib/api/http-client'

const navigationItems = [
  {
    title: 'Battle Dashboard',
    href: appRoutes.battles.base,
    icon: LayoutDashboard,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'hover:bg-blue-500/10'
  },
  {
    title: 'Battle Arena',
    href: appRoutes.battles.arena,
    icon: Swords,
    badge: 'activeBattles',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'hover:bg-red-500/10'
  },
  {
    title: 'Battle History',
    href: appRoutes.battles.history,
    icon: History,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'hover:bg-indigo-500/10'
  },
  {
    title: 'Battle Leaderboard',
    href: appRoutes.battles.leaderboard,
    icon: Trophy,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'hover:bg-yellow-500/10'
  },
  {
    title: 'Battle Quests',
    href: appRoutes.battles.quests,
    icon: Scroll,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'hover:bg-purple-500/10'
  },
  {
    title: 'Battle Achievements',
    href: appRoutes.battles.achievements,
    icon: Award,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'hover:bg-green-500/10'
  }
]

export default function BattlesLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [stats, setStats] = useState({
    activeBattles: 0,
    battlesWon: 0,
    achievementsEarned: 0
  })

  // Fetch battle stats for sidebar
  const { data: battleStats } = useSWR(
    apiEndpoints.battles.stats,
    async () => {
      const res = await api.get(apiEndpoints.battles.stats)
      return res.success && res.data ? res.data : null
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  // Fetch user achievements count
  const { data: achievementsData } = useSWR(
    apiEndpoints.rewards.achievements,
    async () => {
      const res = await api.get(apiEndpoints.rewards.achievements)
      return res.success && res.data ? res.data : []
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true
    }
  )

  useEffect(() => {
    if (battleStats) {
      setStats(prev => ({
        ...prev,
        activeBattles: battleStats.activeBattles || 0,
        battlesWon: battleStats.battlesWon || 0
      }))
    }
  }, [battleStats])

  useEffect(() => {
    if (achievementsData && Array.isArray(achievementsData)) {
      const battleAchievements = achievementsData.filter(
        (achievement: any) => achievement.category === 'battle'
      ).length

      setStats(prev => ({
        ...prev,
        achievementsEarned: battleAchievements || 0
      }))
    }
  }, [achievementsData])

  const alerts =
    stats.activeBattles > 0
      ? [
          {
            title: 'Active Battles',
            value: stats.activeBattles,
            icon: Flame,
            color: 'text-red-500'
          }
        ]
      : []

  return (
    <div className='flex min-h-screen'>
      <div className='sticky top-16 z-40 h-[calc(100vh-4rem)]'>
        <GameHubSidebar
          title='BATTLE ZONE'
          icon={Shield}
          iconGradient='bg-gradient-to-br from-red-500 to-orange-600'
          navigationItems={navigationItems}
          stats={stats}
          alerts={alerts}
          className='h-full'
        />
      </div>
      <div className='w-full flex-1 overflow-x-hidden'>{children}</div>
    </div>
  )
}
