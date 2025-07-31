import { Suspense } from 'react'

import { Clock, CheckCircle, Trophy, History } from 'lucide-react'

import { TableSkeleton } from '@/components/blocks/table/table-skeleton'
import {
  GamifiedHeader,
  GamifiedStatsCards,
  type StatCard
} from '@/components/blocks/trading'
import { apiEndpoints } from '@/config/api-endpoints'
import { serverFetch } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'

import { TradeHistoryContent } from './trade-history-content'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function TradeHistoryPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const session = await getSession()

  // Get stats data for header
  const statsData = await serverFetch(apiEndpoints.trades.stats, {
    cache: 'no-store'
  }).catch(() => null)

  // Prepare stats cards
  const statsCards: StatCard[] = statsData
    ? [
        {
          title: 'Total Trades',
          value: statsData.totalTrades || 0,
          subtitle: 'All-time trades',
          icon: <History className='h-5 w-5 text-white' />,
          badge: 'HISTORY',
          colorScheme: 'blue'
        },
        {
          title: 'Pending',
          value: statsData.pendingTrades || 0,
          subtitle: 'In progress',
          icon: <Clock className='h-5 w-5 text-white' />,
          badge: 'ACTIVE',
          colorScheme: 'orange'
        },
        {
          title: 'Completed',
          value: statsData.completedTrades || 0,
          subtitle: 'Successfully finished',
          icon: <CheckCircle className='h-5 w-5 text-white' />,
          badge: 'SUCCESS',
          colorScheme: 'green'
        },
        {
          title: 'Success Rate',
          value: `${statsData.successRate || 100}%`,
          subtitle: 'Completion rate',
          icon: <Trophy className='h-5 w-5 text-white' />,
          badge: 'PERFORMANCE',
          colorScheme: 'yellow'
        }
      ]
    : []

  return (
    <div className='from-background via-background to-primary/5 dark:to-primary/10 min-h-screen bg-gradient-to-br'>
      <div className='container mx-auto space-y-8 py-6'>
        {/* Gaming Header */}
        <GamifiedHeader
          title='TRADE HISTORY'
          subtitle='View all your escrow transactions'
          icon={<Clock className='h-8 w-8 text-white' />}
        />

        {/* Gaming Stats Cards */}
        <GamifiedStatsCards cards={statsCards} />

        {/* Trade History Content */}
        <Suspense
          fallback={<TableSkeleton variant='simple' showSection={false} />}
        >
          <TradeHistoryContent
            searchParams={resolvedSearchParams}
            userId={session?.user?.id}
          />
        </Suspense>
      </div>
    </div>
  )
}
