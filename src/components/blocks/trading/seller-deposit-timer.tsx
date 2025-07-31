'use client'

import { useState, useEffect } from 'react'

import { Timer } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib'

interface SellerDepositTimerProps {
  depositDeadline: string | Date | null
  isSeller?: boolean
  className?: string
}

export function SellerDepositTimer({
  depositDeadline,
  isSeller = false,
  className
}: SellerDepositTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!depositDeadline) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const deadline = new Date(depositDeadline).getTime()
      const remaining = Math.max(0, deadline - now)
      setTimeLeft(Math.floor(remaining / 1000))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [depositDeadline])

  if (timeLeft === null) return null

  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const isCritical = timeLeft < 60
  const isUrgent = timeLeft < 300

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-3',
        isCritical
          ? 'border-red-500 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50'
          : isUrgent
            ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/50 dark:to-yellow-950/50'
            : 'border-blue-400 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50',
        className
      )}
    >
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div
            className={cn(
              'rounded-full p-1.5',
              isCritical
                ? 'bg-red-500 text-white'
                : isUrgent
                  ? 'bg-orange-500 text-white'
                  : 'bg-blue-500 text-white'
            )}
          >
            <Timer className='h-4 w-4' />
          </div>
          <div>
            <p className='text-sm font-semibold'>
              {isSeller ? 'Escrow Deposit Deadline' : 'Seller Escrow Deadline'}
            </p>
            <p
              className={cn(
                'font-mono text-2xl font-bold',
                isCritical && 'text-red-600 dark:text-red-400',
                !isCritical &&
                  isUrgent &&
                  'text-orange-600 dark:text-orange-400',
                !isUrgent && 'text-blue-600 dark:text-blue-400'
              )}
            >
              {formatTimeLeft(timeLeft)}
            </p>
            <p className='text-muted-foreground mt-1 text-xs'>
              {isSeller
                ? 'Complete deposit to secure escrow'
                : 'Waiting for seller to deposit'}
            </p>
          </div>
        </div>
        {isUrgent && (
          <div
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold uppercase',
              isCritical ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
            )}
          >
            {isCritical ? 'Critical!' : 'Hurry!'}
          </div>
        )}
      </div>
      {isUrgent && (
        <Progress value={(timeLeft / 900) * 100} className='mt-2 h-1.5' />
      )}
    </div>
  )
}
