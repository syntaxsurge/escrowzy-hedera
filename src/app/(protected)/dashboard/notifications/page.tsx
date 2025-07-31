import { Suspense } from 'react'

import { TableSkeleton } from '@/components/blocks/table/table-skeleton'
import { ModernLayout, ModernSection } from '@/components/layout/modern-layout'
import { apiEndpoints } from '@/config/api-endpoints'
import { serverFetch } from '@/lib/api/server-utils'

import { NotificationsTable } from './notifications-table'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function getNotifications(
  searchParams: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams()

  // Forward all search params to the API
  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (value) {
      params.append(key, String(value))
    }
  })

  return serverFetch(
    `${apiEndpoints.notifications.table}?${params.toString()}`,
    {
      cache: 'no-store'
    }
  )
}

async function NotificationsContent({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  try {
    const notificationsData = await getNotifications(searchParams).catch(
      _error => {
        return { data: [], pageCount: 0, totalCount: 0 }
      }
    )

    return (
      <ModernSection
        title='All Notifications'
        description='View all your notifications in one place'
      >
        <NotificationsTable
          data={notificationsData.data}
          pageCount={notificationsData.pageCount}
          totalCount={notificationsData.totalCount}
        />
      </ModernSection>
    )
  } catch (_error) {
    return (
      <ModernSection>
        <div className='py-8 text-center'>
          <p className='text-destructive mb-2 text-lg font-semibold'>
            Unable to load notifications
          </p>
          <p className='text-muted-foreground'>
            Please try refreshing the page or contact support if the issue
            persists.
          </p>
        </div>
      </ModernSection>
    )
  }
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <ModernLayout
      title='Notifications'
      description='Manage your notifications and stay updated with important alerts'
    >
      <Suspense
        fallback={<TableSkeleton variant='simple' showSection={false} />}
      >
        <NotificationsContent searchParams={resolvedSearchParams} />
      </Suspense>
    </ModernLayout>
  )
}
