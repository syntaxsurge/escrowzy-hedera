'use client'

import { useRouter } from 'next/navigation'

import { motion } from 'framer-motion'
import {
  Swords,
  Trophy,
  Shield,
  Flame,
  Calendar,
  Sparkles,
  Award,
  Scroll,
  Target,
  Crown,
  Medal,
  Zap,
  TrendingUp,
  Activity
} from 'lucide-react'
import useSWR from 'swr'

import { GamifiedHeader } from '@/components/blocks/trading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { useBattles } from '@/hooks/use-battles'
import { useRewards } from '@/hooks/use-rewards'
import { useSession } from '@/hooks/use-session'
import { api } from '@/lib/api/http-client'
import { formatNumber } from '@/lib/utils/string'
import { getUserDisplayName } from '@/lib/utils/user'

interface DashboardStats {
  totalBattles: number
  battlesWon: number
  winRate: number
  currentStreak: number
  bestStreak: number
  dailyBattlesUsed: number
  dailyBattlesMax: number
  questsActive: number
  questsCompleted: number
  achievementsUnlocked: number
  achievementsTotal: number
  leaderboardRank: number | null
}

interface RecentActivity {
  id: string
  type:
    | 'battle_won'
    | 'battle_lost'
    | 'quest_completed'
    | 'achievement_unlocked'
    | 'level_up'
  title: string
  description: string
  timestamp: string
  xpEarned?: number
}

