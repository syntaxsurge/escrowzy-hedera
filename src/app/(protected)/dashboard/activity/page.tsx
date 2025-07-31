import { Suspense } from 'react'

import { Activity, Clock, TrendingUp } from 'lucide-react'

import { ActivityFilterDropdown } from '@/components/blocks/activity-filter-dropdown'
import { TableSkeleton } from '@/components/blocks/table/table-skeleton'
import {
  ModernLayout,
  ModernSection,
  ModernGrid
} from '@/components/layout/modern-layout'
import {
  getActivityLogs,
  getActivityStats
} from '@/lib/db/queries/activity-logs'
import { parseTableQueryParams } from '@/lib/table/table'
import { getUser } from '@/services/user'

import { ActivityLogsTable } from './activity-logs-table'

interface ActivityPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function ActivityStats() {
  const user = await getUser()
  const stats = await getActivityStats(user?.id)

  const _weeklyChange =
    stats.week > 0 && stats.total > 7
      ? Math.round(
          ((stats.week - (stats.total - stats.week)) /
            (stats.total - stats.week)) *
            100
        )
      : stats.week > 0
        ? 100
        : 0

  return (
    <ModernGrid columns={3}>
      <ModernSection variant='gradient'>
        <div className='flex items-center space-x-4'>
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'>
            <Activity className='h-6 w-6' />
          </div>
          <div>
            <p className='text-foreground text-2xl font-bold'>{stats.total}</p>
            <p className='text-muted-foreground text-sm'>Total Actions</p>
          </div>
        </div>
      </ModernSection>

      <ModernSection variant='gradient'>
        <div className='flex items-center space-x-4'>
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg'>
            <TrendingUp className='h-6 w-6' />
          </div>
          <div>
            <p className='text-foreground text-2xl font-bold'>{stats.week}</p>
            <p className='text-muted-foreground text-sm'>This Week</p>
          </div>
        </div>
      </ModernSection>

      <ModernSection variant='gradient'>
        <div className='flex items-center space-x-4'>
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg'>
            <Clock className='h-6 w-6' />
          </div>
          <div>
            <p className='text-foreground text-2xl font-bold'>{stats.today}</p>
            <p className='text-muted-foreground text-sm'>Today</p>
          </div>
        </div>
      </ModernSection>
    </ModernGrid>
  )
}

async function ActivityTable({ searchParams }: ActivityPageProps) {
  const user = await getUser()
  const resolvedSearchParams = await searchParams
  const request = parseTableQueryParams(resolvedSearchParams)
  const { data, pageCount, totalCount } = await getActivityLogs(
    request,
    user?.id
  )

  return (
    <ModernSection>
      <div className='space-y-4'>
        <div className='flex items-center justify-end'>
          <ActivityFilterDropdown />
        </div>

        <ActivityLogsTable
          data={data}
          pageCount={pageCount}
          totalCount={totalCount}
          showUserColumn={false}
          showTeamColumn={false}
          showGlobalFilter={true}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </div>
    </ModernSection>
  )
}

export default async function ActivityPage({
  searchParams
}: ActivityPageProps) {
  return (
    <ModernLayout
      title='Activity Log'
      description='Monitor your account activity and security events'
    >
      <Suspense
        fallback={
          <ModernGrid columns={3}>
            {[...Array(3)].map((_, i) => (
              <ModernSection key={i} variant='gradient'>
                <div className='animate-pulse'>
                  <div className='bg-muted h-12 w-24 rounded' />
                  <div className='bg-muted mt-2 h-4 w-32 rounded' />
                </div>
              </ModernSection>
            ))}
          </ModernGrid>
        }
      >
        <ActivityStats />
      </Suspense>

      <Suspense fallback={<TableSkeleton rows={10} />}>
        <ActivityTable searchParams={searchParams} />
      </Suspense>
    </ModernLayout>
  )
}
