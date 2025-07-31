'use client'

import { useRouter } from 'next/navigation'

import { Trash2 } from 'lucide-react'

import { ServerSideTable } from '@/components/blocks/table/server-side-table'
import { UserCell } from '@/components/blocks/table/user-cell'
import { Button } from '@/components/ui/button'
import { apiEndpoints } from '@/config/api-endpoints'
import { useTableSelection } from '@/hooks/use-table-selection'
import { cn } from '@/lib'
import type { AdminActivityLogWithUser } from '@/lib/db/queries/admin-activity'
import { ActivityType } from '@/lib/db/schema'
import { useBulkDelete } from '@/lib/table/bulk-actions'
import {
  createSelectColumnConfig,
  createDateColumnConfig,
  type ColumnConfig
} from '@/lib/table/table-columns-config'
import {
  ACTIVITY_COLORS,
  formatActivityType,
  getActivityIcon
} from '@/types/activity-log'

interface ActivityLogsTableProps {
  data: AdminActivityLogWithUser[]
  pageCount: number
  totalCount: number
}

export function ActivityLogsTable({
  data,
  pageCount,
  totalCount
}: ActivityLogsTableProps) {
  const router = useRouter()
  const { selectedRows, setSelectedRows } = useTableSelection()

  const { handleBulkDelete, isDeleting } = useBulkDelete({
    endpoint: apiEndpoints.admin.activityLogs,
    itemName: 'activity log',
    onSuccess: () => {
      setSelectedRows({})
      router.refresh()
    }
  })

  const handleDeleteSelected = async () => {
    const selectedRowIds = Object.keys(selectedRows).map(Number)
    await handleBulkDelete(selectedRowIds)
  }

  const selectedCount = Object.keys(selectedRows).length

  const columnConfigs: ColumnConfig[] = [
    createSelectColumnConfig(),
    createDateColumnConfig({
      header: 'Time',
      accessorKey: 'timestamp'
    }),
    {
      id: 'user',
      header: 'User',
      type: 'custom' as const
    },
    {
      id: 'activity',
      header: 'Activity',
      type: 'custom' as const
    },
    {
      id: 'team',
      header: 'Team',
      type: 'custom' as const
    },
    {
      id: 'ipAddress',
      header: 'IP Address',
      type: 'custom' as const,
      enableSorting: false
    }
  ]

  const customRenderers: Record<
    string,
    (row: AdminActivityLogWithUser) => React.ReactNode
  > = {
    user: (row: AdminActivityLogWithUser) => (
      <UserCell
        name={row.userName || 'Unknown'}
        email={row.userEmail}
        walletAddress={row.userAddress}
      />
    ),
    activity: (row: AdminActivityLogWithUser) => {
      const Icon = getActivityIcon(row.action as ActivityType)
      const colorClass =
        ACTIVITY_COLORS[row.action as ActivityType] ||
        'text-gray-600 bg-gray-50 dark:bg-gray-900/30'

      return (
        <div className='flex items-center gap-3'>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              colorClass.split(' ').slice(1).join(' ')
            )}
          >
            <Icon className={cn('h-5 w-5', colorClass.split(' ')[0])} />
          </div>
          <div>
            <p className='font-medium'>
              {formatActivityType(row.action as ActivityType)}
            </p>
          </div>
        </div>
      )
    },
    team: (row: AdminActivityLogWithUser) => {
      return row.teamName ? (
        <span className='text-sm'>{row.teamName}</span>
      ) : (
        <span className='text-muted-foreground'>-</span>
      )
    },
    ipAddress: (row: AdminActivityLogWithUser) => {
      const ip = row.ipAddress
      return ip ? (
        <code className='bg-muted rounded px-2 py-1 text-xs'>{ip}</code>
      ) : (
        <span className='text-muted-foreground'>—</span>
      )
    }
  }

  const renderHeader = () => (
    <div className='flex items-center justify-between gap-4'>
      <div className='flex-1' />
      {selectedCount > 0 && (
        <Button
          variant='destructive'
          size='sm'
          onClick={handleDeleteSelected}
          disabled={isDeleting}
        >
          <Trash2 className='mr-2 h-4 w-4' />
          Delete Selected ({selectedCount})
        </Button>
      )}
    </div>
  )

  return (
    <div className='space-y-4'>
      <ServerSideTable
        data={data}
        columnConfigs={columnConfigs}
        customRenderers={customRenderers}
        pageCount={pageCount}
        totalCount={totalCount}
        pageSizeOptions={[20, 50, 100]}
        getRowId={row => String(row.id)}
        enableRowSelection={true}
        showGlobalFilter={true}
        rowSelection={selectedRows}
        onRowSelectionChange={setSelectedRows}
        renderHeader={renderHeader}
      />
    </div>
  )
}
