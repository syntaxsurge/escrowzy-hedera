'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Crown,
  Settings,
  Zap,
  Trophy,
  Sword,
  Shield,
  Flame,
  Target,
  Gamepad2,
  Coins,
  Gem,
  Swords,
  Plus,
  ShoppingCart,
  TrendingUp,
  Star,
  Gift,
  ChevronRight,
  Users,
  Sparkles,
  Rocket,
  Medal
} from 'lucide-react'

import { ActiveDiscountBanner } from '@/components/blocks/dashboard/active-discount-banner'
import { QuickStatsWidget } from '@/components/blocks/dashboard/quick-stats-widget'
import { DashboardSkeleton } from '@/components/blocks/loading'
import { XPBar, LevelBadge } from '@/components/blocks/rewards'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { useRewards } from '@/hooks/use-rewards'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib'
import { api } from '@/lib/api/http-client'
import type { TeamDataWithMembers } from '@/lib/db/schema'

import { RecentActivityList } from '../../../components/blocks/recent-activity-list'

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useSession()
  const {
    stats,
    isLoading: _statsLoading,
    handleDailyLogin
  } = useRewards(user?.id)
  const [team, setTeam] = useState<TeamDataWithMembers | null>(null)
  const [_subscription, setSubscription] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [particlesInit, setParticlesInit] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    if (user?.id) {
      handleDailyLogin()
    }
  }, [user?.id, handleDailyLogin])

  useEffect(() => {
    initParticlesEngine(async engine => {
      await loadSlim(engine)
    }).then(() => {
      setParticlesInit(true)
    })
  }, [])

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id) {
        if (!userLoading) {
          setDataLoading(false)
        }
        return
      }

      setDataLoading(true)
      try {
        const [teamRes, activitiesRes, subsRes, leaderboardRes, userRankRes] =
          await Promise.all([
            api.get(apiEndpoints.team),
            api.get(
              `${apiEndpoints.activity.recent}?userId=${user.id}&limit=5`
            ),
            api.get(apiEndpoints.subscription.combined),
            api.get(`${apiEndpoints.rewards.leaderboard}?limit=100`),
            api.get(`${apiEndpoints.rewards.userRank}?userId=${user.id}`)
          ])

        setTeam(teamRes.data)
        setActivities(activitiesRes.data)
        setSubscription(subsRes.data)

        // Try to get rank from the dedicated endpoint first
        if (userRankRes.data?.rank) {
          setUserRank(userRankRes.data.rank)
        } else if (leaderboardRes.data) {
          // Fallback: Find user's rank in leaderboard
          const leaderboardData = Array.isArray(leaderboardRes.data)
            ? leaderboardRes.data
            : leaderboardRes.data.leaderboard || []
          const userIndex = leaderboardData.findIndex(
            (entry: any) => entry.userId === user.id
          )
          if (userIndex !== -1) {
            setUserRank(userIndex + 1)
          } else {
            // User not in top 100, calculate their actual rank
            const allUsersRes = await api.get(
              `${apiEndpoints.rewards.stats}?userId=${user.id}`
            )
            if (allUsersRes.data?.rank) {
              setUserRank(allUsersRes.data.rank)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setDataLoading(false)
      }
    }

    loadDashboardData()
  }, [user?.id])

  const particlesLoaded = useCallback(async (container: any) => {
    console.log('Particles loaded:', container)
  }, [])

  if (userLoading || dataLoading) {
    return (
      <div className='flex-1 p-4 pt-4 sm:p-6 sm:pt-6 md:p-8 md:pt-6'>
        <DashboardSkeleton />
      </div>
    )
  }

  if (!user) {
    return (
      <div className='flex-1 p-4 pt-4 sm:p-6 sm:pt-6 md:p-8 md:pt-6'>
        <div className='flex min-h-[400px] items-center justify-center'>
          <div className='text-center'>
            <h2 className='mb-2 text-2xl font-bold'>
              Loading your dashboard...
            </h2>
            <p className='text-muted-foreground'>
              If this persists, please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const currentTime = new Date().getHours()
  const greeting =
    currentTime < 12
      ? 'Good morning'
      : currentTime < 17
        ? 'Good afternoon'
        : 'Good evening'

  const level = stats?.gameData?.level || 0
  const playerTitle =
    level >= 50
      ? 'Legendary Hero'
      : level >= 30
        ? 'Master Warrior'
        : level >= 15
          ? 'Elite Champion'
          : level >= 5
            ? 'Rising Adventurer'
            : 'Novice Explorer'

  const statCards = [
    {
      id: 'power',
      title: 'Combat Power',
      value: stats?.gameData?.level
        ? stats.gameData.level * 250 + stats.gameData.xp
        : 0,
      subtitle: 'Total strength',
      icon: Sword,
      gradient: 'from-red-500 to-orange-500',
      bgGradient: 'from-red-500/10 to-orange-500/10',
      glowColor: 'shadow-red-500/50'
    },
    {
      id: 'achievements',
      title: 'Trophies',
      value: stats?.achievements?.unlocked || 0,
      subtitle: `${stats?.achievements?.percentage || 0}% complete`,
      icon: Trophy,
      gradient: 'from-yellow-500 to-amber-500',
      bgGradient: 'from-yellow-500/10 to-amber-500/10',
      glowColor: 'shadow-yellow-500/50'
    },
    {
      id: 'guild',
      title: 'Guild Power',
      value: team?.teamMembers?.length || 1,
      subtitle: 'Active members',
      icon: Users,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-500/10 to-pink-500/10',
      glowColor: 'shadow-purple-500/50'
    },
    {
      id: 'streak',
      title: 'Daily Streak',
      value: `${stats?.gameData?.loginStreak || 0}`,
      subtitle: 'Days active',
      icon: Flame,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-500/10 to-red-500/10',
      glowColor: 'shadow-orange-500/50'
    }
  ]

  const quickActions = [
    {
      id: 'create-listing',
      href: appRoutes.trades.listings.create,
      icon: Plus,
      title: 'Create Listing',
      subtitle: 'List an offer',
      color: 'from-blue-500 to-cyan-500',
      reward: 'Low fees',
      glow: 'shadow-cyan-500/50'
    },
    {
      id: 'battle-arena',
      href: appRoutes.battles.arena,
      icon: Swords,
      title: 'Battle Arena',
      subtitle: 'PvP Combat',
      color: 'from-red-500 to-orange-500',
      reward: '-25% fees',
      glow: 'shadow-red-500/50'
    },
    {
      id: 'browse-listings',
      href: appRoutes.trades.listings.base,
      icon: ShoppingCart,
      title: 'Marketplace',
      subtitle: 'Browse offers',
      color: 'from-green-500 to-emerald-500',
      reward: 'Safe escrow',
      glow: 'shadow-emerald-500/50'
    },
    {
      id: 'quest',
      href: appRoutes.rewards.base,
      icon: Target,
      title: 'Quests',
      subtitle: `${stats?.quests?.daily?.completed || 0}/${stats?.quests?.daily?.total || 3}`,
      color: 'from-purple-500 to-pink-500',
      reward: '+200 XP',
      glow: 'shadow-purple-500/50'
    }
  ]

  return (
    <div className='relative flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-6 md:p-8 md:pt-6'>
      {/* Animated Background Particles */}
      {particlesInit && (
        <Particles
          className='absolute inset-0 -z-10'
          particlesLoaded={particlesLoaded}
          options={{
            particles: {
              number: { value: 20 },
              color: { value: ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981'] },
              shape: { type: ['circle'] },
              opacity: { value: { min: 0.1, max: 0.2 } },
              size: { value: { min: 2, max: 4 } },
              move: {
                enable: true,
                speed: 0.3,
                direction: 'none',
                random: true,
                straight: false,
                outModes: 'bounce'
              }
            },
            interactivity: {
              events: {
                onHover: {
                  enable: true,
                  mode: 'repulse'
                }
              },
              modes: {
                repulse: {
                  distance: 100,
                  duration: 0.4
                }
              }
            }
          }}
        />
      )}

      {/* Active Discount Banner */}
      {user?.id && <ActiveDiscountBanner />}

      {/* Hero Welcome Section - Gaming Style */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-100 via-indigo-100 to-blue-100 p-1 shadow-2xl dark:from-gray-950 dark:via-purple-950/30 dark:to-blue-950/30'
      >
        {/* Animated Border Gradient */}
        <div className='absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-50 blur-xl' />

        <div className='relative rounded-3xl bg-white/95 p-6 backdrop-blur-2xl md:p-8 dark:bg-gray-900/95'>
          {/* Floating Orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 30, 0],
              y: [0, -20, 0]
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className='absolute top-10 right-10 h-32 w-32 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl'
          />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              x: [0, -20, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 8, repeat: Infinity, delay: 1 }}
            className='absolute bottom-10 left-10 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-400/20 blur-3xl'
          />

          <div className='relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex-1'>
              {/* Player Identity Section */}
              <div className='mb-6 flex items-start gap-4'>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className='relative'
                >
                  {/* Animated Ring */}
                  <div className='absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 opacity-60 blur-xl' />
                  {stats?.gameData && (
                    <LevelBadge
                      level={stats.gameData.level}
                      size='xl'
                      showTitle={false}
                      animated
                      className='relative z-10'
                    />
                  )}
                </motion.div>

                <div className='flex-1'>
                  <motion.h1
                    className='bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl lg:text-5xl dark:from-purple-400 dark:to-pink-400'
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {greeting}, {user?.name || 'Hero'}!
                  </motion.h1>

                  <motion.div
                    className='mt-2 flex flex-wrap items-center gap-2'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Badge className='border-amber-500/50 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 backdrop-blur-sm dark:from-amber-900/50 dark:to-orange-900/50 dark:text-amber-300'>
                      <Crown className='mr-1 h-3 w-3' />
                      {playerTitle}
                    </Badge>
                    <Badge className='border-cyan-500/50 bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700 backdrop-blur-sm dark:from-cyan-900/50 dark:to-blue-900/50 dark:text-cyan-300'>
                      <Rocket className='mr-1 h-3 w-3' />
                      Rank #{userRank || '...'}
                    </Badge>
                    {stats?.gameData?.loginStreak &&
                      stats.gameData.loginStreak > 0 && (
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Badge className='border-red-500/50 bg-gradient-to-r from-red-100 to-orange-100 text-red-700 backdrop-blur-sm dark:from-red-900/50 dark:to-orange-900/50 dark:text-red-300'>
                            <Flame className='mr-1 h-3 w-3' />
                            {stats.gameData.loginStreak} Day Streak
                          </Badge>
                        </motion.div>
                      )}
                  </motion.div>
                </div>
              </div>

              {/* XP Progress Section */}
              {stats?.gameData && (
                <motion.div
                  className='space-y-4'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <XPBar
                    currentXP={stats.gameData.xp}
                    requiredXP={stats.nextLevelXP || stats.gameData.xp}
                    level={stats.gameData.level}
                    showAnimation
                  />

                  {/* Currency Display */}
                  <div className='flex flex-wrap gap-3'>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      className='flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 px-4 py-2 backdrop-blur-sm dark:from-yellow-500/20 dark:to-amber-500/20'
                    >
                      <Coins className='h-5 w-5 text-yellow-500' />
                      <span className='font-bold text-yellow-700 dark:text-yellow-300'>
                        {(stats.gameData as any).coins?.toLocaleString() || 0}
                      </span>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      className='flex items-center gap-2 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-4 py-2 backdrop-blur-sm dark:from-purple-500/20 dark:to-pink-500/20'
                    >
                      <Gem className='h-5 w-5 text-purple-500' />
                      <span className='font-bold text-purple-700 dark:text-purple-300'>
                        {(stats.gameData as any).gems?.toLocaleString() || 0}
                      </span>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      className='flex items-center gap-2 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-4 py-2 backdrop-blur-sm dark:from-blue-500/20 dark:to-cyan-500/20'
                    >
                      <Star className='h-5 w-5 text-blue-500' />
                      <span className='font-bold text-blue-700 dark:text-blue-300'>
                        {stats?.gameData?.xp?.toLocaleString() || 0} XP
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick Actions */}
            <motion.div
              className='flex gap-3'
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href={appRoutes.rewards.base}
                  className='group flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-xl shadow-purple-500/30 transition-all hover:shadow-2xl hover:shadow-purple-500/40'
                >
                  <Gamepad2 className='h-6 w-6 text-white' />
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href={appRoutes.dashboard.settings.base}
                  className='group flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-gray-200 bg-white/80 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl dark:border-gray-700 dark:bg-gray-800/80'
                >
                  <Settings className='h-6 w-6 text-gray-600 transition-colors group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white' />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Widget */}
      {user?.id && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <QuickStatsWidget userId={user.id} />
        </motion.div>
      )}

      {/* Gaming Stats Cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {statCards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ y: -8, scale: 1.02 }}
            onHoverStart={() => setHoveredCard(card.id)}
            onHoverEnd={() => setHoveredCard(null)}
          >
            <Card className='group relative overflow-hidden border-2 border-gray-200 bg-white/90 backdrop-blur-xl transition-all hover:border-purple-500/50 dark:border-gray-800 dark:bg-gray-900/90 dark:hover:border-purple-500/50'>
              {/* Animated Background */}
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                  card.bgGradient
                )}
              />

              {/* Glow Effect */}
              <AnimatePresence>
                {hoveredCard === card.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn('absolute inset-0', card.glowColor)}
                  />
                )}
              </AnimatePresence>

              <CardHeader className='relative z-10 pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                    {card.title}
                  </CardTitle>
                  <motion.div
                    animate={hoveredCard === card.id ? { rotate: 360 } : {}}
                    transition={{ duration: 0.5 }}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
                      card.gradient
                    )}
                  >
                    <card.icon className='h-5 w-5 text-white' />
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent className='relative z-10'>
                <motion.div
                  className='text-3xl font-black text-gray-900 dark:text-white'
                  animate={
                    hoveredCard === card.id ? { scale: [1, 1.1, 1] } : {}
                  }
                  transition={{ duration: 0.3 }}
                >
                  {typeof card.value === 'number'
                    ? card.value.toLocaleString()
                    : card.value}
                </motion.div>
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  {card.subtitle}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className='border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50 backdrop-blur-xl dark:border-purple-900/50 dark:from-purple-950/20 dark:to-pink-950/20'>
          <CardHeader>
            <CardTitle className='flex items-center gap-3'>
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/30'
              >
                <Zap className='h-5 w-5 text-white' />
              </motion.div>
              <span className='bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-xl font-black text-transparent dark:from-yellow-400 dark:to-orange-400'>
                Quick Actions
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href={action.href}
                    className='group relative flex flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white/80 p-6 backdrop-blur-sm transition-all hover:border-purple-500/50 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/80 dark:hover:border-purple-500/50'
                  >
                    {/* Background Gradient on Hover */}
                    <div
                      className={cn(
                        'absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-10',
                        action.color
                      )}
                    />

                    {/* Icon */}
                    <motion.div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-xl transition-all',
                        action.color,
                        action.glow
                      )}
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <action.icon className='h-7 w-7' />
                    </motion.div>

                    {/* Content */}
                    <div className='text-center'>
                      <p className='font-bold text-gray-900 dark:text-white'>
                        {action.title}
                      </p>
                      <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                        {action.subtitle}
                      </p>
                      <div className='mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 px-3 py-1 dark:from-gray-800 dark:to-gray-700'>
                        <Sparkles className='h-3 w-3 text-yellow-500' />
                        <span className='text-xs font-bold text-gray-700 dark:text-gray-300'>
                          {action.reward}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Gaming Dashboard Grid */}
      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Guild Overview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className='h-full border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 backdrop-blur-xl dark:border-amber-900/50 dark:from-amber-950/20 dark:to-orange-950/20'>
            <CardHeader>
              <CardTitle className='flex items-center gap-3'>
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30'
                >
                  <Crown className='h-5 w-5 text-white' />
                </motion.div>
                <span className='bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-xl font-black text-transparent dark:from-amber-400 dark:to-orange-400'>
                  Guild Hall
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='rounded-xl bg-gradient-to-r from-amber-100/50 to-orange-100/50 p-4 dark:from-amber-900/30 dark:to-orange-900/30'>
                  <div className='mb-3 flex items-center justify-between'>
                    <div>
                      <p className='text-lg font-bold text-gray-900 dark:text-white'>
                        {team?.name || 'Personal Guild'}
                      </p>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        Level{' '}
                        {Math.floor((stats?.gameData?.level || 0) / 10) + 1}{' '}
                        Guild
                      </p>
                    </div>
                    <Medal className='h-8 w-8 text-amber-500' />
                  </div>

                  <div className='grid grid-cols-2 gap-3'>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className='rounded-lg bg-white/60 p-3 backdrop-blur-sm dark:bg-gray-800/60'
                    >
                      <div className='flex items-center gap-2'>
                        <Shield className='h-4 w-4 text-blue-500' />
                        <div>
                          <p className='text-xl font-bold text-gray-900 dark:text-white'>
                            {team?.teamMembers?.length || 1}
                          </p>
                          <p className='text-xs text-gray-600 dark:text-gray-400'>
                            Members
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className='rounded-lg bg-white/60 p-3 backdrop-blur-sm dark:bg-gray-800/60'
                    >
                      <div className='flex items-center gap-2'>
                        <TrendingUp className='h-4 w-4 text-green-500' />
                        <div>
                          <p className='text-xl font-bold text-gray-900 dark:text-white'>
                            #{userRank || '...'}
                          </p>
                          <p className='text-xs text-gray-600 dark:text-gray-400'>
                            Ranking
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={appRoutes.dashboard.settings.team}
                    className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-900 to-orange-900 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:from-amber-950 hover:to-orange-950 hover:shadow-xl'
                  >
                    Manage Guild
                    <ChevronRight className='h-4 w-4' />
                  </Link>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className='h-full border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 backdrop-blur-xl dark:border-indigo-900/50 dark:from-indigo-950/20 dark:to-blue-950/20'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='flex items-center gap-3'>
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                    className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 shadow-lg shadow-indigo-500/30'
                  >
                    <Activity className='h-5 w-5 text-white' />
                  </motion.div>
                  <span className='bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-xl font-black text-transparent dark:from-indigo-400 dark:to-blue-400'>
                    Live Feed
                  </span>
                </CardTitle>
                <Link
                  href={appRoutes.dashboard.activity}
                  className='flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300'
                >
                  View all
                  <ChevronRight className='h-4 w-4' />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activities && activities.length > 0 ? (
                <div className='space-y-2'>
                  <RecentActivityList activities={activities} />
                  <p className='mt-4 text-center text-xs text-gray-500 dark:text-gray-400'>
                    Showing latest 5 activities
                  </p>
                </div>
              ) : (
                <div className='py-12 text-center'>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                    className='mx-auto mb-4'
                  >
                    <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20'>
                      <Activity className='h-8 w-8 text-indigo-500' />
                    </div>
                  </motion.div>
                  <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                    No activities yet
                  </h3>
                  <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
                    Start trading to see your activity here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Daily Rewards Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className='border-2 border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/50 backdrop-blur-xl dark:border-green-900/50 dark:from-green-950/20 dark:to-emerald-950/20'>
          <CardHeader>
            <CardTitle className='flex items-center gap-3'>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30'
              >
                <Gift className='h-5 w-5 text-white' />
              </motion.div>
              <span className='bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-xl font-black text-transparent dark:from-green-400 dark:to-emerald-400'>
                Daily Rewards
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between rounded-xl bg-gradient-to-r from-green-100/50 to-emerald-100/50 p-4 dark:from-green-900/30 dark:to-emerald-900/30'>
              <div className='flex items-center gap-4'>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Target className='h-8 w-8 text-green-500' />
                </motion.div>
                <div>
                  <p className='font-bold text-gray-900 dark:text-white'>
                    Daily Quests Progress
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Complete quests to earn rewards
                  </p>
                </div>
              </div>
              <div className='text-right'>
                <p className='text-2xl font-black text-green-600 dark:text-green-400'>
                  {stats?.quests?.daily?.completed || 0}/
                  {stats?.quests?.daily?.total || 3}
                </p>
                <p className='text-xs text-gray-600 dark:text-gray-400'>
                  Completed today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
