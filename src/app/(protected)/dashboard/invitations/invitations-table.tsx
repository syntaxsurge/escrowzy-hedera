'use client'

import { useMemo } from 'react'

import { ServerSideTable } from '@/components/blocks/table/server-side-table'
import {
  createInvitationStatusColumnConfig,
  createActionsColumnConfig,
  createRoleColumnConfig,
  type ColumnConfig
} from '@/lib/table/table-columns-config'
import { type TeamInvitationWithDetails } from '@/types/database'

import { AcceptRejectButtons } from './accept-reject-buttons'
import { TeamInvitationCell } from './team-invitation-cell'

interface InvitationsTableProps {
  data: TeamInvitationWithDetails[]
  pageCount: number
  totalCount: number
}

export function InvitationsTable({
  data,
  pageCount,
  totalCount
}: InvitationsTableProps) {
  const columnConfigs: ColumnConfig[] = useMemo(
    () => [
      {
        id: 'team',
        header: 'Team',
        type: 'custom',
        enableSorting: true
      },
      createRoleColumnConfig(),
      createInvitationStatusColumnConfig(),
      {
        accessorKey: 'createdAt',
        header: 'Received',
        type: 'date',
        enableSorting: true
      },
      createActionsColumnConfig()
    ],
    []
  )

  const customRenderers = useMemo(
    () => ({
      team: (row: TeamInvitationWithDetails) => (
        <TeamInvitationCell invitation={row} />
      ),
      actions: (row: TeamInvitationWithDetails) => {
        if (row.status !== 'pending') return null
        return <AcceptRejectButtons invitationId={String(row.id)} />
      }
    }),
    []
  )

  return (
    <ServerSideTable
      data={data}
      columnConfigs={columnConfigs}
      customRenderers={customRenderers}
      pageCount={pageCount}
      totalCount={totalCount}
    />
  )
}
