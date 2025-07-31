'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

import { ServerSideTable } from '@/components/blocks/table/server-side-table'
import { cn } from '@/lib'
import {
  createDateColumnConfig,
  createBadgeColumnConfig,
  type ColumnConfig
} from '@/lib/table/table-columns-config'

interface Notification {
  id: string
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl: string | null
  teamName: string | null
}

interface NotificationsTableProps {
  data: Notification[]
  pageCount: number
  totalCount: number
}

export function NotificationsTable({
  data,
  pageCount,
  totalCount
}: NotificationsTableProps) {
  const router = useRouter()

  const columnConfigs: ColumnConfig[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        type: 'custom',
        enableSorting: true
      },
      {
        accessorKey: 'message',
        header: 'Message',
        type: 'custom',
        enableSorting: false
      },
      createBadgeColumnConfig({
        header: 'Team',
        accessorKey: 'teamName',
        variant: 'secondary'
      }),
      createDateColumnConfig({
        header: 'Time',
        accessorKey: 'timestamp'
      })
    ],
    []
  )

  const customRenderers = useMemo(
    () => ({
      title: (notification: Notification) => {
        const handleClick = () => {
          if (notification.actionUrl) {
            router.push(notification.actionUrl)
          }
        }

        return (
          <div
            className={cn(
              'flex items-center gap-2',
              notification.actionUrl && 'cursor-pointer hover:underline'
            )}
            onClick={notification.actionUrl ? handleClick : undefined}
          >
            {!notification.read && (
              <div className='h-2 w-2 rounded-full bg-blue-500' />
            )}
            <span className={cn(!notification.read && 'font-semibold')}>
              {notification.title}
            </span>
          </div>
        )
      },
      message: (notification: Notification) => {
        return (
          <span
            className={cn('line-clamp-2', !notification.read && 'font-medium')}
          >
            {notification.message}
          </span>
        )
      }
    }),
    [router]
  )

  return (
    <ServerSideTable
      data={data}
      columnConfigs={columnConfigs}
      customRenderers={customRenderers}
      pageCount={pageCount}
      totalCount={totalCount}
      getRowId={row => row.id}
      enableRowSelection={false}
      showGlobalFilter={true}
    />
  )
}
