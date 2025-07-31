'use client'

import { useEffect, useState } from 'react'

import { motion } from 'framer-motion'
import { Zap, Timer, TrendingDown, X } from 'lucide-react'

import { apiEndpoints } from '@/config/api-endpoints'
import { api } from '@/lib/api/http-client'

interface DiscountData {
  hasDiscount: boolean
  discount?: {
    feeDiscountPercent: number
    discountExpiresAt: string
  }
  timeRemaining?: {
    hours: number
    minutes: number
    formatted: string
  }
}

export function ActiveDiscountBanner() {
  const [discountData, setDiscountData] = useState<DiscountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    async function fetchDiscount() {
      try {
        const response = await api.get(apiEndpoints.battles.activeDiscount)
        if (response.data?.data) {
          setDiscountData(response.data.data)
        }
      } catch (error) {
        console.error('Failed to fetch discount:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDiscount()

    // Refresh every minute to update time remaining
    const interval = setInterval(fetchDiscount, 60000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading || !discountData?.hasDiscount || isDismissed) {
    return null
  }

  const { discount, timeRemaining } = discountData

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className='relative mb-6'
    >
      <div className='relative overflow-hidden rounded-2xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-100 via-orange-100 to-red-100 p-4 shadow-xl backdrop-blur-sm dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20'>
        <motion.div
          animate={{
            x: [0, 100, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'linear'
          }}
          className='absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent'
        />

        <div className='relative flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className='flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg'
            >
              <Zap className='h-6 w-6 text-white' />
            </motion.div>

            <div>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-bold text-amber-700 dark:text-amber-300'>
                  Battle Victory Discount Active!
                </h3>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className='rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1'
                >
                  <span className='text-sm font-bold text-white'>
                    -{discount?.feeDiscountPercent}% FEES
                  </span>
                </motion.div>
              </div>

              <div className='mt-1 flex items-center gap-4'>
                <div className='flex items-center gap-1.5'>
                  <Timer className='h-4 w-4 text-amber-600 dark:text-amber-400' />
                  <span className='text-sm text-amber-700 dark:text-amber-200'>
                    Expires in: {timeRemaining?.formatted}
                  </span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <TrendingDown className='h-4 w-4 text-green-600 dark:text-green-400' />
                  <span className='text-sm text-green-700 dark:text-green-300'>
                    Trading fees reduced by {discount?.feeDiscountPercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsDismissed(true)}
            className='rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-200 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300'
            aria-label='Dismiss banner'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='mt-3'>
          <div className='h-2 overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700'>
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{
                duration:
                  (timeRemaining?.hours || 0) * 3600 +
                  (timeRemaining?.minutes || 0) * 60,
                ease: 'linear'
              }}
              className='h-full bg-gradient-to-r from-amber-500 to-orange-500'
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
