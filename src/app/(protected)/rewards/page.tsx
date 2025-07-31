'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import { motion } from 'framer-motion'
import {
  Trophy,
  Target,
  Star,
  TrendingUp,
  Users,
  ArrowRight,
  Swords,
  ScrollText,
  Sparkles
} from 'lucide-react'

import { PageHeader } from '@/components/blocks/page-header'
import {
  XPBar,
  LevelBadge,
  AchievementCard,
  QuestCard,
  Leaderboard,
  StreakCounter,
  LevelUpAnimation
} from '@/components/blocks/rewards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { appRoutes } from '@/config/app-routes'
import { useRewards } from '@/hooks/use-rewards'
import { useSession } from '@/hooks/use-session'

export default function RewardsPage() {
  const [particlesInit, setParticlesInit] = useState(false)
  const { user, isLoading: userLoading } = useSession()
  const {
    stats,
    achievements,
    quests,
    leaderboard,
    isLoading,
    handleDailyLogin,
    showLevelUp,
    setShowLevelUp,
    newLevel,
    xpGained
  } = useRewards(user?.id)

  useEffect(() => {
    initParticlesEngine(async engine => {
      await loadSlim(engine)
    }).then(() => {
      setParticlesInit(true)
    })
  }, [])

  useEffect(() => {
    if (user?.id) {
      handleDailyLogin()
    }
  }, [user?.id, handleDailyLogin])

  if (userLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='border-primary h-12 w-12 animate-spin rounded-full border-b-2' />
      </div>
    )
  }

  if (!user) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <h2 className='mb-4 text-3xl font-bold'>
            Loading Rewards Dashboard...
          </h2>
          <p className='text-muted-foreground text-lg'>
            If this persists, please refresh the page
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <div className='border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2' />
          <h2 className='mb-2 text-2xl font-bold'>
            Loading Your Rewards Profile...
          </h2>
          <p className='text-muted-foreground'>
            Fetching your stats and achievements
          </p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <h2 className='mb-2 text-2xl font-bold'>
            Initializing Rewards Profile...
          </h2>
          <p className='text-muted-foreground'>
            Setting up your rewards data for the first time
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='relative min-h-screen'>
      {particlesInit && (
        <Particles
          className='absolute inset-0 -z-10'
          options={{
            particles: {
              number: { value: 50 },
              color: { value: '#8b5cf6' },
              shape: { type: 'star' },
              opacity: { value: { min: 0.2, max: 0.4 } },
              size: { value: { min: 2, max: 4 } },
              move: {
                enable: true,
                speed: 1,
                direction: 'none',
                random: true,
                straight: false,
                outModes: 'bounce'
              }
            }
          }}
        />
      )}

      <div className='container mx-auto space-y-6 p-6'>
        {/* Header */}
        <PageHeader
          title='REWARDS DASHBOARD'
          subtitle='Track your progress and unlock achievements'
          icon={<Sparkles className='h-8 w-8 text-white' />}
          actions={
            <div className='flex items-center gap-4'>
              <StreakCounter days={stats.gameData.loginStreak} size='lg' />
            </div>
          }
        />

        <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className='border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Star className='h-5 w-5 text-yellow-500' />
                  Level Progress
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex justify-center'>
                  <LevelBadge level={stats.gameData.level} size='lg' />
                </div>
                <XPBar
                  currentXP={stats.gameData.xp}
                  requiredXP={stats.nextLevelXP || stats.gameData.xp}
                  level={stats.gameData.level}
                />
                <div className='text-muted-foreground text-center text-sm'>
                  {stats.xpToNextLevel > 0 && (
                    <span>
                      {stats.xpToNextLevel.toLocaleString()} XP to next level
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className='md:col-span-2'
          >
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TrendingUp className='h-5 w-5 text-green-500' />
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                  <div className='dark:bg-secondary rounded-lg bg-gray-100 p-4 text-center'>
                    <p className='dark:text-foreground text-2xl font-bold text-gray-800'>
                      {stats.gameData.totalLogins}
                    </p>
                    <p className='dark:text-muted-foreground text-xs text-gray-600'>
                      Total Logins
                    </p>
                  </div>
                  <div className='dark:bg-secondary rounded-lg bg-gray-100 p-4 text-center'>
                    <p className='dark:text-foreground text-2xl font-bold text-gray-800'>
                      #{stats.rank}
                    </p>
                    <p className='dark:text-muted-foreground text-xs text-gray-600'>
                      Global Rank
                    </p>
                  </div>
                  <div className='dark:bg-secondary rounded-lg bg-gray-100 p-4 text-center'>
                    <p className='dark:text-foreground text-2xl font-bold text-gray-800'>
                      {stats.achievements.unlocked}
                    </p>
                    <p className='dark:text-muted-foreground text-xs text-gray-600'>
                      Achievements
                    </p>
                  </div>
                  <div className='dark:bg-secondary rounded-lg bg-gray-100 p-4 text-center'>
                    <p className='dark:text-foreground text-2xl font-bold text-gray-800'>
                      {stats.achievements.percentage}%
                    </p>
                    <p className='dark:text-muted-foreground text-xs text-gray-600'>
                      Completion
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Tabs defaultValue='quests' className='space-y-4'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='quests' className='flex items-center gap-2'>
              <Target className='h-4 w-4' />
              Quests
            </TabsTrigger>
            <TabsTrigger
              value='achievements'
              className='flex items-center gap-2'
            >
              <Trophy className='h-4 w-4' />
              Achievements
            </TabsTrigger>
            <TabsTrigger
              value='leaderboard'
              className='flex items-center gap-2'
            >
              <Users className='h-4 w-4' />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value='quests' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Daily Quests</CardTitle>
              </CardHeader>
              <CardContent className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                {quests?.dailyQuests?.map((quest: any) => (
                  <QuestCard key={quest.id} quest={quest} type='daily' />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Quests</CardTitle>
              </CardHeader>
              <CardContent className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                {quests?.weeklyQuests?.length > 0 ? (
                  quests.weeklyQuests.map((quest: any) => (
                    <QuestCard key={quest.id} quest={quest} type='weekly' />
                  ))
                ) : (
                  <div className='text-muted-foreground col-span-full py-8 text-center'>
                    No weekly quests available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='achievements'>
            <Card>
              <CardHeader>
                <CardTitle>Your Achievements</CardTitle>
              </CardHeader>
              <CardContent className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {achievements?.map(achievement => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='leaderboard'>
            <Card>
              <CardContent className='pt-6'>
                <Leaderboard
                  entries={leaderboard || []}
                  currentUserId={user?.id}
                  period='all_time'
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Navigation Cards */}
        <div className='mt-8 grid grid-cols-1 gap-4 md:grid-cols-2'>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Link href={appRoutes.rewards.leaderboard}>
              <Card className='group cursor-pointer border-2 border-transparent transition-all hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/20'>
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg'>
                        <Swords className='h-6 w-6 text-white' />
                      </div>
                      <div>
                        <h3 className='text-lg font-bold'>
                          Global Leaderboard
                        </h3>
                        <p className='text-muted-foreground text-sm'>
                          Compete with players worldwide
                        </p>
                      </div>
                    </div>
                    <ArrowRight className='text-muted-foreground group-hover:text-foreground h-5 w-5 transition-colors' />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Link href={appRoutes.rewards.quests}>
              <Card className='group cursor-pointer border-2 border-transparent transition-all hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/20'>
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg'>
                        <ScrollText className='h-6 w-6 text-white' />
                      </div>
                      <div>
                        <h3 className='text-lg font-bold'>Quest Board</h3>
                        <p className='text-muted-foreground text-sm'>
                          View all available quests
                        </p>
                      </div>
                    </div>
                    <ArrowRight className='text-muted-foreground group-hover:text-foreground h-5 w-5 transition-colors' />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>
      </div>

      <LevelUpAnimation
        show={showLevelUp}
        newLevel={newLevel}
        xpGained={xpGained}
        onComplete={() => setShowLevelUp(false)}
      />
    </div>
  )
}
