'use client'

import { ReactNode, useEffect } from 'react'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, PartyPopper, Trophy, Zap } from 'lucide-react'

import { cn } from '@/lib'

// Success Animation Component
interface SuccessAnimationProps {
  show: boolean
  message?: string
  onComplete?: () => void
  variant?: 'check' | 'confetti' | 'trophy'
  size?: 'sm' | 'md' | 'lg'
}

export function SuccessAnimation({
  show,
  message = 'Success!',
  onComplete,
  variant = 'check',
  size = 'md'
}: SuccessAnimationProps) {
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32'
  }

  const icons = {
    check: CheckCircle2,
    confetti: PartyPopper,
    trophy: Trophy
  }

  const Icon = icons[variant]

  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2000)
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
          className='flex flex-col items-center justify-center gap-4'
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.5 }}
          >
            <Icon className={cn('text-green-500', sizeClasses[size])} />
          </motion.div>
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className='text-lg font-medium'
            >
              {message}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Fade In Animation Wrapper
interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  className
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Slide In Animation Wrapper
interface SlideInProps {
  children: ReactNode
  direction?: 'left' | 'right' | 'up' | 'down'
  delay?: number
  className?: string
}

export function SlideIn({
  children,
  direction = 'left',
  delay = 0,
  className
}: SlideInProps) {
  const variants = {
    left: { x: -50, opacity: 0 },
    right: { x: 50, opacity: 0 },
    up: { y: -50, opacity: 0 },
    down: { y: 50, opacity: 0 }
  }

  return (
    <motion.div
      initial={variants[direction]}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Scale Animation Wrapper
interface ScaleAnimationProps {
  children: ReactNode
  hover?: boolean
  tap?: boolean
  className?: string
}

export function ScaleAnimation({
  children,
  hover = true,
  tap = true,
  className
}: ScaleAnimationProps) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.05 } : undefined}
      whileTap={tap ? { scale: 0.95 } : undefined}
      transition={{ type: 'spring', stiffness: 300 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Progress Animation
interface ProgressAnimationProps {
  value: number
  max?: number
  showPercentage?: boolean
  className?: string
  color?: string
}

export function ProgressAnimation({
  value,
  max = 100,
  showPercentage = true,
  className,
  color = 'bg-primary'
}: ProgressAnimationProps) {
  const percentage = (value / max) * 100

  return (
    <div className={cn('space-y-2', className)}>
      {showPercentage && (
        <div className='flex justify-between text-sm'>
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className='bg-secondary h-2 overflow-hidden rounded-full'>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          className={cn('h-full rounded-full', color)}
        />
      </div>
    </div>
  )
}

// Level Up Animation
interface LevelUpAnimationProps {
  show: boolean
  level: number
  onComplete?: () => void
}

export function LevelUpAnimation({
  show,
  level,
  onComplete
}: LevelUpAnimationProps) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 3000)
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
          className='bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm'
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.5 }}
            className='bg-card rounded-lg border p-8 text-center shadow-xl'
          >
            <Zap className='mx-auto mb-4 h-20 w-20 text-yellow-500' />
            <h2 className='mb-2 text-3xl font-bold'>Level Up!</h2>
            <p className='text-muted-foreground text-xl'>
              You reached level {level}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Combat Power Change Animation
interface CombatPowerAnimationProps {
  show: boolean
  change: number
  newValue: number
}

export function CombatPowerAnimation({
  show,
  change
}: CombatPowerAnimationProps) {
  const isPositive = change > 0

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            'absolute -top-8 left-1/2 -translate-x-1/2 text-lg font-bold',
            isPositive ? 'text-green-500' : 'text-red-500'
          )}
        >
          {isPositive ? '+' : ''}
          {change} CP
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Stagger Children Animation
interface StaggerChildrenProps {
  children: ReactNode[]
  delay?: number
  className?: string
}

export function StaggerChildren({
  children,
  delay = 0.1,
  className
}: StaggerChildrenProps) {
  return (
    <motion.div className={className}>
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * delay }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

// Pulse Animation
interface PulseAnimationProps {
  children: ReactNode
  className?: string
}

export function PulseAnimation({ children, className }: PulseAnimationProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatType: 'loop'
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Notification Badge Animation
interface NotificationBadgeProps {
  count: number
  className?: string
}

export function NotificationBadge({
  count,
  className
}: NotificationBadgeProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className={cn(
            'bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold',
            className
          )}
        >
          {count > 9 ? '9+' : count}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
