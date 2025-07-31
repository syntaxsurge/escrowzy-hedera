'use client'

import { useEffect, useState } from 'react'

import {
  CheckCircle,
  Circle,
  Clock,
  Shield,
  AlertCircle,
  Timer,
  Wallet,
  CreditCard,
  TrendingUp
} from 'lucide-react'

import { cn } from '@/lib'

interface TradeStatusTrackerProps {
  status: string
  userRole: 'buyer' | 'seller'
  depositDeadline?: Date | string | null
  className?: string
}

interface StatusStep {
  key: string
  label: string
  buyerDescription?: string
  sellerDescription?: string
  icon: React.ReactNode
}

const statusSteps: StatusStep[] = [
  {
    key: 'created',
    label: 'Trade Created',
    buyerDescription: 'Trade initialized, waiting for seller',
    sellerDescription: 'Trade initialized, prepare to deposit',
    icon: <Circle className='h-5 w-5' />
  },
  {
    key: 'awaiting_deposit',
    label: 'Awaiting Crypto',
    buyerDescription: 'Waiting for seller to deposit crypto to escrow',
    sellerDescription: '⚠️ Deposit crypto to escrow within 15 minutes',
    icon: <Wallet className='h-5 w-5' />
  },
  {
    key: 'funded',
    label: 'Escrow Funded',
    buyerDescription: '✅ Send fiat payment and upload proof',
    sellerDescription: 'Crypto locked • Waiting for buyer payment',
    icon: <Shield className='h-5 w-5' />
  },
  {
    key: 'payment_sent',
    label: 'Payment Sent',
    buyerDescription: 'Payment proof uploaded • Awaiting confirmation',
    sellerDescription: '⚠️ Check your account and confirm receipt',
    icon: <CreditCard className='h-5 w-5' />
  },
  {
    key: 'payment_confirmed',
    label: 'Payment Confirmed',
    buyerDescription: 'Payment confirmed • Crypto releasing',
    sellerDescription: 'Payment confirmed • Releasing crypto',
    icon: <TrendingUp className='h-5 w-5' />
  },
  {
    key: 'completed',
    label: 'Trade Complete',
    buyerDescription: '✅ Crypto received • Trade successful',
    sellerDescription: '✅ Payment received • Trade successful',
    icon: <CheckCircle className='h-5 w-5' />
  }
]

export function TradeStatusTracker({
  status,
  userRole,
  depositDeadline,
  className
}: TradeStatusTrackerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const currentStepIndex = statusSteps.findIndex(step => step.key === status)

  // Calculate time remaining for deposit
  useEffect(() => {
    if (status === 'awaiting_deposit' && depositDeadline) {
      const timer = setInterval(() => {
        const deadline = new Date(depositDeadline)
        const now = new Date()
        const diff = deadline.getTime() - now.getTime()

        if (diff <= 0) {
          setTimeRemaining('Expired')
          clearInterval(timer)
        } else {
          const minutes = Math.floor(diff / 60000)
          const seconds = Math.floor((diff % 60000) / 1000)
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [status, depositDeadline])

  // Handle disputed, refunded, or timeout status
  const isDisputed = status === 'disputed'
  const isRefunded = status === 'refunded'
  const isTimeout = status === 'deposit_timeout'

  if (isDisputed || isRefunded || isTimeout) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <div className='flex items-center gap-3'>
          <div
            className={cn(
              'rounded-full p-2',
              isDisputed || isTimeout
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isDisputed ? (
              <AlertCircle className='h-5 w-5' />
            ) : isTimeout ? (
              <Timer className='h-5 w-5' />
            ) : (
              <CheckCircle className='h-5 w-5' />
            )}
          </div>
          <div className='flex-1'>
            <p className='text-sm font-semibold'>
              {isDisputed
                ? 'Trade Disputed'
                : isTimeout
                  ? 'Deposit Timeout'
                  : 'Trade Refunded'}
            </p>
            <p className='text-muted-foreground text-xs'>
              {isDisputed
                ? 'This trade is under review. Please provide evidence in chat.'
                : isTimeout
                  ? 'The seller failed to deposit within the time limit. Trade cancelled.'
                  : 'Funds have been returned to the buyer.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress Bar */}
      <div className='relative'>
        <div className='bg-muted absolute top-1/2 left-0 h-1 w-full -translate-y-1/2' />
        <div
          className='bg-primary absolute top-1/2 left-0 h-1 -translate-y-1/2 transition-all duration-500'
          style={{
            width: `${Math.max(0, (currentStepIndex / (statusSteps.length - 1)) * 100)}%`
          }}
        />
        <div className='relative flex justify-between'>
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex
            const isCurrent = index === currentStepIndex

            return (
              <div key={step.key} className='flex flex-col items-center'>
                <div
                  className={cn(
                    'relative z-10 rounded-full p-2 transition-all duration-300',
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border-muted text-muted-foreground border-2',
                    isCurrent && 'ring-primary/20 animate-pulse ring-4'
                  )}
                >
                  {isCompleted && index < currentStepIndex ? (
                    <CheckCircle className='h-5 w-5' />
                  ) : (
                    step.icon
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Step Details */}
      <div className='bg-muted/50 rounded-lg p-3'>
        <div className='flex items-start gap-2'>
          <Clock className='text-muted-foreground mt-0.5 h-4 w-4' />
          <div className='flex-1 space-y-1'>
            <p className='text-sm font-medium'>
              {statusSteps[currentStepIndex]?.label || 'Unknown Status'}
            </p>
            <p className='text-muted-foreground text-xs'>
              {userRole === 'buyer'
                ? statusSteps[currentStepIndex]?.buyerDescription
                : statusSteps[currentStepIndex]?.sellerDescription}
            </p>
            {status === 'awaiting_deposit' && timeRemaining && (
              <p
                className={cn(
                  'text-xs font-medium',
                  timeRemaining === 'Expired'
                    ? 'text-destructive'
                    : 'text-warning'
                )}
              >
                {timeRemaining === 'Expired'
                  ? '⚠️ Deposit deadline expired'
                  : `⏱️ Time remaining: ${timeRemaining}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Step Labels (for larger screens) */}
      <div className='hidden justify-between text-xs sm:flex'>
        {statusSteps.map((step, index) => {
          const isCompleted = index <= currentStepIndex
          return (
            <div
              key={step.key}
              className={cn(
                'flex-1 text-center',
                isCompleted ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <p className='font-medium'>{step.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
