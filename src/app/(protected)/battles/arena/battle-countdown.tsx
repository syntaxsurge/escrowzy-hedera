'use client'

import { useEffect, useState } from 'react'

import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Shield, Zap, Flame } from 'lucide-react'

interface BattleCountdownProps {
  onComplete: () => void
  player1Name: string
  player2Name: string
  player1CP: number
  player2CP: number
}

export function BattleCountdown({
  onComplete,
  player1Name,
  player2Name,
  player1CP,
  player2CP
}: BattleCountdownProps) {
  const [count, setCount] = useState(3)
  const [showVs, setShowVs] = useState(false)

  useEffect(() => {
    // Show VS screen first
    setShowVs(true)

    // Start countdown after 2 seconds
    const vsTimer = setTimeout(() => {
      setShowVs(false)

      // Countdown sequence
      const countdownInterval = setInterval(() => {
        setCount(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval)

            // Trigger battle start confetti
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#ff0000', '#ff7700', '#ffdd00', '#00ff00', '#0099ff']
            })

            // Start battle after animation
            setTimeout(onComplete, 500)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, 2000)

    return () => {
      clearTimeout(vsTimer)
    }
  }, [onComplete])

  return (
    <div className='relative flex min-h-[400px] items-center justify-center'>
      <AnimatePresence mode='wait'>
        {showVs ? (
          <motion.div
            key='vs-screen'
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className='w-full'
          >
            <div className='grid grid-cols-3 items-center gap-8'>
              {/* Player 1 */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className='text-center'
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Shield className='mx-auto mb-4 h-20 w-20 text-blue-500' />
                </motion.div>
                <h3 className='text-xl font-bold text-blue-600 dark:text-blue-400'>
                  {player1Name}
                </h3>
                <p className='mt-2 text-3xl font-black'>{player1CP}</p>
                <p className='text-muted-foreground text-xs uppercase'>
                  Combat Power
                </p>
              </motion.div>

              {/* VS */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2] }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
                className='text-center'
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Swords className='mx-auto mb-4 h-24 w-24 text-orange-500' />
                </motion.div>
                <h2 className='bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-6xl font-black text-transparent'>
                  VS
                </h2>
              </motion.div>

              {/* Player 2 */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className='text-center'
              >
                <motion.div
                  animate={{ rotate: [0, -360] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Shield className='mx-auto mb-4 h-20 w-20 text-red-500' />
                </motion.div>
                <h3 className='text-xl font-bold text-red-600 dark:text-red-400'>
                  {player2Name}
                </h3>
                <p className='mt-2 text-3xl font-black'>{player2CP}</p>
                <p className='text-muted-foreground text-xs uppercase'>
                  Combat Power
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className='mt-8 text-center'
            >
              <p className='text-muted-foreground animate-pulse text-lg font-bold'>
                PREPARE FOR BATTLE!
              </p>
            </motion.div>
          </motion.div>
        ) : count > 0 ? (
          <motion.div
            key={`count-${count}`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className='text-center'
          >
            <motion.div
              animate={{ scale: [1, 1.2] }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'reverse'
              }}
            >
              {count === 3 && (
                <Zap className='mx-auto mb-4 h-32 w-32 text-yellow-500' />
              )}
              {count === 2 && (
                <Flame className='mx-auto mb-4 h-32 w-32 text-orange-500' />
              )}
              {count === 1 && (
                <Swords className='mx-auto mb-4 h-32 w-32 text-red-500' />
              )}
            </motion.div>
            <motion.h1
              animate={{ scale: [1, 1.1] }}
              transition={{ duration: 0.3, repeatType: 'reverse' }}
              className='bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-9xl font-black text-transparent'
            >
              {count}
            </motion.h1>
          </motion.div>
        ) : (
          <motion.div
            key='go'
            initial={{ scale: 0, rotate: -360 }}
            animate={{ scale: [1, 1.5], rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className='text-center'
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Swords className='mx-auto mb-4 h-32 w-32 text-red-500' />
            </motion.div>
            <h1 className='animate-pulse bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-9xl font-black text-transparent'>
              FIGHT!
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
