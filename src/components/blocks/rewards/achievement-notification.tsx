'use client'

import { useEffect } from 'react'

import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, Award, Medal } from 'lucide-react'

import { cn } from '@/lib'

interface AchievementNotificationProps {
  show: boolean
  achievement: {
    name: string
    description: string
    icon?: string
    rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  } | null
  onClose: () => void
}

export function AchievementNotification({
  show,
  achievement,
  onClose
}: AchievementNotificationProps) {
  useEffect(() => {
    if (show && achievement) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981']
      })

      // Auto close after 5 seconds
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [show, achievement, onClose])

  const rarityConfig = {
    common: {
      gradient: 'from-gray-400 to-gray-600',
      glow: 'shadow-gray-400/50',
      icon: Medal
    },
    rare: {
      gradient: 'from-blue-400 to-blue-600',
      glow: 'shadow-blue-400/50',
      icon: Star
    },
    epic: {
      gradient: 'from-purple-400 to-purple-600',
      glow: 'shadow-purple-400/50',
      icon: Award
    },
    legendary: {
      gradient: 'from-yellow-400 to-orange-500',
      glow: 'shadow-yellow-400/50',
      icon: Trophy
    }
  }

  const config = rarityConfig[achievement?.rarity || 'common']
  const Icon = config.icon

  return (
    <AnimatePresence>
      {show && achievement && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          className='fixed top-20 left-1/2 z-50 -translate-x-1/2'
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 5, 0] }}
            transition={{ duration: 0.5, repeat: 2 }}
            className={cn(
              'relative rounded-2xl border-2 border-white/20 bg-black/90 p-6 backdrop-blur-xl',
              'shadow-2xl',
              config.glow
            )}
          >
            <div
              className='absolute inset-0 rounded-2xl bg-gradient-to-r opacity-20'
              style={{
                backgroundImage: `linear-gradient(to right, ${
                  achievement.rarity === 'legendary'
                    ? '#f59e0b, #dc2626'
                    : achievement.rarity === 'epic'
                      ? '#8b5cf6, #ec4899'
                      : achievement.rarity === 'rare'
                        ? '#3b82f6, #06b6d4'
                        : '#6b7280, #9ca3af'
                })`
              }}
            />

            <div className='relative flex items-center gap-4'>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br shadow-lg',
                  config.gradient
                )}
              >
                <Icon className='h-8 w-8 text-white' />
              </motion.div>

              <div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className='text-sm font-bold tracking-wider text-white/80 uppercase'
                >
                  Achievement Unlocked!
                </motion.p>
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className='text-xl font-bold text-white'
                >
                  {achievement.name}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className='text-sm text-white/60'
                >
                  {achievement.description}
                </motion.p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className='absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white/20 text-white hover:bg-white/30'
            >
              ×
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
