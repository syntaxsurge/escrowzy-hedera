'use client'

import { useEffect, useState } from 'react'

import { motion, AnimatePresence } from 'framer-motion'

interface XPGainAnimationProps {
  show: boolean
  amount: number
  source?: string
  onComplete?: () => void
}

export function XPGainAnimation({
  show,
  amount,
  source,
  onComplete
}: XPGainAnimationProps) {
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number }>
  >([])

  useEffect(() => {
    if (show) {
      // Generate random particles
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50
      }))
      setParticles(newParticles)

      // Clear particles after animation
      const timer = setTimeout(() => {
        setParticles([])
        if (onComplete) onComplete()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center'
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: -100 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className='relative'
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 0.5,
                repeat: 2
              }}
              className='text-center'
            >
              <motion.span
                className='bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-6xl font-bold text-transparent drop-shadow-2xl'
                animate={{
                  textShadow: [
                    '0 0 20px rgba(251, 191, 36, 0.5)',
                    '0 0 40px rgba(251, 191, 36, 0.8)',
                    '0 0 20px rgba(251, 191, 36, 0.5)'
                  ]
                }}
                transition={{ duration: 1, repeat: 1 }}
              >
                +{amount} XP
              </motion.span>
              {source && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className='mt-2 text-lg font-medium text-white/80'
                >
                  {source}
                </motion.p>
              )}
            </motion.div>

            {/* Particle effects */}
            {particles.map(particle => (
              <motion.div
                key={particle.id}
                className='absolute h-2 w-2 rounded-full bg-yellow-400'
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: particle.x,
                  y: particle.y - 50,
                  opacity: 0
                }}
                transition={{
                  duration: 1,
                  ease: 'easeOut'
                }}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}

            {/* Ring pulse effect */}
            <motion.div
              className='absolute inset-0 rounded-full border-4 border-yellow-400/50'
              initial={{ scale: 0.8, opacity: 1 }}
              animate={{
                scale: 2,
                opacity: 0
              }}
              transition={{
                duration: 1,
                ease: 'easeOut'
              }}
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '150px',
                height: '150px'
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
