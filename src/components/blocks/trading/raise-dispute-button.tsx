'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { AlertCircle } from 'lucide-react'

import { TradeActionDialog } from '@/app/(protected)/trades/active/trade-action-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { appRoutes } from '@/config/app-routes'
import { cn } from '@/lib'
import type { TradeStatus } from '@/types/listings'
import type { TradeWithUsers } from '@/types/trade'

interface RaiseDisputeButtonProps {
  trade: TradeWithUsers
  variant?: 'default' | 'card' | 'ghost'
  showOnPages?: 'all' | 'active' | 'history'
  className?: string
  onSuccess?: () => void
}

// Define which statuses can be disputed on which pages
const ACTIVE_PAGE_DISPUTABLE_STATUSES: TradeStatus[] = [
  'funded',
  'payment_sent',
  'payment_confirmed',
  'delivered',
  'confirmed'
]

const HISTORY_PAGE_DISPUTABLE_STATUSES: TradeStatus[] = [
  'completed',
  'cancelled',
  'refunded',
  'funded',
  'payment_sent',
  'payment_confirmed',
  'delivered',
  'confirmed'
]

export function RaiseDisputeButton({
  trade,
  variant = 'default',
  showOnPages = 'all',
  className,
  onSuccess
}: RaiseDisputeButtonProps) {
  const pathname = usePathname()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Determine if we're on active trades or history page
  const isActivePage = pathname.includes(appRoutes.trades.active)
  const isHistoryPage = pathname.includes(appRoutes.trades.history.base)

  // Check if dispute button should be shown based on page restrictions
  if (showOnPages === 'active' && !isActivePage) return null
  if (showOnPages === 'history' && !isHistoryPage) return null

  // Check if the trade status is disputable based on the current page
  const disputableStatuses = isActivePage
    ? ACTIVE_PAGE_DISPUTABLE_STATUSES
    : isHistoryPage
      ? HISTORY_PAGE_DISPUTABLE_STATUSES
      : [
          ...ACTIVE_PAGE_DISPUTABLE_STATUSES,
          ...HISTORY_PAGE_DISPUTABLE_STATUSES
        ]

  const canDispute =
    disputableStatuses.includes(trade.status as TradeStatus) &&
    trade.status !== 'disputed'

  if (!canDispute) return null

  const handleActionSuccess = () => {
    setDialogOpen(false)
    onSuccess?.()
  }

  // Card variant - shows as a prominent card
  if (variant === 'card') {
    // Only show card variant for completed, cancelled, or refunded trades
    if (!['completed', 'cancelled', 'refunded'].includes(trade.status)) {
      return null
    }

    return (
      <>
        <Card className='border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-yellow-500/10 backdrop-blur-sm'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <div className='relative'>
                  <div className='absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-orange-500 to-amber-600 opacity-75 blur-lg' />
                  <div className='relative rounded-full bg-gradient-to-r from-orange-500 via-amber-600 to-yellow-600 p-3 shadow-xl'>
                    <AlertCircle className='h-6 w-6 text-white' />
                  </div>
                </div>
                <div>
                  <h3 className='text-lg font-bold'>
                    Had an issue with this trade?
                  </h3>
                  <p className='text-muted-foreground text-sm'>
                    {trade.status === 'completed'
                      ? 'You can still raise a dispute if there were problems with this completed transaction'
                      : trade.status === 'cancelled'
                        ? 'Report an issue if this trade was cancelled incorrectly or unfairly'
                        : 'Report an issue if this refund was not handled properly'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setDialogOpen(true)}
                variant='outline'
                className='border-orange-500/50 bg-orange-500/10 font-bold hover:border-orange-500 hover:bg-orange-500/20'
              >
                <AlertCircle className='mr-2 h-5 w-5' />
                Raise Dispute
              </Button>
            </div>
          </CardContent>
        </Card>

        <TradeActionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trade={trade}
          actionType='dispute'
          onSuccess={handleActionSuccess}
        />
      </>
    )
  }

  // Ghost variant - for sidebar/subtle placement
  if (variant === 'ghost') {
    return (
      <>
        <Button
          variant='ghost'
          className={cn(
            'text-muted-foreground w-full justify-start font-bold hover:bg-red-500/10 hover:text-red-500',
            className
          )}
          onClick={() => setDialogOpen(true)}
        >
          <AlertCircle className='mr-2 h-4 w-4' />
          Raise Dispute
        </Button>

        <TradeActionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trade={trade}
          actionType='dispute'
          onSuccess={handleActionSuccess}
        />
      </>
    )
  }

  // Default variant - standard button
  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        variant='outline'
        className={cn(
          'border-red-500/50 bg-red-500/10 font-bold hover:border-red-500 hover:bg-red-500/20',
          className
        )}
      >
        <AlertCircle className='mr-2 h-5 w-5' />
        Raise Dispute
      </Button>

      <TradeActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trade={trade}
        actionType='dispute'
        onSuccess={handleActionSuccess}
      />
    </>
  )
}
