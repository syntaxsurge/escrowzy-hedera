'use client'

import { useState, useEffect } from 'react'

import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Circle,
  Clock,
  Gift,
  Target,
  Zap,
  Calendar,
  RefreshCw,
  Trophy
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib'

interface Quest {
  id: string
  name: string
  description: string
  icon: string
  xpReward: number
  progress: {
    current: number
    required: number
  }
  completed?: boolean
  claimed?: boolean
}

interface DailyQuestTrackerProps {
  quests: Quest[]
  onClaimReward?: (questId: string) => void
  resetTime?: string // Time when quests reset (e.g., "00:00 UTC")
  className?: string
}

export function DailyQuestTracker({
  quests,
  onClaimReward,
  resetTime = '00:00 UTC',
  className
}: DailyQuestTrackerProps) {
  const [timeUntilReset, setTimeUntilReset] = useState('')
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null)

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      tomorrow.setUTCHours(0, 0, 0, 0)

      const diff = tomorrow.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeUntilReset(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [])

  const completedQuests = quests.filter(q => q.completed).length
  const totalXPAvailable = quests.reduce((sum, q) => sum + q.xpReward, 0)
  const earnedXP = quests
    .filter(q => q.claimed)
    .reduce((sum, q) => sum + q.xpReward, 0)

  const getProgressPercentage = (quest: Quest) => {
    return Math.min(
      (quest.progress.current / quest.progress.required) * 100,
      100
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className='relative pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2'>
            <Calendar className='text-primary h-5 w-5' />
            Daily Quests
          </CardTitle>
          <div className='flex items-center gap-2 text-sm'>
            <Clock className='text-muted-foreground h-4 w-4' />
            <span className='text-muted-foreground'>Resets in</span>
            <span className='text-primary font-mono font-semibold'>
              {timeUntilReset}
            </span>
          </div>
        </div>

        {/* Overall Progress */}
        <div className='mt-4 space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>
              Progress: {completedQuests}/{quests.length} completed
            </span>
            <span className='text-primary font-semibold'>
              {earnedXP}/{totalXPAvailable} XP
            </span>
          </div>
          <Progress
            value={(completedQuests / quests.length) * 100}
            className='h-2'
          />
        </div>
      </CardHeader>

      <CardContent className='space-y-3 pt-0'>
        <AnimatePresence>
          {quests.map((quest, index) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'group relative rounded-lg border p-4 transition-all',
                quest.completed
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-border bg-secondary/30',
                expandedQuest === quest.id && 'ring-primary/50 ring-2'
              )}
              onClick={() =>
                setExpandedQuest(expandedQuest === quest.id ? null : quest.id)
              }
            >
              <div className='flex items-start justify-between'>
                <div className='flex items-start gap-3'>
                  {/* Quest Icon/Status */}
                  <div className='relative mt-0.5'>
                    <motion.div
                      animate={
                        quest.completed
                          ? { scale: [1, 1.2, 1], rotate: [0, 360] }
                          : {}
                      }
                      transition={{ duration: 0.5 }}
                    >
                      {quest.completed ? (
                        <CheckCircle2 className='h-5 w-5 text-green-500' />
                      ) : (
                        <Circle
                          className={cn(
                            'h-5 w-5',
                            getProgressPercentage(quest) > 0
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          )}
                        />
                      )}
                    </motion.div>
                    {quest.completed && !quest.claimed && (
                      <motion.div
                        className='absolute -top-1 -right-1'
                        animate={{ scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Gift className='h-3 w-3 text-yellow-500' />
                      </motion.div>
                    )}
                  </div>

                  {/* Quest Details */}
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='text-2xl'>{quest.icon}</span>
                      <h4
                        className={cn(
                          'font-semibold',
                          quest.completed && 'text-green-500'
                        )}
                      >
                        {quest.name}
                      </h4>
                    </div>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      {quest.description}
                    </p>

                    {/* Progress Bar */}
                    {!quest.completed && (
                      <div className='mt-3 space-y-1'>
                        <div className='flex items-center justify-between text-xs'>
                          <span className='text-muted-foreground'>
                            Progress: {quest.progress.current}/
                            {quest.progress.required}
                          </span>
                          <span className='font-medium'>
                            {Math.floor(getProgressPercentage(quest))}%
                          </span>
                        </div>
                        <Progress
                          value={getProgressPercentage(quest)}
                          className='h-1.5'
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* XP Reward */}
                <div className='flex flex-col items-end gap-2'>
                  <div
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2 py-1',
                      quest.claimed
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-primary/10 text-primary'
                    )}
                  >
                    <Zap className='h-3 w-3' />
                    <span className='text-xs font-bold'>
                      {quest.claimed ? 'Claimed' : `+${quest.xpReward} XP`}
                    </span>
                  </div>

                  {quest.completed && !quest.claimed && onClaimReward && (
                    <Button
                      size='sm'
                      variant='default'
                      className='h-7 px-2 text-xs'
                      onClick={e => {
                        e.stopPropagation()
                        onClaimReward(quest.id)
                      }}
                    >
                      Claim
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedQuest === quest.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className='mt-3 overflow-hidden border-t pt-3'
                  >
                    <div className='flex items-center justify-between text-sm'>
                      <div className='flex items-center gap-4'>
                        <div className='text-muted-foreground flex items-center gap-1'>
                          <Target className='h-4 w-4' />
                          <span>
                            Goal: {quest.progress.required}{' '}
                            {quest.progress.required === 1 ? 'time' : 'times'}
                          </span>
                        </div>
                        {quest.completed && (
                          <div className='flex items-center gap-1 text-green-500'>
                            <CheckCircle2 className='h-4 w-4' />
                            <span>Completed!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* All Quests Completed */}
        {completedQuests === quests.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className='from-primary/10 rounded-lg bg-gradient-to-r to-purple-500/10 p-4 text-center'
          >
            <Trophy className='text-primary mx-auto h-8 w-8' />
            <h3 className='text-primary mt-2 font-bold'>
              All Quests Complete!
            </h3>
            <p className='text-muted-foreground mt-1 text-sm'>
              Amazing work! Come back tomorrow for new challenges.
            </p>
          </motion.div>
        )}

        {/* Reset Timer Card */}
        <div className='bg-secondary/50 text-muted-foreground flex items-center justify-center gap-2 rounded-lg py-2 text-xs'>
          <RefreshCw className='h-3 w-3' />
          <span>Quests reset daily at {resetTime}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Add missing Trophy import
