'use client'

import { useEffect, useState } from 'react'

import { motion } from 'framer-motion'
import { Clock, Zap, TrendingDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib'
import type { BattleDiscount } from '@/types/battle'

interface DiscountTimerProps {
  discount: BattleDiscount
  className?: string
}

export function DiscountTimer({ discount, className }: DiscountTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [percentageRemaining, setPercentageRemaining] = useState(100)
  const [isExpiring, setIsExpiring] = useState(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date()
      const expiresAt = new Date(discount.expiresAt)

      // Check for invalid date
      if (isNaN(expiresAt.getTime())) {
        setTimeRemaining('Invalid date')
        setPercentageRemaining(0)
        return false
      }

      const diff = expiresAt.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining('Expired')
        setPercentageRemaining(0)
        return false
      }

      const totalDuration = 24 * 60 * 60 * 1000 // 24 hours in ms
      const elapsed = totalDuration - diff
      const percentage = ((totalDuration - elapsed) / totalDuration) * 100
      setPercentageRemaining(percentage)

      // Set expiring when less than 1 hour remaining
      setIsExpiring(diff < 60 * 60 * 1000)

      const hours = Math.floor(diff / (1000 * 60 * 60)) || 0
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)) || 0
      const seconds = Math.floor((diff % (1000 * 60)) / 1000) || 0

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`)
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`)
      } else {
        setTimeRemaining(`${seconds}s`)
      }

      return true
    }

    // Initial calculation
    const shouldContinue = calculateTimeRemaining()

    if (!shouldContinue) return

    // Update every second
    const interval = setInterval(() => {
      const shouldContinue = calculateTimeRemaining()
      if (!shouldContinue) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [discount.expiresAt])

  if (
    timeRemaining === 'Expired' ||
    timeRemaining === 'Invalid date' ||
    !timeRemaining
  ) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card
        className={cn(
          'border-2',
          isExpiring ? 'border-orange-500' : 'border-green-500'
        )}
      >
        <CardContent className='p-4'>
          <div className='mb-3 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div
                className={cn(
                  'rounded-lg p-2',
                  isExpiring ? 'bg-orange-100' : 'bg-green-100'
                )}
              >
                <Zap
                  className={cn(
                    'h-4 w-4',
                    isExpiring ? 'text-orange-600' : 'text-green-600'
                  )}
                />
              </div>
              <div>
                <p className='text-sm font-semibold'>Active Discount</p>
                <div className='flex items-center gap-2'>
                  <Badge variant={isExpiring ? 'destructive' : 'default'}>
                    <TrendingDown className='mr-1 h-3 w-3' />
                    {discount.discountPercent}% OFF FEES
                  </Badge>
                </div>
              </div>
            </div>

            <div className='text-right'>
              <div className='flex items-center gap-1 text-sm font-medium'>
                <Clock
                  className={cn(
                    'h-3 w-3',
                    isExpiring && 'animate-pulse text-orange-600'
                  )}
                />
                {timeRemaining}
              </div>
              {isExpiring && (
                <p className='animate-pulse text-xs text-orange-600'>
                  Expiring Soon!
                </p>
              )}
            </div>
          </div>

          <Progress
            value={percentageRemaining}
            className={cn('h-1.5', isExpiring && '[&>div]:bg-orange-500')}
          />

          <p className='text-muted-foreground mt-2 text-xs'>
            Win another battle to refresh your discount
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
