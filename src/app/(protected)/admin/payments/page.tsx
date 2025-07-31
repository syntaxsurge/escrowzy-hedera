import { Suspense } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

import { AdminPaymentHistoryTable } from './payment-history-table'

interface AdminPaymentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminPaymentsPage({
  searchParams
}: AdminPaymentsPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Payment History</h1>
        <p className='text-muted-foreground mt-2'>
          View all platform payment transactions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>
            Track all subscription payments across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className='animate-pulse'>
                <div className='bg-muted mb-4 h-10 w-full rounded' />
                <div className='bg-muted h-96 w-full rounded' />
              </div>
            }
          >
            <AdminPaymentHistoryTable searchParams={resolvedSearchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
