import { Suspense } from 'react'

import { Loader2 } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { getTeamsWithPagination } from '@/lib/db/queries/admin-teams'
import { parseTableQueryParams } from '@/lib/table/table'

import { TeamManagementTable } from './team-management-table'

interface AdminTeamsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminTeamsPage({
  searchParams
}: AdminTeamsPageProps) {
  const params = await searchParams
  const searchParamsObj = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value && typeof value === 'string') {
      searchParamsObj.set(key, value)
    }
  })

  const tableRequest = parseTableQueryParams(searchParamsObj)
  const response = await getTeamsWithPagination(tableRequest)

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            View and manage all teams on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className='flex justify-center py-8'>
                <Loader2 className='h-8 w-8 animate-spin' />
              </div>
            }
          >
            <TeamManagementTable
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
