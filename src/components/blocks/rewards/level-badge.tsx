'use client'

import { motion } from 'framer-motion'
import { Star, Sparkles, Crown, Flame, Zap, Shield } from 'lucide-react'

import { LEVELS } from '@/config/rewards'
import { cn } from '@/lib'

interface LevelBadgeProps {
  level: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showTitle?: boolean
  animated?: boolean
  className?: string
}

export function LevelBadge({
  level,
  size = 'md',
  showTitle = true,
  animated = true,
  className
}: LevelBadgeProps) {
  const levelInfo = LEVELS[level - 1] || LEVELS[0]

  const sizeClasses = {
    sm: 'w-12 h-12 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-20 h-20 text-base',
    xl: 'w-24 h-24 text-lg'
  }

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32
  }

  const getIcon = () => {
    if (level >= 90)
      return <Crown className='text-red-400' size={iconSize[size]} />
    if (level >= 75)
      return <Flame className='text-orange-400' size={iconSize[size]} />
    if (level >= 60)
      return <Star className='text-yellow-400' size={iconSize[size]} />
    if (level >= 45)
      return <Zap className='text-purple-400' size={iconSize[size]} />
    if (level >= 30)
      return <Shield className='text-blue-400' size={iconSize[size]} />
    return <Sparkles className='text-green-400' size={iconSize[size]} />
  }

  return (
    <motion.div
      className={cn('flex flex-col items-center gap-2', className)}
      initial={animated ? { scale: 0 } : undefined}
      animate={animated ? { scale: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className='relative'>
        <motion.div
          className={cn(
            'relative flex items-center justify-center rounded-full',
            'bg-gradient-to-br shadow-lg',
            levelInfo.bgGradient,
            sizeClasses[size]
          )}
          whileHover={animated ? { scale: 1.1, rotate: 360 } : undefined}
          transition={{ duration: 0.3 }}
        >
          <div className='absolute inset-0 rounded-full bg-white/10 backdrop-blur-sm' />

          <div className='relative z-10 flex flex-col items-center'>
            {getIcon()}
            <span className='font-bold text-white drop-shadow-md'>{level}</span>
          </div>

          {level >= 75 && (
            <motion.div
              className='absolute inset-0 rounded-full'
              animate={{
                boxShadow: [
                  '0 0 20px rgba(255,255,255,0.5)',
                  '0 0 40px rgba(255,255,255,0.8)',
                  '0 0 20px rgba(255,255,255,0.5)'
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

        {level >= 90 && (
          <>
            <motion.div
              className='absolute -top-1 -left-1 h-3 w-3 rounded-full bg-yellow-400'
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
            <motion.div
              className='absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-yellow-400'
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5
              }}
            />
            <motion.div
              className='absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-400'
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1
              }}
            />
            <motion.div
              className='absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-yellow-400'
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1.5
              }}
            />
          </>
        )}
      </div>

      {showTitle && (
        <motion.span
          className={cn('font-semibold', levelInfo.color)}
          initial={animated ? { opacity: 0, y: 10 } : undefined}
          animate={animated ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.2 }}
        >
          {levelInfo.title}
        </motion.span>
      )}
    </motion.div>
  )
}
