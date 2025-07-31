import { ServerSideTable } from '@/components/blocks/table/server-side-table'
import { getAdminPaymentHistory } from '@/lib/db/queries/payment-history'
import { parseTableQueryParams } from '@/lib/table/table'
import {
  createBadgeColumnConfig,
  createAmountColumnConfig,
  createDateColumnConfig,
  createHashColumnConfig,
  createPaymentStatusColumnConfig,
  createUserColumnConfig,
  type ColumnConfig
} from '@/lib/table/table-columns-config'
import { getUser } from '@/services/user'

interface AdminPaymentHistoryTableProps {
  searchParams: Record<string, string | string[] | undefined>
}

export async function AdminPaymentHistoryTable({
  searchParams
}: AdminPaymentHistoryTableProps) {
  const user = await getUser()
  if (!user) return null

  const request = parseTableQueryParams(searchParams)
  const { data, pageCount, totalCount } = await getAdminPaymentHistory(request)

  const columnConfigs: ColumnConfig[] = [
    createDateColumnConfig({
      header: 'Date',
      accessorKey: 'createdAt',
      format: 'date'
    }),
    createBadgeColumnConfig({
      header: 'Plan',
      accessorKey: 'planId',
      formatValue: 'formatPlanName'
    }),
    createAmountColumnConfig(),
    {
      accessorKey: 'chainId',
      header: 'Network',
      type: 'custom',
      enableSorting: true,
      enableColumnFilter: true
    },
    createHashColumnConfig({
      accessorKey: 'transactionHash'
    }),
    createPaymentStatusColumnConfig(),
    createUserColumnConfig({
      header: 'User',
      accessorKey: 'user'
    })
  ]

  return (
    <ServerSideTable
      data={data}
      columnConfigs={columnConfigs}
      pageCount={pageCount}
      totalCount={totalCount}
    />
  )
}
