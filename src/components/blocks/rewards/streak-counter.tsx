'use client'

import { motion } from 'framer-motion'
import { Flame, Calendar } from 'lucide-react'

import { cn } from '@/lib'

interface StreakCounterProps {
  days: number
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StreakCounter({
  days,
  className,
  showLabel = true,
  size = 'md'
}: StreakCounterProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24
  }

  const getStreakColor = () => {
    if (days >= 365) return 'from-purple-500 to-pink-500'
    if (days >= 100) return 'from-yellow-500 to-orange-500'
    if (days >= 30) return 'from-orange-500 to-red-500'
    if (days >= 7) return 'from-blue-500 to-purple-500'
    return 'from-gray-400 to-gray-500'
  }

  const getFlameIntensity = () => {
    if (days >= 100) return 3
    if (days >= 30) return 2
    if (days >= 7) return 1
    return 0
  }

  const flameIntensity = getFlameIntensity()

  return (
    <motion.div
      className={cn('flex items-center gap-2', sizeClasses[size], className)}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className='relative'>
        <motion.div
          className={cn(
            'relative rounded-lg bg-gradient-to-br p-2',
            getStreakColor()
          )}
          animate={
            days > 0
              ? {
                  scale: [1, 1.1, 1]
                }
              : {}
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <Flame className='text-white' size={iconSize[size]} />

          {flameIntensity > 0 && (
            <>
              {flameIntensity >= 1 && (
                <motion.div
                  className='absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-400'
                  animate={{
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              )}
              {flameIntensity >= 2 && (
                <motion.div
                  className='absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-yellow-400'
                  animate={{
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.3
                  }}
                />
              )}
              {flameIntensity >= 3 && (
                <motion.div
                  className='absolute -top-1 -left-1 h-2 w-2 rounded-full bg-red-400'
                  animate={{
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.6
                  }}
                />
              )}
            </>
          )}
        </motion.div>

        {days >= 7 && (
          <motion.div
            className='absolute inset-0 rounded-lg'
            animate={{
              boxShadow: [
                '0 0 10px rgba(249, 115, 22, 0.3)',
                '0 0 20px rgba(249, 115, 22, 0.5)',
                '0 0 10px rgba(249, 115, 22, 0.3)'
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}
      </div>

      <div className='flex flex-col'>
        <motion.span
          className='font-bold text-gray-800 dark:text-white'
          animate={
            days > 0
              ? {
                  color: ['currentColor', '#f97316', 'currentColor']
                }
              : {}
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          {days}
        </motion.span>
        {showLabel && (
          <span className='text-muted-foreground text-xs'>
            {days === 1 ? 'day' : 'days'}
          </span>
        )}
      </div>

      {days >= 365 && (
        <motion.div
          className='ml-1'
          animate={{ rotate: 360 }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          <Calendar className='h-4 w-4 text-purple-500' />
        </motion.div>
      )}
    </motion.div>
  )
}
