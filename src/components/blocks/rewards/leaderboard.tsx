'use client'

import { motion } from 'framer-motion'
import { Trophy, Medal, Award, Crown, TrendingUp } from 'lucide-react'

import { UserAvatar } from '@/components/blocks/user-avatar'
import { cn } from '@/lib'

import { LevelBadge } from './level-badge'

interface LeaderboardEntry {
  rank: number
  userId: number
  userName: string | null
  walletAddress: string
  avatarPath: string | null
  xp: number
  level: number
  loginStreak: number
  levelInfo: {
    title: string
    color: string
  }
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  currentUserId?: number
  period?: 'daily' | 'weekly' | 'monthly' | 'all_time'
  className?: string
}

export function Leaderboard({
  entries,
  currentUserId,
  period = 'all_time',
  className
}: LeaderboardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className='h-5 w-5 text-yellow-500' />
      case 2:
        return <Medal className='h-5 w-5 text-gray-400' />
      case 3:
        return <Award className='h-5 w-5 text-orange-600' />
      default:
        return (
          <span className='text-muted-foreground text-sm font-bold'>
            #{rank}
          </span>
        )
    }
  }

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
      case 2:
        return 'bg-gradient-to-r from-gray-500/10 to-gray-400/10 border-gray-500/30'
      case 3:
        return 'bg-gradient-to-r from-orange-600/10 to-orange-500/10 border-orange-500/30'
      default:
        return 'bg-secondary/50 border-border'
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className='mb-4 flex items-center justify-between'>
        <h3 className='flex items-center gap-2 text-lg font-bold'>
          <Trophy className='h-5 w-5 text-yellow-500' />
          Leaderboard
        </h3>
        <span className='text-muted-foreground text-sm capitalize'>
          {period.replace('_', ' ')}
        </span>
      </div>

      <div className='space-y-2'>
        {entries.map((entry, index) => (
          <motion.div
            key={entry.userId}
            className={cn(
              'relative flex items-center gap-3 rounded-lg border p-3 transition-all',
              getRankStyle(entry.rank),
              entry.userId === currentUserId &&
                'ring-primary ring-2 ring-offset-2'
            )}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
          >
            <div className='flex w-10 items-center justify-center'>
              {getRankIcon(entry.rank)}
            </div>

            <UserAvatar
              user={{
                name: entry.userName,
                avatarPath: entry.avatarPath
              }}
              walletAddress={entry.walletAddress}
              size='md'
            />

            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <p className='truncate text-sm font-semibold'>
                  {entry.userName ||
                    `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`}
                </p>
                {entry.userId === currentUserId && (
                  <span className='bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs'>
                    You
                  </span>
                )}
              </div>
              <div className='text-muted-foreground flex items-center gap-3 text-xs'>
                <span className={cn('font-medium', entry.levelInfo.color)}>
                  {entry.levelInfo.title}
                </span>
                <span className='flex items-center gap-1'>
                  <TrendingUp className='h-3 w-3' />
                  {entry.loginStreak} day streak
                </span>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              <LevelBadge
                level={entry.level}
                size='sm'
                showTitle={false}
                animated={false}
              />
              <div className='text-right'>
                <p className='text-sm font-bold'>{entry.xp.toLocaleString()}</p>
                <p className='text-muted-foreground text-xs'>XP</p>
              </div>
            </div>

            {entry.rank <= 3 && (
              <motion.div
                className='pointer-events-none absolute inset-0 rounded-lg'
                animate={{
                  boxShadow: [
                    `0 0 20px ${entry.rank === 1 ? 'rgba(234, 179, 8, 0.3)' : entry.rank === 2 ? 'rgba(156, 163, 175, 0.3)' : 'rgba(234, 88, 12, 0.3)'}`,
                    `0 0 30px ${entry.rank === 1 ? 'rgba(234, 179, 8, 0.5)' : entry.rank === 2 ? 'rgba(156, 163, 175, 0.5)' : 'rgba(234, 88, 12, 0.5)'}`,
                    `0 0 20px ${entry.rank === 1 ? 'rgba(234, 179, 8, 0.3)' : entry.rank === 2 ? 'rgba(156, 163, 175, 0.3)' : 'rgba(234, 88, 12, 0.3)'}`
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
