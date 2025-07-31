'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink
} from 'lucide-react'

import { ServerSideTable } from '@/components/blocks/table/server-side-table'
import { navigationProgress } from '@/components/providers/navigation-progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { appRoutes } from '@/config/app-routes'
import { cn } from '@/lib'
import {
  createDateColumnConfig,
  type ColumnConfig
} from '@/lib/table/table-columns-config'
import { formatCurrency } from '@/lib/utils/string'
import { TRADE_STATUS, type TradeStatus } from '@/types/listings'
import type { TradeWithUsers } from '@/types/trade'

interface TradeHistoryTableProps {
  data: TradeWithUsers[]
  pageCount: number
  totalCount: number
  userId?: number
}

// Define pending statuses
const pendingStatuses: TradeStatus[] = [
  TRADE_STATUS.CREATED,
  TRADE_STATUS.AWAITING_DEPOSIT,
  TRADE_STATUS.FUNDED,
  TRADE_STATUS.PAYMENT_SENT,
  TRADE_STATUS.PAYMENT_CONFIRMED,
  TRADE_STATUS.DELIVERED,
  TRADE_STATUS.CONFIRMED
]

function getStatusBadge(status: string) {
  // Check if it's a pending status
  if (pendingStatuses.includes(status as TradeStatus)) {
    const pendingLabel = status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    return (
      <Badge className='border-0 bg-orange-500/20 text-orange-600 dark:text-orange-400'>
        <Clock className='mr-1 h-3 w-3' />
        {pendingLabel}
      </Badge>
    )
  }

  switch (status) {
    case 'completed':
      return (
        <Badge className='border-0 bg-green-500/20 text-green-600 dark:text-green-400'>
          <CheckCircle className='mr-1 h-3 w-3' />
          Completed
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge className='border-0 bg-gray-500/20 text-gray-600 dark:text-gray-400'>
          <XCircle className='mr-1 h-3 w-3' />
          Cancelled
        </Badge>
      )
    case 'disputed':
      return (
        <Badge className='border-0 bg-red-500/20 text-red-600 dark:text-red-400'>
          <AlertCircle className='mr-1 h-3 w-3' />
          Disputed
        </Badge>
      )
    case 'refunded':
      return (
        <Badge className='border-0 bg-blue-500/20 text-blue-600 dark:text-blue-400'>
          <Clock className='mr-1 h-3 w-3' />
          Refunded
        </Badge>
      )
    case 'deposit_timeout':
      return (
        <Badge className='border-0 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'>
          <AlertCircle className='mr-1 h-3 w-3' />
          Deposit Timeout
        </Badge>
      )
    default:
      return <Badge variant='outline'>{status}</Badge>
  }
}

export function TradeHistoryTable({
  data,
  pageCount,
  totalCount,
  userId
}: TradeHistoryTableProps) {
  const router = useRouter()

  const columnConfigs: ColumnConfig[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Trade ID',
        type: 'custom',
        enableSorting: true
      },
      {
        accessorKey: 'listingCategory',
        header: 'Category',
        type: 'custom',
        enableSorting: true
      },
      {
        accessorKey: 'buyerId',
        header: 'Listing Type',
        type: 'custom',
        enableSorting: true
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        type: 'custom',
        enableSorting: true
      },
      {
        accessorKey: 'status',
        header: 'Status',
        type: 'custom',
        enableSorting: true
      },
      createDateColumnConfig({
        header: 'Date',
        accessorKey: 'createdAt'
      }),
      {
        id: 'action',
        header: 'Action',
        type: 'custom',
        enableSorting: false
      }
    ],
    []
  )

  const customRenderers = useMemo(
    () => ({
      id: (trade: TradeWithUsers) => (
        <span className='font-mono text-sm'>
          #{trade.id.toString().slice(0, 8)}
        </span>
      ),
      listingCategory: (trade: TradeWithUsers) => {
        // Display the listing category (P2P or Domain)
        const category = trade.listingCategory || 'p2p'
        return (
          <Badge
            variant='outline'
            className={cn(
              category === 'domain'
                ? 'border-purple-500/30 text-purple-600 dark:text-purple-400'
                : 'border-gray-500/30 text-gray-600 dark:text-gray-400'
            )}
          >
            {category.toUpperCase()}
          </Badge>
        )
      },
      buyerId: (trade: TradeWithUsers) => {
        const isBuyer = userId === trade.buyerId
        const action = isBuyer ? 'Buy' : 'Sell'
        return (
          <Badge
            variant='outline'
            className={cn(
              isBuyer
                ? 'border-green-500/30 text-green-600 dark:text-green-400'
                : 'border-blue-500/30 text-blue-600 dark:text-blue-400'
            )}
          >
            {action}
          </Badge>
        )
      },
      amount: (trade: TradeWithUsers) =>
        formatCurrency(trade.amount, trade.currency),
      status: (trade: TradeWithUsers) => getStatusBadge(trade.status),
      action: (trade: TradeWithUsers) => (
        <Button
          variant='ghost'
          size='sm'
          className='hover:text-primary flex items-center gap-2'
          onClick={() => {
            navigationProgress.start()
            router.push(appRoutes.trades.history.detail(trade.id.toString()))
          }}
        >
          <span className='text-xs'>View Details</span>
          <ExternalLink className='h-4 w-4' />
        </Button>
      )
    }),
    [router, userId]
  )

  return (
    <Card className='border-primary/20 from-primary/5 border-2 bg-gradient-to-br to-purple-600/5'>
      <CardHeader>
        <CardTitle>Trade History</CardTitle>
        <CardDescription>View all your past trades</CardDescription>
      </CardHeader>
      <CardContent>
        <ServerSideTable
          data={data}
          columnConfigs={columnConfigs}
          customRenderers={customRenderers}
          pageCount={pageCount}
          totalCount={totalCount}
          getRowId={row => row.id.toString()}
          enableRowSelection={false}
          showGlobalFilter={true}
        />
      </CardContent>
    </Card>
  )
}
