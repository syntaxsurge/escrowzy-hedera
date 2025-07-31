'use client'

import { useState } from 'react'

import { motion } from 'framer-motion'
import {
  Target,
  Clock,
  Calendar,
  Trophy,
  Zap,
  CheckCircle2,
  Star,
  Sparkles,
  Timer,
  TrendingUp,
  ScrollText
} from 'lucide-react'

import { PageHeader } from '@/components/blocks/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRewards } from '@/hooks/use-rewards'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib'

export default function QuestsPage() {
  const { user } = useSession()
  const { quests, stats } = useRewards(user?.id)
  const [activeTab, setActiveTab] = useState('daily')

  const dailyCompletionRate = quests?.dailyQuests?.length
    ? Math.round(
        (quests.dailyQuests.filter((q: any) => q.completed).length /
          quests.dailyQuests.length) *
          100
      )
    : 0

  const weeklyCompletionRate = quests?.weeklyQuests?.length
    ? Math.round(
        (quests.weeklyQuests.filter((q: any) => q.completed).length /
          quests.weeklyQuests.length) *
          100
      )
    : 0

  const getQuestIcon = (questType: string) => {
    switch (questType) {
      case 'login':
        return <Clock className='h-5 w-5' />
      case 'chat':
        return <Target className='h-5 w-5' />
      case 'team':
        return <Trophy className='h-5 w-5' />
      default:
        return <Star className='h-5 w-5' />
    }
  }

  const getQuestRarity = (xpReward: number) => {
    if (xpReward >= 500)
      return { label: 'Legendary', color: 'from-yellow-500 to-orange-500' }
    if (xpReward >= 300)
      return { label: 'Epic', color: 'from-purple-500 to-pink-500' }
    if (xpReward >= 150)
      return { label: 'Rare', color: 'from-blue-500 to-cyan-500' }
    return { label: 'Common', color: 'from-gray-500 to-gray-600' }
  }

  return (
    <div className='container mx-auto space-y-6 p-6'>
      {/* Header */}
      <PageHeader
        title='QUEST BOARD'
        subtitle='Complete quests to earn XP and rewards'
        icon={<ScrollText className='h-8 w-8 text-white' />}
        actions={
          <div className='flex items-center gap-2'>
            <Badge className='border-yellow-500/50 bg-gradient-to-r from-yellow-900/60 to-amber-900/60 text-yellow-200 dark:from-yellow-500/20 dark:to-amber-500/20 dark:text-amber-300'>
              <Zap className='mr-1 h-3 w-3' />
              {stats?.gameData?.xp.toLocaleString() || 0} Total XP
            </Badge>
          </div>
        }
      />

      {/* Progress Overview */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className='border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10'>
            <CardContent className='p-6'>
              <div className='mb-4 flex items-center justify-between'>
                <div>
                  <p className='text-muted-foreground text-sm'>Daily Quests</p>
                  <p className='text-2xl font-bold'>
                    {quests?.dailyQuests?.filter((q: any) => q.completed)
                      .length || 0}
                    /{quests?.dailyQuests?.length || 0}
                  </p>
                </div>
                <Clock className='h-8 w-8 text-blue-500' />
              </div>
              <Progress value={dailyCompletionRate} className='h-2' />
              <p className='text-muted-foreground mt-2 text-xs'>
                {dailyCompletionRate}% completed
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className='border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10'>
            <CardContent className='p-6'>
              <div className='mb-4 flex items-center justify-between'>
                <div>
                  <p className='text-muted-foreground text-sm'>Weekly Quests</p>
                  <p className='text-2xl font-bold'>
                    {quests?.weeklyQuests?.filter((q: any) => q.completed)
                      .length || 0}
                    /{quests?.weeklyQuests?.length || 0}
                  </p>
                </div>
                <Calendar className='h-8 w-8 text-purple-500' />
              </div>
              <Progress value={weeklyCompletionRate} className='h-2' />
              <p className='text-muted-foreground mt-2 text-xs'>
                {weeklyCompletionRate}% completed
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quest Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='daily' className='flex items-center gap-2'>
            <Clock className='h-4 w-4' />
            Daily
          </TabsTrigger>
          <TabsTrigger value='weekly' className='flex items-center gap-2'>
            <Calendar className='h-4 w-4' />
            Weekly
          </TabsTrigger>
          <TabsTrigger value='special' className='flex items-center gap-2'>
            <Sparkles className='h-4 w-4' />
            Special
          </TabsTrigger>
        </TabsList>

        <TabsContent value='daily' className='mt-6'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {quests?.dailyQuests?.map((quest: any, index: number) => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={cn(
                    'border-2 transition-all hover:shadow-lg',
                    quest.completed
                      ? 'border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/10'
                      : 'border-transparent hover:border-purple-500/30'
                  )}
                >
                  <CardContent className='p-6'>
                    <div className='mb-4 flex items-start justify-between'>
                      <div className='flex items-center gap-3'>
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg',
                            quest.completed
                              ? 'bg-green-500/20'
                              : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                          )}
                        >
                          {quest.completed ? (
                            <CheckCircle2 className='h-5 w-5 text-green-500' />
                          ) : (
                            getQuestIcon(quest.type)
                          )}
                        </div>
                        <div>
                          <p className='font-semibold'>{quest.name}</p>
                          <p className='text-muted-foreground text-sm'>
                            {quest.description}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          'bg-gradient-to-r text-white',
                          getQuestRarity(quest.xpReward).color
                        )}
                      >
                        {quest.xpReward} XP
                      </Badge>
                    </div>

                    <div className='space-y-2'>
                      <div className='flex items-center justify-between text-sm'>
                        <span>Progress</span>
                        <span className='font-semibold'>
                          {quest.progress?.current || 0}/
                          {quest.progress?.required || quest.target || 0}
                        </span>
                      </div>
                      <Progress
                        value={
                          ((quest.progress?.current || 0) /
                            (quest.progress?.required || quest.target || 1)) *
                          100
                        }
                        className='h-2'
                      />
                    </div>

                    {quest.completed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className='mt-4 flex items-center justify-center gap-2 text-sm text-green-500'
                      >
                        <CheckCircle2 className='h-4 w-4' />
                        Completed!
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value='weekly' className='mt-6'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {quests?.weeklyQuests?.map((quest: any, index: number) => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={cn(
                    'border-2 transition-all hover:shadow-lg',
                    quest.completed
                      ? 'border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/10'
                      : 'border-transparent hover:border-purple-500/30'
                  )}
                >
                  <CardContent className='p-6'>
                    <div className='mb-4 flex items-start justify-between'>
                      <div className='flex items-center gap-3'>
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg',
                            quest.completed
                              ? 'bg-green-500/20'
                              : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                          )}
                        >
                          {quest.completed ? (
                            <CheckCircle2 className='h-5 w-5 text-green-500' />
                          ) : (
                            getQuestIcon(quest.type)
                          )}
                        </div>
                        <div>
                          <p className='font-semibold'>{quest.name}</p>
                          <p className='text-muted-foreground text-sm'>
                            {quest.description}
                          </p>
                        </div>
                      </div>
                      <div className='text-right'>
                        <Badge
                          className={cn(
                            'mb-2 bg-gradient-to-r text-white',
                            getQuestRarity(quest.xpReward).color
                          )}
                        >
                          {quest.xpReward} XP
                        </Badge>
                        <div className='text-muted-foreground flex items-center gap-1 text-xs'>
                          <Timer className='h-3 w-3' />
                          {quest.daysRemaining || 7} days left
                        </div>
                      </div>
                    </div>

                    <div className='space-y-2'>
                      <div className='flex items-center justify-between text-sm'>
                        <span>Progress</span>
                        <span className='font-semibold'>
                          {quest.progress?.current || 0}/
                          {quest.progress?.required || quest.target || 0}
                        </span>
                      </div>
                      <Progress
                        value={
                          ((quest.progress?.current || 0) /
                            (quest.progress?.required || quest.target || 1)) *
                          100
                        }
                        className='h-2'
                      />
                    </div>

                    {quest.completed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className='mt-4 flex items-center justify-center gap-2 text-sm text-green-500'
                      >
                        <CheckCircle2 className='h-4 w-4' />
                        Completed!
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value='special' className='mt-6'>
          <Card className='border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10'>
            <CardContent className='py-12 text-center'>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className='mx-auto mb-4 h-16 w-16 text-yellow-500' />
              </motion.div>
              <h3 className='mb-2 text-xl font-bold'>
                Special Events Coming Soon!
              </h3>
              <p className='text-muted-foreground'>
                Limited-time quests with exclusive rewards will appear here
              </p>
              <Badge className='mt-4 border-yellow-500/50 bg-gradient-to-r from-yellow-900/60 to-orange-900/60 text-yellow-200 dark:from-yellow-500/20 dark:to-orange-500/20 dark:text-yellow-300'>
                Stay Tuned
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stats Summary */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <Card className='border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>
                  Quests Completed
                </p>
                <p className='text-2xl font-bold'>
                  {(quests?.dailyQuests?.filter((q: any) => q.completed)
                    .length || 0) +
                    (quests?.weeklyQuests?.filter((q: any) => q.completed)
                      .length || 0)}
                </p>
              </div>
              <CheckCircle2 className='h-8 w-8 text-green-500' />
            </div>
          </CardContent>
        </Card>

        <Card className='border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-amber-500/10'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>XP Available</p>
                <p className='text-2xl font-bold'>
                  {[
                    ...(quests?.dailyQuests || []),
                    ...(quests?.weeklyQuests || [])
                  ]
                    .filter((q: any) => !q.completed)
                    .reduce((acc: number, q: any) => acc + q.xpReward, 0)
                    .toLocaleString()}
                </p>
              </div>
              <Zap className='h-8 w-8 text-yellow-500' />
            </div>
          </CardContent>
        </Card>

        <Card className='border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Completion Rate</p>
                <p className='text-2xl font-bold'>
                  {Math.round((dailyCompletionRate + weeklyCompletionRate) / 2)}
                  %
                </p>
              </div>
              <TrendingUp className='h-8 w-8 text-purple-500' />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
