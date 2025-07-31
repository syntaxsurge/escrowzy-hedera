import { Suspense } from 'react'

import { Loader2 } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { getDisputesWithPagination } from '@/lib/db/queries/admin-disputes'
import { parseTableQueryParams } from '@/lib/table/table'

import { DisputesTable } from './disputes-table'

interface AdminDisputesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminDisputesPage({
  searchParams
}: AdminDisputesPageProps) {
  const params = await searchParams
  const searchParamsObj = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value && typeof value === 'string') {
      searchParamsObj.set(key, value)
    }
  })

  const tableRequest = parseTableQueryParams(searchParamsObj)
  const response = await getDisputesWithPagination(tableRequest)

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Dispute Management</CardTitle>
          <CardDescription>
            Review and resolve disputed trades. Examine evidence and make fair
            decisions to resolve conflicts between parties.
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
            <DisputesTable
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
