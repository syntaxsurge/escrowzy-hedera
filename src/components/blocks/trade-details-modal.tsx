'use client'

import { useRouter } from 'next/navigation'

import { format } from 'date-fns'
import {
  AlertCircle,
  ChevronRight,
  Clock,
  DollarSign,
  Shield,
  User
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { appRoutes } from '@/config/app-routes'
import { getUserDisplayName } from '@/lib/utils/user'
import type { TradeWithUsers } from '@/types/trade'

interface TradeDetailsModalProps {
  trade: TradeWithUsers | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId?: number
}

export function TradeDetailsModal({
  trade,
  open,
  onOpenChange,
  currentUserId
}: TradeDetailsModalProps) {
  const router = useRouter()

  if (!trade) return null

  const isBuyer = currentUserId === trade.buyerId
  const userRole = isBuyer ? 'Buyer' : 'Seller'
  const _otherParty = isBuyer ? trade.seller : trade.buyer

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'cancelled':
      case 'refunded':
      case 'deposit_timeout':
        return 'secondary'
      case 'disputed':
        return 'destructive'
      case 'funded':
      case 'payment_sent':
      case 'payment_confirmed':
        return 'warning'
      default:
        return 'default'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center justify-between'>
            <span>Trade #{trade.id}</span>
            <Badge variant={getStatusColor(trade.status) as any}>
              {trade.status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </DialogTitle>
          <DialogDescription>View and manage trade details</DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Trade Overview */}
          <div className='space-y-4'>
            <h3 className='flex items-center gap-2 text-sm font-medium'>
              <DollarSign className='h-4 w-4' />
              Trade Overview
            </h3>
            <div className='grid gap-3 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Amount:</span>
                <span className='font-medium'>
                  {trade.amount} {trade.currency}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Your Role:</span>
                <Badge variant='outline'>{userRole}</Badge>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Trade Type:</span>
                <span className='font-medium capitalize'>
                  {trade.listingCategory}
                </span>
              </div>
              {trade.metadata?.escrowContractAddress && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    Escrow Contract:
                  </span>
                  <span className='font-mono text-xs'>
                    {trade.metadata.escrowContractAddress.slice(0, 6)}...
                    {trade.metadata.escrowContractAddress.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Participants */}
          <div className='space-y-4'>
            <h3 className='flex items-center gap-2 text-sm font-medium'>
              <User className='h-4 w-4' />
              Participants
            </h3>
            <div className='grid gap-3 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Buyer:</span>
                <span className='font-medium'>
                  {getUserDisplayName(trade.buyer)}
                  {isBuyer && ' (You)'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Seller:</span>
                <span className='font-medium'>
                  {getUserDisplayName(trade.seller)}
                  {!isBuyer && ' (You)'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div className='space-y-4'>
            <h3 className='flex items-center gap-2 text-sm font-medium'>
              <Clock className='h-4 w-4' />
              Timeline
            </h3>
            <div className='grid gap-3 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Created:</span>
                <span className='font-medium'>
                  {format(new Date(trade.createdAt), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
              {trade.metadata?.fundedAt && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Funded:</span>
                  <span className='font-medium'>
                    {format(
                      new Date(trade.metadata.fundedAt),
                      'MMM dd, yyyy HH:mm'
                    )}
                  </span>
                </div>
              )}
              {trade.metadata?.deliveredAt && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Delivered:</span>
                  <span className='font-medium'>
                    {format(
                      new Date(trade.metadata.deliveredAt),
                      'MMM dd, yyyy HH:mm'
                    )}
                  </span>
                </div>
              )}
              {trade.metadata?.completedAt && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Completed:</span>
                  <span className='font-medium'>
                    {format(
                      new Date(trade.metadata.completedAt),
                      'MMM dd, yyyy HH:mm'
                    )}
                  </span>
                </div>
              )}
              {trade.metadata?.disputedAt && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Disputed:</span>
                  <span className='font-medium'>
                    {format(
                      new Date(trade.metadata.disputedAt),
                      'MMM dd, yyyy HH:mm'
                    )}
                  </span>
                </div>
              )}
              {trade.completedAt && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Last Updated:</span>
                  <span className='font-medium'>
                    {format(new Date(trade.completedAt), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dispute Information */}
          {trade.status === 'disputed' && trade.metadata?.disputeReason && (
            <>
              <Separator />
              <div className='space-y-4'>
                <h3 className='text-destructive flex items-center gap-2 text-sm font-medium'>
                  <Shield className='h-4 w-4' />
                  Dispute Information
                </h3>
                <div className='bg-destructive/10 rounded-lg p-3'>
                  <p className='text-sm'>{trade.metadata.disputeReason}</p>
                </div>
              </div>
            </>
          )}

          {/* Security Notice */}
          {trade.status === 'disputed' && (
            <>
              <Separator />
              <div className='flex items-start gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20'>
                <AlertCircle className='mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400' />
                <div className='text-sm text-yellow-900 dark:text-yellow-200'>
                  <p className='font-medium'>Security Notice</p>
                  <p className='mt-1'>
                    All messages and files shared in the chat will be used as
                    evidence for dispute resolution.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className='flex justify-end gap-2'>
            <Button
              variant='outline'
              onClick={() =>
                router.push(
                  appRoutes.trades.history.detail(trade.id.toString())
                )
              }
            >
              View Full Details
              <ChevronRight className='ml-1 h-4 w-4' />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
