'use client'

import { useState, useEffect } from 'react'

import { X, Loader2, Clock, AlertCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useOKXQueue, formatWaitTime } from '@/hooks/use-okx-queue'
import { cn } from '@/lib'

interface OKXQueueStatusProps {
  className?: string
  showDetails?: boolean
  compact?: boolean
  onClearQueue?: () => void
}

export function OKXQueueStatus({
  className,
  showDetails = true,
  compact = false,
  onClearQueue
}: OKXQueueStatusProps) {
  const {
    queueStatus,
    queueSize,
    isProcessing,
    estimatedWaitTime,
    clearQueue,
    queuePosition
  } = useOKXQueue()

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show the queue status when there are items in queue
    setIsVisible(queueSize > 0)
  }, [queueSize])

  const handleClearQueue = () => {
    clearQueue()
    onClearQueue?.()
  }

  if (!isVisible || !queueStatus) {
    return null
  }

  // Compact mode - just a small indicator
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge
          variant={isProcessing ? 'default' : 'secondary'}
          className='gap-1'
        >
          {isProcessing && <Loader2 className='h-3 w-3 animate-spin' />}
          <span>{queueSize} in queue</span>
        </Badge>
        {estimatedWaitTime > 0 && (
          <span className='text-muted-foreground text-xs'>
            ~{formatWaitTime(estimatedWaitTime)}
          </span>
        )}
      </div>
    )
  }

  // Full card mode with details
  return (
    <Card className={cn('relative', className)}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <CardTitle className='text-base'>OKX API Queue</CardTitle>
            {isProcessing && (
              <Badge variant='default' className='gap-1'>
                <Loader2 className='h-3 w-3 animate-spin' />
                Processing
              </Badge>
            )}
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => setIsVisible(false)}
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
        <CardDescription>
          Managing API requests to prevent rate limiting
        </CardDescription>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Queue Statistics */}
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1'>
            <p className='text-sm font-medium'>Queue Size</p>
            <p className='text-2xl font-bold'>{queueSize}</p>
          </div>
          <div className='space-y-1'>
            <p className='text-sm font-medium'>Est. Wait Time</p>
            <p className='text-2xl font-bold'>
              {formatWaitTime(estimatedWaitTime)}
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        {queuePosition > 0 && (
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Position in queue</span>
              <span className='font-medium'>{queuePosition}</span>
            </div>
            <Progress value={isProcessing ? 50 : 0} className='h-2' />
          </div>
        )}

        {/* Details section */}
        {showDetails && (
          <div className='bg-muted/50 space-y-2 rounded-lg p-3'>
            <div className='flex items-start gap-2'>
              <AlertCircle className='text-muted-foreground mt-0.5 h-4 w-4' />
              <div className='text-muted-foreground text-sm'>
                <p>
                  Requests are queued to comply with OKX API rate limits (1
                  request per second).
                </p>
                <p className='mt-1'>
                  Each request has a 2-second delay to ensure stability.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {queueSize > 1 && (
          <div className='flex items-center justify-between border-t pt-2'>
            <div className='text-muted-foreground flex items-center gap-2 text-sm'>
              <Clock className='h-4 w-4' />
              <span>FIFO processing</span>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={handleClearQueue}
              className='text-destructive hover:text-destructive'
            >
              Clear Queue
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Inline queue indicator for placement in headers/toolbars
export function OKXQueueIndicator({ className }: { className?: string }) {
  const { queueSize, isProcessing } = useOKXQueue()

  if (queueSize === 0) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isProcessing ? (
        <Loader2 className='text-primary h-4 w-4 animate-spin' />
      ) : (
        <Clock className='text-muted-foreground h-4 w-4' />
      )}
      <span className='text-muted-foreground text-sm'>
        {queueSize} request{queueSize !== 1 ? 's' : ''} queued
      </span>
    </div>
  )
}
