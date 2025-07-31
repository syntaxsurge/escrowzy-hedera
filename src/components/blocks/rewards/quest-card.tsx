'use client'

import { motion } from 'framer-motion'
import { Clock, Trophy, CheckCircle2 } from 'lucide-react'

import type { DailyQuest, WeeklyQuest } from '@/config/rewards'
import { cn } from '@/lib'

interface QuestCardProps {
  quest: (DailyQuest | WeeklyQuest) & {
    completed?: boolean
    progress?: { current: number; required: number }
  }
  type: 'daily' | 'weekly'
  onClick?: () => void
  className?: string
}

export function QuestCard({ quest, type, onClick, className }: QuestCardProps) {
  const progress = quest.progress || { current: 0, required: 1 }
  const percentage = Math.min((progress.current / progress.required) * 100, 100)
  const isCompleted = quest.completed || percentage >= 100

  return (
    <motion.div
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-lg border p-4 transition-all',
        isCompleted
          ? 'border-green-500/30 bg-green-500/10'
          : 'bg-secondary/50 border-border hover:bg-secondary',
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className='mb-3 flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <motion.div
            className={cn(
              'rounded-lg p-2 text-2xl',
              isCompleted ? 'bg-green-500/20' : 'bg-secondary'
            )}
            animate={isCompleted ? { rotate: 360 } : {}}
            transition={{ duration: 0.5 }}
          >
            {quest.icon}
          </motion.div>

          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              <h4 className='text-sm font-semibold'>{quest.name}</h4>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  type === 'daily'
                    ? 'bg-blue-500/20 text-blue-500'
                    : 'bg-purple-500/20 text-purple-500'
                )}
              >
                {type === 'daily' ? 'Daily' : 'Weekly'}
              </span>
            </div>
            <p className='text-muted-foreground mt-1 text-xs'>
              {quest.description}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {isCompleted ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle2 className='h-5 w-5 text-green-500' />
            </motion.div>
          ) : (
            <Clock className='text-muted-foreground h-5 w-5' />
          )}
        </div>
      </div>

      <div className='space-y-2'>
        <div className='flex items-center justify-between text-xs'>
          <span className='text-muted-foreground'>Progress</span>
          <span
            className={cn(
              'font-semibold',
              isCompleted ? 'text-green-500' : 'text-foreground'
            )}
          >
            {progress.current} / {progress.required}
          </span>
        </div>

        <div className='bg-secondary relative h-2 overflow-hidden rounded-full'>
          <motion.div
            className={cn(
              'absolute inset-y-0 left-0',
              isCompleted
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />

          {percentage > 0 && percentage < 100 && (
            <motion.div
              className='absolute inset-y-0 bg-white/30'
              style={{ left: `${percentage}%`, width: '2px' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      <div className='mt-3 flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Trophy className='h-4 w-4 text-yellow-500' />
          <span className='text-foreground text-xs font-semibold'>
            +{quest.xpReward} XP
          </span>
        </div>

        {isCompleted && (
          <motion.span
            className='text-xs font-semibold text-green-500'
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Completed!
          </motion.span>
        )}
      </div>

      {isCompleted && (
        <motion.div
          className='pointer-events-none absolute inset-0'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className='absolute inset-0 bg-gradient-to-tr from-green-500/5 to-transparent' />
        </motion.div>
      )}
    </motion.div>
  )
}
