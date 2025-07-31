'use client'

import { ServerSideTable } from '@/components/blocks/table/server-side-table'
import { UserCell } from '@/components/blocks/table/user-cell'
import { cn } from '@/lib'
import { type AdminActivityLogWithUser } from '@/lib/db/queries/admin-activity'
import { ActivityType } from '@/lib/db/schema'
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
import { type ActivityLogWithUser } from '@/types/database'

type ActivityLogData = ActivityLogWithUser | AdminActivityLogWithUser

interface ActivityTableProps {
  data: ActivityLogData[]
  pageCount: number
  totalCount: number
  showUserColumn?: boolean
  showTeamColumn?: boolean
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  showGlobalFilter?: boolean
  emptyMessage?: string
  pageSizeOptions?: number[]
  enableRowSelection?: boolean
  renderActions?: (row: ActivityLogData) => React.ReactNode
  onSelectionChange?: (selectedRows: Record<string, boolean>) => void
  isLoading?: boolean
}

export function ActivityLogsTable({
  data,
  pageCount,
  totalCount,
  showUserColumn = false,
  showTeamColumn = false,
  globalFilter: _globalFilter,
  onGlobalFilterChange: _onGlobalFilterChange,
  showGlobalFilter = true,
  emptyMessage: _emptyMessage = 'No activity logs found.',
  pageSizeOptions = [10, 20, 50, 100],
  enableRowSelection = false,
  renderActions,
  onSelectionChange,
  isLoading: _isLoading = false
}: ActivityTableProps) {
  const columnConfigs: ColumnConfig[] = [
    ...(enableRowSelection ? [createSelectColumnConfig()] : []),
    createDateColumnConfig({
      header: 'Time',
      accessorKey: 'timestamp'
    }),
    ...(showUserColumn
      ? [
          {
            id: 'user',
            header: 'User',
            type: 'custom' as const
          }
        ]
      : []),
    {
      id: 'activity',
      header: 'Activity',
      type: 'custom' as const
    },
    ...(showTeamColumn
      ? [
          {
            id: 'team',
            header: 'Team',
            type: 'custom' as const
          }
        ]
      : []),
    {
      id: 'ipAddress',
      header: 'IP Address',
      type: 'custom' as const,
      enableSorting: false
    },
    ...(renderActions
      ? [
          {
            id: 'actions',
            header: 'Actions',
            type: 'custom' as const
          }
        ]
      : [])
  ]

  const customRenderers: Record<
    string,
    (row: ActivityLogData) => React.ReactNode
  > = {
    user: (row: ActivityLogData) => {
      // Check if it's admin activity log format
      if ('userName' in row) {
        return (
          <UserCell
            name={row.userName || 'Unknown'}
            email={row.userEmail}
            walletAddress={row.userAddress}
          />
        )
      }
      // Otherwise it's user activity log format
      return (
        <UserCell
          name={row.user?.name || 'Unknown'}
          email={row.user?.email}
          walletAddress={row.user?.walletAddress}
        />
      )
    },
    activity: (row: ActivityLogData) => {
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
    team: (row: ActivityLogData) => {
      const teamName = 'teamName' in row ? row.teamName : null
      return teamName ? (
        <span className='text-sm'>{teamName}</span>
      ) : (
        <span className='text-muted-foreground'>-</span>
      )
    },
    ipAddress: (row: ActivityLogData) => {
      const ip = row.ipAddress
      return ip ? (
        <code className='bg-muted rounded px-2 py-1 text-xs'>{ip}</code>
      ) : (
        <span className='text-muted-foreground'>—</span>
      )
    },
    actions: (row: ActivityLogData) => renderActions?.(row) || null
  }

  return (
    <ServerSideTable
      data={data}
      columnConfigs={columnConfigs}
      customRenderers={customRenderers}
      pageCount={pageCount}
      totalCount={totalCount}
      pageSizeOptions={pageSizeOptions}
      getRowId={row => String(row.id)}
      enableRowSelection={enableRowSelection}
      showGlobalFilter={showGlobalFilter}
      onRowSelectionChange={onSelectionChange}
    />
  )
}
