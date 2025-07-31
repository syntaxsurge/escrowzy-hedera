'use client'

import { useEffect, useState } from 'react'

import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'

import { LEVELS } from '@/config/rewards'
import { cn } from '@/lib'

import { LevelBadge } from './level-badge'

interface LevelUpAnimationProps {
  show: boolean
  newLevel: number
  xpGained?: number
  onComplete?: () => void
}

export function LevelUpAnimation({
  show,
  newLevel,
  xpGained,
  onComplete
}: LevelUpAnimationProps) {
  const [isVisible, setIsVisible] = useState(show)
  const levelInfo = LEVELS[newLevel - 1] || LEVELS[0]

  useEffect(() => {
    if (show) {
      setIsVisible(true)

      // Trigger confetti
      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          clearInterval(interval)
          return
        }

        const particleCount = 50 * (timeLeft / duration)

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#fbbf24', '#f59e0b', '#d97706']
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#fbbf24', '#f59e0b', '#d97706']
        })
      }, 250)

      // Auto close after 3 seconds
      setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className='pointer-events-auto absolute inset-0 bg-black/50'
            onClick={() => {
              setIsVisible(false)
              onComplete?.()
            }}
          />

          <motion.div
            className='bg-background relative z-10 flex flex-col items-center gap-6 rounded-2xl border-2 border-yellow-500 p-8 shadow-2xl'
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className='bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-3xl font-bold text-transparent'>
                LEVEL UP!
              </h2>
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              <LevelBadge level={newLevel} size='xl' />
            </motion.div>

            <motion.div
              className='text-center'
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className='mb-2 text-xl font-semibold'>
                You've reached Level {newLevel}
              </p>
              <p className={cn('text-lg font-bold', levelInfo.color)}>
                {levelInfo.title}
              </p>
              {xpGained && (
                <p className='text-muted-foreground mt-2 text-sm'>
                  +{xpGained} XP gained
                </p>
              )}
            </motion.div>

            <motion.div
              className='absolute -top-10 -left-10 text-6xl'
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              ⭐
            </motion.div>
            <motion.div
              className='absolute -top-10 -right-10 text-6xl'
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              🎉
            </motion.div>
            <motion.div
              className='absolute -bottom-10 -left-10 text-6xl'
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              🏆
            </motion.div>
            <motion.div
              className='absolute -right-10 -bottom-10 text-6xl'
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              ✨
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
