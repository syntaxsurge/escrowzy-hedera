import { Suspense } from 'react'

import { Loader2 } from 'lucide-react'

import { ActivityFilterDropdown } from '@/components/blocks/activity-filter-dropdown'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { getActivityLogsWithPagination } from '@/lib/db/queries/admin-activity'
import { parseTableQueryParams } from '@/lib/table/table'

import { ActivityLogsTable } from './activity-logs-table'

interface AdminActivityPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminActivityPage({
  searchParams
}: AdminActivityPageProps) {
  const params = await searchParams
  const tableRequest = parseTableQueryParams(params)
  const response = await getActivityLogsWithPagination(tableRequest)

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            View all platform activity and user actions
          </CardDescription>
          <div className='pt-4'>
            <ActivityFilterDropdown />
          </div>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className='flex justify-center py-8'>
                <Loader2 className='h-8 w-8 animate-spin' />
              </div>
            }
          >
            <ActivityLogsTable
              data={response.data}
              pageCount={response.pageCount}
              totalCount={response.totalCount}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
