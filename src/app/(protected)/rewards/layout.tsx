'use client'

import { useEffect, useState } from 'react'

import { Trophy, Scroll, Star, LayoutDashboard } from 'lucide-react'
import useSWR from 'swr'

import { DashboardHubSidebar } from '@/components/blocks/dashboard-hub-sidebar'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { useSession } from '@/hooks/use-session'
import { api } from '@/lib/api/http-client'

const navigationItems = [
  {
    title: 'Rewards Dashboard',
    href: appRoutes.rewards.base,
    icon: LayoutDashboard,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'hover:bg-purple-500/10'
  },
  {
    title: 'Global Leaderboard',
    href: appRoutes.rewards.leaderboard,
    icon: Trophy,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'hover:bg-yellow-500/10'
  },
  {
    title: 'Quest Board',
    href: appRoutes.rewards.quests,
    icon: Scroll,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'hover:bg-blue-500/10'
  }
]

export default function RewardsLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { user } = useSession()
  const [stats, setStats] = useState({
    achievementsEarned: 0,
    questsCompleted: 0,
    leaderboardRank: 0
  })

  // Fetch reward stats for sidebar
  const { data: rewardStats } = useSWR(
    user?.id ? apiEndpoints.rewards.statsByUserId(user.id) : null,
    async url => {
      const res = await api.get(url)
      return res.success && res.data ? res.data : null
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  // Fetch user achievements count
  const { data: achievementsData } = useSWR(
    user?.id ? apiEndpoints.rewards.achievementsByUserId(user.id) : null,
    async url => {
      const res = await api.get(url)
      return res.success && res.data ? res.data : []
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true
    }
  )

  // Fetch user rank
  const { data: rankData } = useSWR(
    user?.id ? `${apiEndpoints.rewards.userRank}?userId=${user.id}` : null,
    async url => {
      const res = await api.get(url)
      return res.success && res.data ? res.data : null
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true
    }
  )

  useEffect(() => {
    if (rewardStats) {
      setStats(prev => ({
        ...prev,
        questsCompleted: rewardStats.quests?.daily?.completed || 0
      }))
    }
  }, [rewardStats])

  useEffect(() => {
    if (achievementsData && Array.isArray(achievementsData)) {
      const unlockedAchievements = achievementsData.filter(
        (achievement: any) => achievement.unlocked
      ).length

      setStats(prev => ({
        ...prev,
        achievementsEarned: unlockedAchievements || 0
      }))
    }
  }, [achievementsData])

  useEffect(() => {
    if (rankData) {
      setStats(prev => ({
        ...prev,
        leaderboardRank: rankData.rank || 0
      }))
    }
  }, [rankData])

  return (
    <div className='flex min-h-screen'>
      <div className='sticky top-16 z-40 h-[calc(100vh-4rem)]'>
        <DashboardHubSidebar
          title='REWARDS CENTER'
          icon={Star}
          iconGradient='bg-gradient-to-br from-yellow-500 to-orange-600'
          navigationItems={navigationItems}
          stats={stats}
          alerts={[]}
          className='h-full'
        />
      </div>
      <div className='w-full flex-1 overflow-x-hidden'>{children}</div>
    </div>
  )
}
