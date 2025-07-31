'use client'

import { useState, useEffect } from 'react'

import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Shield, Flame, Star, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib'

interface BattleInteractionsProps {
  onPowerBoost?: (boost: number) => void
  onAction?: (action: 'attack' | 'defend' | 'special') => void
  isActive: boolean
  playerNumber: 1 | 2
  opponentActions?: Array<{ action: string; value?: number; timestamp: number }>
}

export function BattleInteractions({
  onPowerBoost,
  onAction,
  isActive,
  playerNumber: _playerNumber,
  opponentActions = []
}: BattleInteractionsProps) {
  const [powerLevel, setPowerLevel] = useState(0)
  const [clicks, setClicks] = useState(0)
  const [comboMultiplier, setComboMultiplier] = useState(1)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number }[]
  >([])
  const [specialReady, setSpecialReady] = useState(false)

  // Handle rapid clicking for power boost
  const handlePowerClick = (e: React.MouseEvent) => {
    if (!isActive) return

    const now = Date.now()
    const timeSinceLastClick = now - lastClickTime

    // Combo system - faster clicks = higher multiplier
    if (timeSinceLastClick < 300) {
      setComboMultiplier(prev => Math.min(prev + 0.1, 3))
    } else if (timeSinceLastClick > 1000) {
      setComboMultiplier(1)
    }

    setLastClickTime(now)
    setClicks(prev => prev + 1)

    // Calculate power boost
    const boost = 5 * comboMultiplier
    setPowerLevel(prev => Math.min(prev + boost, 100))

    // Add particle effect at click position
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const particleId = Date.now() + Math.random()

    setParticles(prev => [...prev, { id: particleId, x, y }])
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== particleId))
    }, 1000)

    // Trigger power boost callback
    onPowerBoost?.(boost)

    // Special attack ready at full power
    if (powerLevel >= 90 && !specialReady) {
      setSpecialReady(true)
    }
  }

  // Handle action buttons
  const handleAction = (action: 'attack' | 'defend' | 'special') => {
    if (!isActive) return

    if (action === 'special' && !specialReady) return

    onAction?.(action)

    if (action === 'special') {
      setPowerLevel(0)
      setSpecialReady(false)
      setComboMultiplier(1)
    }
  }

  // Power decay over time (only for active player)
  useEffect(() => {
    if (!isActive) return

    const decayInterval = setInterval(() => {
      setPowerLevel(prev => Math.max(prev - 2, 0))
      if (powerLevel < 90) {
        setSpecialReady(false)
      }
    }, 500)

    return () => clearInterval(decayInterval)
  }, [isActive, powerLevel])

  // Handle opponent actions (visual feedback only)
  useEffect(() => {
    if (isActive || opponentActions.length === 0) return

    const latestAction = opponentActions[opponentActions.length - 1]
    if (!latestAction) return

    // Update visual state based on opponent's action
    if (latestAction.action === 'power-boost' && latestAction.value) {
      setPowerLevel(prev => Math.min(prev + latestAction.value!, 100))
      setClicks(prev => prev + 1)
    } else if (latestAction.action === 'special') {
      setSpecialReady(true)
      setTimeout(() => {
        setSpecialReady(false)
        setPowerLevel(0)
      }, 500)
    }
  }, [opponentActions, isActive])

  return (
    <div className='space-y-4'>
      {/* Power Boost Area */}
      <div className='relative'>
        <motion.div
          className={cn(
            'relative h-48 cursor-pointer overflow-hidden rounded-lg border-2 transition-all',
            isActive
              ? 'border-primary from-primary/20 hover:border-primary/80 bg-gradient-to-br to-purple-600/20'
              : 'cursor-not-allowed border-gray-300 bg-gray-100 dark:bg-gray-800',
            powerLevel > 50 && 'animate-pulse',
            specialReady && 'border-yellow-500 shadow-lg shadow-yellow-500/50'
          )}
          onClick={handlePowerClick}
          whileTap={{ scale: isActive ? 0.98 : 1 }}
        >
          {/* Background effect */}
          <div
            className='from-primary/30 absolute inset-0 bg-gradient-to-t to-transparent transition-all'
            style={{ height: `${powerLevel}%`, bottom: 0 }}
          />

          {/* Click particles */}
          <AnimatePresence>
            {particles.map(particle => (
              <motion.div
                key={particle.id}
                initial={{ x: particle.x, y: particle.y, scale: 0 }}
                animate={{
                  y: particle.y - 100,
                  scale: [1, 1.5, 0],
                  opacity: [1, 1, 0]
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className='pointer-events-none absolute'
              >
                <Sparkles className='h-6 w-6 text-yellow-500' />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Center content */}
          <div className='relative z-10 flex h-full flex-col items-center justify-center'>
            <motion.div
              animate={{
                scale: specialReady ? [1, 1.2, 1] : 1,
                rotate: specialReady ? [0, 10, -10, 0] : 0
              }}
              transition={{
                duration: 0.5,
                repeat: specialReady ? Infinity : 0
              }}
            >
              <Zap
                className={cn(
                  'mb-2 h-12 w-12',
                  powerLevel > 75
                    ? 'text-yellow-500'
                    : powerLevel > 50
                      ? 'text-orange-500'
                      : powerLevel > 25
                        ? 'text-blue-500'
                        : 'text-gray-400'
                )}
              />
            </motion.div>

            <p className='text-sm font-bold text-gray-600 uppercase dark:text-gray-300'>
              {isActive ? 'CLICK RAPIDLY TO POWER UP!' : 'WAITING...'}
            </p>

            {comboMultiplier > 1 && isActive && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className='mt-2 text-2xl font-black text-orange-500'
              >
                {comboMultiplier.toFixed(1)}x COMBO!
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Power Level Bar */}
        <div className='mt-2 space-y-1'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold uppercase'>Power Level</span>
            <span className='text-xs font-bold'>{Math.floor(powerLevel)}%</span>
          </div>
          <Progress
            value={powerLevel}
            className='h-3'
            indicatorClassName={cn(
              'transition-all duration-200',
              specialReady
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse'
                : powerLevel > 75
                  ? 'bg-yellow-500'
                  : powerLevel > 50
                    ? 'bg-orange-500'
                    : powerLevel > 25
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
            )}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className='grid grid-cols-3 gap-2'>
        <Button
          onClick={() => handleAction('attack')}
          disabled={!isActive}
          variant='outline'
          className={cn(
            'h-16 font-bold transition-all',
            isActive && 'hover:border-red-500 hover:bg-red-500/20'
          )}
        >
          <div className='flex flex-col items-center gap-1'>
            <Flame className='h-5 w-5' />
            <span className='text-xs'>ATTACK</span>
          </div>
        </Button>

        <Button
          onClick={() => handleAction('defend')}
          disabled={!isActive}
          variant='outline'
          className={cn(
            'h-16 font-bold transition-all',
            isActive && 'hover:border-blue-500 hover:bg-blue-500/20'
          )}
        >
          <div className='flex flex-col items-center gap-1'>
            <Shield className='h-5 w-5' />
            <span className='text-xs'>DEFEND</span>
          </div>
        </Button>

        <Button
          onClick={() => handleAction('special')}
          disabled={!isActive || !specialReady}
          variant={specialReady ? 'default' : 'outline'}
          className={cn(
            'h-16 font-bold transition-all',
            specialReady &&
              'animate-pulse bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
          )}
        >
          <div className='flex flex-col items-center gap-1'>
            <Star className='h-5 w-5' />
            <span className='text-xs'>SPECIAL</span>
          </div>
        </Button>
      </div>

      {/* Stats Display */}
      <div className='grid grid-cols-2 gap-2 text-center'>
        <div className='bg-primary/10 rounded-lg p-2'>
          <p className='text-muted-foreground text-xs font-bold uppercase'>
            Clicks
          </p>
          <p className='text-lg font-black'>{clicks}</p>
        </div>
        <div className='rounded-lg bg-purple-600/10 p-2'>
          <p className='text-muted-foreground text-xs font-bold uppercase'>
            Combo
          </p>
          <p className='text-lg font-black'>{comboMultiplier.toFixed(1)}x</p>
        </div>
      </div>
    </div>
  )
}
