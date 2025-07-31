'use client'

import { useState, useEffect } from 'react'

import { motion } from 'framer-motion'

import { cn } from '@/lib'

interface XPBarProps {
  currentXP: number
  requiredXP: number
  level: number
  className?: string
  showAnimation?: boolean
  color?: string
}

export function XPBar({
  currentXP,
  requiredXP,
  level,
  className,
  showAnimation = true,
  color = 'from-blue-500 to-cyan-500'
}: XPBarProps) {
  const [displayXP, setDisplayXP] = useState(showAnimation ? 0 : currentXP)
  const percentage = Math.min((displayXP / requiredXP) * 100, 100)

  useEffect(() => {
    if (!showAnimation) {
      setDisplayXP(currentXP)
      return
    }

    const duration = 2000
    const steps = 60
    const increment = currentXP / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= currentXP) {
        setDisplayXP(currentXP)
        clearInterval(timer)
      } else {
        setDisplayXP(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [currentXP, showAnimation])

  return (
    <div className={cn('relative', className)}>
      <div className='mb-2 flex items-center justify-between'>
        <span className='text-foreground/80 text-sm font-medium'>
          Level {level}
        </span>
        <span className='text-foreground/60 text-sm font-medium'>
          {displayXP.toLocaleString()} / {requiredXP.toLocaleString()} XP
        </span>
      </div>

      <div className='bg-secondary relative h-6 overflow-hidden rounded-full'>
        <motion.div
          className={cn('absolute inset-0 bg-gradient-to-r', color)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: showAnimation ? 2 : 0,
            ease: 'easeOut'
          }}
        >
          <div className='absolute inset-0 animate-pulse bg-white/20' />
          <div
            className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent'
            style={{
              animation: 'shimmer 2s infinite linear',
              transform: 'translateX(-100%)'
            }}
          />
        </motion.div>

        <div className='absolute inset-0 flex items-center justify-center'>
          <span className='text-foreground/80 text-xs font-bold drop-shadow-sm'>
            {Math.floor(percentage)}%
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  )
}
