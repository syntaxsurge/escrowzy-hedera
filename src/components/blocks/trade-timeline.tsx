'use client'

import {
  CheckCircle2,
  Clock,
  Shield,
  DollarSign,
  Trophy,
  AlertCircle,
  Timer,
  Send,
  ExternalLink
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib'
import { buildTxUrl } from '@/lib/blockchain'

interface TimelineStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'completed' | 'current' | 'pending'
  timestamp?: Date
  metadata?: {
    amount?: string
    txHash?: string
    paymentMethod?: string
  }
}

interface TradeTimelineProps {
  status: string
  createdAt: Date
  completedAt?: Date
  metadata?: any
  chainId?: number
  className?: string
  listingCategory?: 'p2p' | 'domain'
}

export function TradeTimeline({
  status,
  createdAt,
  completedAt,
  metadata,
  chainId,
  className,
  listingCategory: listingType = 'p2p'
}: TradeTimelineProps) {
  // Define all possible steps
  const getAllSteps = (): TimelineStep[] => {
    // Different steps for domain vs P2P trades
    const isDomain = (listingType as string) === 'domain'
    if (isDomain) {
      const steps: TimelineStep[] = [
        {
          id: 'created',
          title: 'Trade Created',
          description: 'Domain purchase initiated',
          icon: <Clock className='h-5 w-5' />,
          status: 'completed',
          timestamp: createdAt
        },
        {
          id: 'payment_sent',
          title: 'Payment Sent',
          description: 'Buyer sends payment to escrow smart contract',
          icon: <Send className='h-5 w-5' />,
          status: 'pending',
          metadata: {
            paymentMethod: metadata?.paymentMethod
          }
        },
        {
          id: 'funded',
          title: 'Payment Received',
          description: 'Payment secured in escrow smart contract',
          icon: <Shield className='h-5 w-5' />,
          status: 'pending',
          metadata: {
            txHash: metadata?.cryptoDepositTxHash
          }
        },
        {
          id: 'delivered',
          title: 'Domain Transfer Initiated',
          description: 'Seller has initiated domain transfer to buyer',
          icon: <Send className='h-5 w-5' />,
          status: 'pending'
        },
        {
          id: 'confirmed',
          title: 'Domain Transfer Confirmed',
          description:
            'Buyer confirmed domain receipt and funds released to seller',
          icon: <Trophy className='h-5 w-5' />,
          status: 'pending',
          metadata: {
            txHash: metadata?.claimTxHash
          },
          timestamp: completedAt
        }
      ]
      return steps
    }

    // P2P trade steps (existing flow)
    const steps: TimelineStep[] = [
      {
        id: 'created',
        title: 'Trade Created',
        description: 'Trade initiated between buyer and seller',
        icon: <Clock className='h-5 w-5' />,
        status: 'completed',
        timestamp: createdAt
      },
      {
        id: 'awaiting_deposit',
        title: 'Awaiting Deposit',
        description: 'Seller needs to deposit crypto to escrow',
        icon: <Timer className='h-5 w-5' />,
        status: 'pending'
      },
      {
        id: 'funded',
        title: 'Funded in Escrow',
        description: 'Crypto secured in smart contract',
        icon: <Shield className='h-5 w-5' />,
        status: 'pending',
        metadata: {
          txHash: metadata?.cryptoDepositTxHash
        }
      },
      {
        id: 'payment_sent',
        title: 'Payment Sent',
        description: 'Buyer has sent fiat payment',
        icon: <Send className='h-5 w-5' />,
        status: 'pending',
        metadata: {
          paymentMethod: metadata?.paymentMethod
        }
      },
      {
        id: 'payment_confirmed',
        title: 'Payment Confirmed & Funds Released',
        description: 'Seller confirmed payment and released crypto to buyer',
        icon: <Trophy className='h-5 w-5' />,
        status: 'pending',
        metadata: {
          txHash: metadata?.claimTxHash
        },
        timestamp: completedAt
      }
    ]

    // Update step statuses based on current trade status
    const isDomainTrade = (listingType as string) === 'domain'
    const statusOrder = isDomainTrade
      ? ['created', 'payment_sent', 'funded', 'delivered', 'confirmed']
      : [
          'created',
          'awaiting_deposit',
          'funded',
          'payment_sent',
          'payment_confirmed'
        ]

    // Map 'completed' status to final step for timeline purposes
    const mappedStatus =
      status === 'completed'
        ? isDomainTrade
          ? 'confirmed'
          : 'payment_confirmed'
        : status
    const currentIndex = statusOrder.indexOf(mappedStatus)

    steps.forEach((step, index) => {
      if (index < currentIndex) {
        step.status = 'completed'
      } else if (index === currentIndex) {
        // If trade is completed and this is the payment_confirmed step, mark as completed
        if (status === 'completed' && step.id === 'payment_confirmed') {
          step.status = 'completed'
        } else {
          step.status = 'current'
        }
      } else {
        step.status = 'pending'
      }
    })

    // Handle disputed status
    if (status === 'disputed') {
      const disputedStep: TimelineStep = {
        id: 'disputed',
        title: 'Under Dispute',
        description: 'Trade is under dispute resolution',
        icon: <AlertCircle className='h-5 w-5' />,
        status: 'current'
      }

      // Find where to insert the disputed step
      const lastCompletedIndex = steps.findIndex(s => s.status === 'current')
      if (lastCompletedIndex !== -1) {
        steps.splice(lastCompletedIndex + 1, 0, disputedStep)
        // Update remaining steps to pending
        for (let i = lastCompletedIndex + 2; i < steps.length; i++) {
          steps[i].status = 'pending'
        }
      }
    }

    return steps
  }

  const steps = getAllSteps()
  const completedSteps = steps.filter(s => s.status === 'completed').length
  const totalSteps = steps.filter(s => s.id !== 'disputed').length
  const progressPercentage = (completedSteps / totalSteps) * 100

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        'from-background via-muted/50 to-primary/5 dark:to-primary/10 bg-gradient-to-br',
        'border-2 backdrop-blur-sm',
        className
      )}
    >
      {/* Gaming Progress Bar */}
      <div className='absolute top-0 right-0 left-0 h-2 bg-black/20 dark:bg-white/10'>
        <div className='relative h-full overflow-hidden'>
          <div
            className='from-primary relative h-full bg-gradient-to-r via-purple-600 to-pink-600 transition-all duration-1000'
            style={{ width: `${progressPercentage}%` }}
          >
            <div className='animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent' />
          </div>
        </div>
      </div>

      <div className='p-6 pt-8'>
        {/* Header */}
        <div className='mb-6 text-center'>
          <h3 className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-2xl font-black text-transparent'>
            TRADE TIMELINE
          </h3>
          <p className='text-muted-foreground mt-1 text-sm'>
            Track your trade progress in real-time
          </p>
        </div>

        {/* Progress Stats */}
        <div className='mb-6 flex justify-center gap-8'>
          <div className='text-center'>
            <p className='text-primary text-3xl font-black'>{completedSteps}</p>
            <p className='text-muted-foreground text-xs tracking-wider uppercase'>
              Completed
            </p>
          </div>
          <div className='text-center'>
            <p className='text-muted-foreground text-3xl font-black'>
              {totalSteps - completedSteps}
            </p>
            <p className='text-muted-foreground text-xs tracking-wider uppercase'>
              Remaining
            </p>
          </div>
          <div className='text-center'>
            <p className='bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-3xl font-black text-transparent'>
              {Math.round(progressPercentage)}%
            </p>
            <p className='text-muted-foreground text-xs tracking-wider uppercase'>
              Progress
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className='relative'>
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1
            const isCompleted = step.status === 'completed'
            const isCurrent = step.status === 'current'
            const isDisputed = step.id === 'disputed'

            return (
              <div key={step.id} className='flex gap-4 pb-8 last:pb-0'>
                {/* Step Indicator */}
                <div className='relative flex flex-col items-center'>
                  <div
                    className={cn(
                      'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500',
                      isCompleted &&
                        'border-green-500 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl shadow-green-500/20',
                      isCurrent &&
                        !isDisputed &&
                        'animate-pulse border-blue-500 bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-xl shadow-blue-500/20',
                      isCurrent &&
                        isDisputed &&
                        'animate-pulse border-red-500 bg-gradient-to-br from-red-500 to-pink-600 text-white shadow-xl shadow-red-500/20',
                      !isCompleted &&
                        !isCurrent &&
                        'border-muted-foreground/30 bg-muted/50 text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className='h-6 w-6' />
                    ) : (
                      step.icon
                    )}
                  </div>

                  {/* Connecting Line */}
                  {!isLast && (
                    <div
                      className={cn(
                        'absolute top-12 h-full w-0.5 transition-all duration-500',
                        isCompleted
                          ? 'bg-gradient-to-b from-green-500 to-green-500/50'
                          : 'bg-muted-foreground/20'
                      )}
                      style={{ height: 'calc(100% + 2rem)' }}
                    />
                  )}
                </div>

                {/* Step Content */}
                <div className='flex-1 pt-1'>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <h4
                        className={cn(
                          'text-lg font-bold transition-colors',
                          isCompleted && 'text-green-600 dark:text-green-400',
                          isCurrent &&
                            !isDisputed &&
                            'text-blue-600 dark:text-blue-400',
                          isCurrent &&
                            isDisputed &&
                            'text-red-600 dark:text-red-400',
                          !isCompleted && !isCurrent && 'text-muted-foreground'
                        )}
                      >
                        {step.title}
                      </h4>
                      <p
                        className={cn(
                          'mt-1 text-sm',
                          isCompleted || isCurrent
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {step.description}
                      </p>

                      {/* Metadata */}
                      {step.metadata && (
                        <div className='mt-3 space-y-2'>
                          {step.metadata.paymentMethod && (
                            <Badge variant='outline' className='text-xs'>
                              <DollarSign className='mr-1 h-3 w-3' />
                              {step.metadata.paymentMethod}
                            </Badge>
                          )}
                          {step.metadata.txHash && chainId && (
                            <div className='space-y-1'>
                              <p className='text-muted-foreground text-xs'>
                                Transaction Hash:
                              </p>
                              <a
                                href={buildTxUrl(chainId, step.metadata.txHash)}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='group flex items-center gap-2'
                              >
                                <code className='bg-muted group-hover:bg-muted/80 rounded px-2 py-1 font-mono text-xs transition-colors'>
                                  {step.metadata.txHash.slice(0, 10)}...
                                  {step.metadata.txHash.slice(-8)}
                                </code>
                                <ExternalLink className='text-primary h-3 w-3 transition-transform group-hover:scale-110' />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isCompleted && (
                        <Badge className='border-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white'>
                          ✓ DONE
                        </Badge>
                      )}
                      {isCurrent && !isDisputed && (
                        <Badge className='animate-pulse border-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white'>
                          ⚡ CURRENT
                        </Badge>
                      )}
                      {isCurrent && isDisputed && (
                        <Badge className='animate-pulse border-0 bg-gradient-to-r from-red-500 to-pink-600 text-white'>
                          ⚠️ DISPUTED
                        </Badge>
                      )}
                      {!isCompleted && !isCurrent && (
                        <Badge
                          variant='outline'
                          className='text-muted-foreground'
                        >
                          PENDING
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  {step.timestamp && (
                    <p className='text-muted-foreground mt-2 text-xs'>
                      {new Date(step.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Overall Progress Bar */}
        <div className='mt-6 space-y-2'>
          <div className='flex justify-between text-sm'>
            <span className='text-muted-foreground'>Overall Progress</span>
            <span className='font-bold'>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className='h-3' />
        </div>
      </div>
    </Card>
  )
}