export default function BattlesDashboardPage() {
  const { user } = useSession()
  const router = useRouter()
  const { stats } = useRewards(user?.id)
  const { activeDiscount, dailyLimit, canBattle } = useBattles(user?.id)

  // Fetch dashboard stats
  const { data: dashboardStats } = useSWR<DashboardStats>(
    user?.id ? `${apiEndpoints.battles.stats}` : null,
    async url => {
      const res = await api.get(url)
      if (!res.success) throw new Error(res.error || 'Failed to load stats')
      return res.data
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  // Fetch recent activity from API
  const { data: activityData } = useSWR<RecentActivity[]>(
    user?.id ? `${apiEndpoints.battles.activity}?limit=10` : null,
    async url => {
      const res = await api.get(url)
      if (!res.success) {
        // Return empty array if endpoint doesn't exist yet
        console.warn('Battle activity endpoint not available')
        return []
      }
      return res.data
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      fallbackData: [] // Provide empty array as fallback
    }
  )

  const recentActivity = activityData || []

  // Fetch top warriors for mini leaderboard
  const { data: topWarriors } = useSWR<any[]>(
    `${apiEndpoints.rewards.leaderboard}?type=battle&timeframe=weekly&limit=3`,
    async url => {
      const res = await api.get(url)
      if (!res.success)
        throw new Error(res.error || 'Failed to load leaderboard')
      return res.data
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true
    }
  )

  const combatPower = stats?.gameData?.combatPower || 100
  const userLevel = stats?.gameData?.level || 1
  const currentXP = stats?.gameData?.xp || 0
  const nextLevelXP = stats?.nextLevelXP || 1000
  const xpProgress = nextLevelXP > 0 ? (currentXP / nextLevelXP) * 100 : 0

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'battle_won':
        return <Trophy className='h-4 w-4 text-green-500' />
      case 'battle_lost':
        return <Shield className='h-4 w-4 text-red-500' />
      case 'quest_completed':
        return <Scroll className='h-4 w-4 text-purple-500' />
      case 'achievement_unlocked':
        return <Award className='h-4 w-4 text-yellow-500' />
      case 'level_up':
        return <Sparkles className='h-4 w-4 text-blue-500' />
      default:
        return <Activity className='h-4 w-4 text-gray-500' />
    }
  }

  return (
    <div className='from-background via-background to-primary/5 dark:to-primary/10 min-h-screen bg-gradient-to-br'>
      <div className='container mx-auto space-y-8 py-6'>
        {/* Header */}
        <GamifiedHeader
          title='BATTLE DASHBOARD'
          subtitle='Your warrior journey and statistics'
          icon={<Shield className='h-8 w-8 text-white' />}
          actions={
            activeDiscount && (
              <Badge className='bg-green-500/20 px-4 py-2 text-green-600 dark:text-green-400'>
                <Zap className='mr-2 h-4 w-4' />
                {activeDiscount.discountPercent}% FEE DISCOUNT ACTIVE
              </Badge>
            )
          }
        />

        {/* Player Stats Overview */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
          <Card className='group relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 transition-all hover:scale-105'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-bold text-purple-600 uppercase dark:text-purple-400'>
                    Level
                  </p>
                  <p className='text-3xl font-black'>{userLevel}</p>
                  <Progress value={xpProgress} className='mt-2 h-2' />
                  <p className='text-muted-foreground mt-1 text-xs'>
                    {formatNumber(currentXP)}/{formatNumber(nextLevelXP)} XP
                  </p>
                </div>
                <Sparkles className='h-8 w-8 text-purple-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 transition-all hover:scale-105'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-bold text-blue-600 uppercase dark:text-blue-400'>
                    Combat Power
                  </p>
                  <p className='text-3xl font-black'>
                    {formatNumber(combatPower)}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    Total strength
                  </p>
                </div>
                <Shield className='h-8 w-8 text-blue-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 transition-all hover:scale-105'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-bold text-green-600 uppercase dark:text-green-400'>
                    Win Rate
                  </p>
                  <p className='text-3xl font-black'>
                    {dashboardStats?.winRate?.toFixed(1) || 0}%
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {dashboardStats?.battlesWon || 0}/
                    {dashboardStats?.totalBattles || 0} won
                  </p>
                </div>
                <Trophy className='h-8 w-8 text-green-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10 transition-all hover:scale-105'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-bold text-orange-600 uppercase dark:text-orange-400'>
                    Win Streak
                  </p>
                  <p className='text-3xl font-black'>
                    {dashboardStats?.currentStreak || 0}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    Best: {dashboardStats?.bestStreak || 0}
                  </p>
                </div>
                <Flame className='h-8 w-8 text-orange-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 transition-all hover:scale-105'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-bold text-yellow-600 uppercase dark:text-yellow-400'>
                    Rank
                  </p>
                  <p className='text-3xl font-black'>
                    {dashboardStats?.leaderboardRank
                      ? `#${dashboardStats.leaderboardRank}`
                      : '---'}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    Weekly leaderboard
                  </p>
                </div>
                <Crown className='h-8 w-8 text-yellow-500' />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
          {/* Quick Actions */}
          <Card className='group border-primary/20 from-primary/5 relative overflow-hidden border-2 bg-gradient-to-br to-purple-600/5 shadow-2xl lg:col-span-1'>
            <CardHeader>
              <CardTitle className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-xl font-black text-transparent'>
                QUICK ACTIONS
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <Button
                className='w-full justify-start gap-3 bg-gradient-to-r from-red-600 to-orange-700 font-bold text-white hover:from-red-700 hover:to-orange-800'
                onClick={() => router.push(appRoutes.battles.arena)}
                disabled={!canBattle}
              >
                <Swords className='h-5 w-5' />
                <div className='flex-1 text-left'>
                  <p className='text-sm font-bold'>ENTER ARENA</p>
                  <p className='text-xs opacity-90'>
                    {dailyLimit?.battlesUsed || 0}/{dailyLimit?.maxBattles || 3}{' '}
                    battles today
                  </p>
                </div>
              </Button>

              <Button
                variant='outline'
                className='w-full justify-start gap-3 border-purple-500/30 hover:bg-purple-500/10'
                onClick={() => router.push(appRoutes.battles.quests)}
              >
                <Scroll className='h-5 w-5 text-purple-600 dark:text-purple-400' />
                <div className='flex-1 text-left'>
                  <p className='text-sm font-bold'>VIEW QUESTS</p>
                  <p className='text-muted-foreground text-xs'>
                    {dashboardStats?.questsActive || 0} active
                  </p>
                </div>
              </Button>

              <Button
                variant='outline'
                className='w-full justify-start gap-3 border-green-500/30 hover:bg-green-500/10'
                onClick={() => router.push(appRoutes.battles.achievements)}
              >
                <Award className='h-5 w-5 text-green-600 dark:text-green-400' />
                <div className='flex-1 text-left'>
                  <p className='text-sm font-bold'>ACHIEVEMENTS</p>
                  <p className='text-muted-foreground text-xs'>
                    {dashboardStats?.achievementsUnlocked || 0}/
                    {dashboardStats?.achievementsTotal || 0} unlocked
                  </p>
                </div>
              </Button>

              <Button
                variant='outline'
                className='w-full justify-start gap-3 border-yellow-500/30 hover:bg-yellow-500/10'
                onClick={() => router.push(appRoutes.battles.leaderboard)}
              >
                <Trophy className='h-5 w-5 text-yellow-600 dark:text-yellow-400' />
                <div className='flex-1 text-left'>
                  <p className='text-sm font-bold'>LEADERBOARD</p>
                  <p className='text-muted-foreground text-xs'>
                    Check your ranking
                  </p>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className='group border-primary/20 from-primary/5 relative overflow-hidden border-2 bg-gradient-to-br to-purple-600/5 shadow-2xl lg:col-span-1'>
            <CardHeader>
              <CardTitle className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-xl font-black text-transparent'>
                RECENT ACTIVITY
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!recentActivity || recentActivity.length === 0 ? (
                <div className='py-8 text-center'>
                  <Activity className='text-muted-foreground mx-auto mb-2 h-8 w-8' />
                  <p className='text-muted-foreground text-sm'>
                    No recent activity
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {recentActivity.map(activity => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className='group flex items-start gap-3 rounded-lg border border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50 p-3 transition-all hover:scale-[1.02]'
                    >
                      {getActivityIcon(activity.type)}
                      <div className='flex-1'>
                        <p className='text-sm font-bold'>{activity.title}</p>
                        <p className='text-muted-foreground text-xs'>
                          {activity.description}
                        </p>
                        {activity.xpEarned && (
                          <Badge variant='secondary' className='mt-1'>
                            +{activity.xpEarned} XP
                          </Badge>
                        )}
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Warriors Mini Leaderboard */}
          <Card className='group border-primary/20 from-primary/5 relative overflow-hidden border-2 bg-gradient-to-br to-purple-600/5 shadow-2xl lg:col-span-1'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-xl font-black text-transparent'>
                  TOP WARRIORS
                </CardTitle>
                <Badge variant='secondary'>This Week</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!topWarriors || topWarriors.length === 0 ? (
                <div className='py-8 text-center'>
                  <Trophy className='text-muted-foreground mx-auto mb-2 h-8 w-8' />
                  <p className='text-muted-foreground text-sm'>
                    No warriors ranked yet
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {topWarriors.map((warrior, index) => {
                    const getRankIcon = () => {
                      switch (index + 1) {
                        case 1:
                          return <Crown className='h-5 w-5 text-yellow-500' />
                        case 2:
                          return <Medal className='h-5 w-5 text-gray-400' />
                        case 3:
                          return <Medal className='h-5 w-5 text-amber-600' />
                        default:
                          return null
                      }
                    }

                    return (
                      <div
                        key={warrior.userId}
                        className={`group relative overflow-hidden rounded-lg border p-3 transition-all hover:scale-[1.02] ${
                          index === 0
                            ? 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/10'
                            : index === 1
                              ? 'border-gray-400/30 bg-gradient-to-r from-gray-400/10 to-slate-400/10'
                              : 'border-amber-600/30 bg-gradient-to-r from-amber-600/10 to-orange-600/10'
                        }`}
                      >
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            {getRankIcon()}
                            <div>
                              <p className='font-bold'>
                                {getUserDisplayName(warrior.user)}
                              </p>
                              <p className='text-muted-foreground text-xs'>
                                CP:{' '}
                                {formatNumber(
                                  warrior.battleStats?.combatPower || 0
                                )}
                              </p>
                            </div>
                          </div>
                          <div className='text-right'>
                            <p className='text-sm font-bold'>
                              {warrior.battleStats?.winRate?.toFixed(1) || 0}%
                            </p>
                            <p className='text-muted-foreground text-xs'>
                              Win Rate
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card className='group border-primary/20 from-primary/5 relative overflow-hidden border-2 bg-gradient-to-br to-purple-600/5 shadow-2xl'>
          <CardHeader>
            <div className='flex items-center gap-2'>
              <TrendingUp className='text-primary h-6 w-6' />
              <CardTitle className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-2xl font-black text-transparent'>
                BATTLE PROGRESS
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
              {/* Daily Battles */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Calendar className='h-5 w-5 text-purple-500' />
                    <p className='font-bold'>Daily Battles</p>
                  </div>
                  <Badge variant='secondary'>
                    {dashboardStats?.dailyBattlesUsed || 0}/
                    {dashboardStats?.dailyBattlesMax || 3}
                  </Badge>
                </div>
                <Progress
                  value={
                    ((dashboardStats?.dailyBattlesUsed || 0) /
                      (dashboardStats?.dailyBattlesMax || 3)) *
                    100
                  }
                  className='h-3'
                />
                <p className='text-muted-foreground text-xs'>
                  {canBattle
                    ? `${(dashboardStats?.dailyBattlesMax || 3) - (dashboardStats?.dailyBattlesUsed || 0)} battles remaining today`
                    : 'Daily limit reached. Resets at midnight.'}
                </p>
              </div>

              {/* Active Quests */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Target className='h-5 w-5 text-green-500' />
                    <p className='font-bold'>Active Quests</p>
                  </div>
                  <Badge variant='secondary'>
                    {dashboardStats?.questsActive || 0} active
                  </Badge>
                </div>
                <Progress
                  value={
                    ((dashboardStats?.questsCompleted || 0) /
                      ((dashboardStats?.questsCompleted || 0) +
                        (dashboardStats?.questsActive || 1))) *
                    100
                  }
                  className='h-3'
                />
                <p className='text-muted-foreground text-xs'>
                  {dashboardStats?.questsCompleted || 0} quests completed this
                  week
                </p>
              </div>

              {/* Achievements */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Award className='h-5 w-5 text-yellow-500' />
                    <p className='font-bold'>Achievements</p>
                  </div>
                  <Badge variant='secondary'>
                    {dashboardStats?.achievementsUnlocked || 0}/
                    {dashboardStats?.achievementsTotal || 0}
                  </Badge>
                </div>
                <Progress
                  value={
                    ((dashboardStats?.achievementsUnlocked || 0) /
                      (dashboardStats?.achievementsTotal || 1)) *
                    100
                  }
                  className='h-3'
                />
                <p className='text-muted-foreground text-xs'>
                  {Math.round(
                    ((dashboardStats?.achievementsUnlocked || 0) /
                      (dashboardStats?.achievementsTotal || 1)) *
                      100
                  )}
                  % achievements unlocked
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
