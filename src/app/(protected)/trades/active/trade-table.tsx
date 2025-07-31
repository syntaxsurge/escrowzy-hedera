'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { MessageSquare, MoreVertical } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { appRoutes } from '@/config/app-routes'
import { useSession } from '@/hooks/use-session'
import { formatCurrency, formatRelativeTime } from '@/lib/utils/string'
import { getUserDisplayName } from '@/lib/utils/user'
import type { TradeWithUsers } from '@/types/trade'
import { TRADE_STATUS } from '@/types/trade'

import { TradeActionDialog } from './trade-action-dialog'

interface TradeTableProps {
  trades: TradeWithUsers[]
  onUpdate?: () => void
}

export function TradeTable({ trades, onUpdate }: TradeTableProps) {
  const router = useRouter()
  const { user } = useSession()
  const [selectedTrade, setSelectedTrade] = useState<TradeWithUsers | null>(
    null
  )
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<
    'fund' | 'confirm' | 'dispute' | 'payment_sent' | null
  >(null)

  const handleAction = (
    trade: TradeWithUsers,
    action: 'fund' | 'confirm' | 'dispute' | 'payment_sent'
  ) => {
    setSelectedTrade(trade)
    setActionType(action)
    setActionDialogOpen(true)
  }

  const handleActionSuccess = () => {
    setActionDialogOpen(false)
    setSelectedTrade(null)
    setActionType(null)
    if (onUpdate) onUpdate()
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'created':
        return 'outline'
      case 'funded':
        return 'warning'
      case 'delivered':
        return 'secondary'
      case 'completed':
        return 'success'
      case 'disputed':
        return 'destructive'
      case 'refunded':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Trade ID</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Counterparty</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map(trade => {
            const isBuyer = user?.id === trade.buyerId
            const otherParty = isBuyer ? trade.seller : trade.buyer
            const userRole = isBuyer ? 'Buyer' : 'Seller'

            return (
              <TableRow key={trade.id}>
                <TableCell className='font-mono'>#{trade.id}</TableCell>
                <TableCell>
                  <Badge variant='outline'>{userRole}</Badge>
                </TableCell>
                <TableCell>{getUserDisplayName(otherParty)}</TableCell>
                <TableCell>
                  {formatCurrency(trade.amount, trade.currency)}
                </TableCell>
                <TableCell>{trade.listingCategory}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(trade.status)}>
                    {TRADE_STATUS[trade.status]}
                  </Badge>
                </TableCell>
                <TableCell>{formatRelativeTime(trade.createdAt)}</TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-2'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() =>
                        router.push(appRoutes.chat.trades(trade.id.toString()))
                      }
                    >
                      <MessageSquare className='h-4 w-4' />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon'>
                          <MoreVertical className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {trade.status === 'created' && isBuyer && (
                          <DropdownMenuItem
                            onClick={() => handleAction(trade, 'fund')}
                          >
                            Fund Escrow
                          </DropdownMenuItem>
                        )}
                        {trade.status === 'funded' &&
                          ((trade.listingCategory === 'domain' && !isBuyer) ||
                            (trade.listingCategory !== 'domain' &&
                              isBuyer)) && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleAction(trade, 'payment_sent')
                              }
                            >
                              {trade.listingCategory === 'domain'
                                ? 'Mark Domain Transferred'
                                : 'Mark Payment Sent'}
                            </DropdownMenuItem>
                          )}
                        {trade.status === 'payment_sent' &&
                          ((trade.listingCategory === 'domain' && isBuyer) ||
                            (trade.listingCategory !== 'domain' &&
                              !isBuyer)) && (
                            <DropdownMenuItem
                              onClick={() => handleAction(trade, 'confirm')}
                            >
                              {trade.listingCategory === 'domain'
                                ? 'Confirm Domain Receipt'
                                : 'Confirm Payment Receipt'}
                            </DropdownMenuItem>
                          )}
                        {trade.status === 'delivered' && isBuyer && (
                          <DropdownMenuItem
                            onClick={() => handleAction(trade, 'confirm')}
                          >
                            Confirm Receipt
                          </DropdownMenuItem>
                        )}
                        {['funded', 'delivered', 'payment_sent'].includes(
                          trade.status
                        ) && (
                          <DropdownMenuItem
                            onClick={() => handleAction(trade, 'dispute')}
                            className='text-destructive'
                          >
                            Raise Dispute
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              appRoutes.trades.history.detail(
                                trade.id.toString()
                              )
                            )
                          }
                        >
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Action Dialog */}
      {selectedTrade && actionType && (
        <TradeActionDialog
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          trade={selectedTrade}
          actionType={actionType}
          onSuccess={handleActionSuccess}
        />
      )}
    </>
  )
}
