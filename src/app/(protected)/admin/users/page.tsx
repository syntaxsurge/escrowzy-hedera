import { Suspense } from 'react'

import { Loader2 } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { getUsersWithPagination } from '@/lib/db/queries/admin-users'
import { parseTableQueryParams } from '@/lib/table/table'

import { UserManagementTable } from './user-management-table'

interface AdminUsersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminUsersPage({
  searchParams
}: AdminUsersPageProps) {
  const params = await searchParams
  const searchParamsObj = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value && typeof value === 'string') {
      searchParamsObj.set(key, value)
    }
  })

  const tableRequest = parseTableQueryParams(searchParamsObj)
  const response = await getUsersWithPagination(tableRequest)

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage all registered users, their subscriptions, and permissions
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
            <UserManagementTable
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
