import { apiEndpoints } from '@/config/api-endpoints'
import { serverFetch } from '@/lib/api/server-utils'

import { TradeHistoryTable } from './trade-history-table'

interface TradeHistoryContentProps {
  searchParams: Record<string, string | string[] | undefined>
  userId?: number
}

async function getTradeHistory(
  searchParams: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams()

  // Forward only pagination params to the API
  if (searchParams.page) {
    params.append('page', String(searchParams.page))
  }
  if (searchParams.limit) {
    params.append('limit', String(searchParams.limit))
  }
  if (searchParams.sortBy) {
    params.append('sortBy', String(searchParams.sortBy))
  }
  if (searchParams.sortOrder) {
    params.append('sortOrder', String(searchParams.sortOrder))
  }
  if (searchParams.globalFilter) {
    params.append('globalFilter', String(searchParams.globalFilter))
  }

  return serverFetch(`${apiEndpoints.trades.table}?${params.toString()}`, {
    cache: 'no-store'
  })
}

export async function TradeHistoryContent({
  searchParams,
  userId
}: TradeHistoryContentProps) {
  try {
    const tradesData = await getTradeHistory(searchParams).catch(() => {
      return { data: [], pageCount: 0, totalCount: 0 }
    })

    return (
      <TradeHistoryTable
        data={tradesData.data}
        pageCount={tradesData.pageCount}
        totalCount={tradesData.totalCount}
        userId={userId}
      />
    )
  } catch (_error) {
    return (
      <div className='py-8 text-center'>
        <p className='text-destructive mb-2 text-lg font-semibold'>
          Unable to load trade history
        </p>
        <p className='text-muted-foreground'>
          Please try refreshing the page or contact support if the issue
          persists.
        </p>
      </div>
    )
  }
}
