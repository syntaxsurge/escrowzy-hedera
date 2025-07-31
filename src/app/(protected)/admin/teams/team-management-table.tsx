'use client'

import { Users, Settings, UserCog } from 'lucide-react'

import { ServerSideTable } from '@/components/blocks/table/server-side-table'
import { UserCell } from '@/components/blocks/table/user-cell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { appRoutes } from '@/config/app-routes'
import type { TeamWithOwner } from '@/lib/db/queries/admin-teams'
import {
  createPlanColumnConfig,
  createDateColumnConfig,
  createBadgeColumnConfig,
  type ColumnConfig
} from '@/lib/table/table-columns-config'

interface TeamManagementTableProps {
  data: TeamWithOwner[]
  pageCount: number
  totalCount: number
}

export function TeamManagementTable({
  data,
  pageCount,
  totalCount
}: TeamManagementTableProps) {
  const columnConfigs: ColumnConfig[] = [
    {
      id: 'teamName',
      header: 'Team Name',
      type: 'custom' as const
    },
    {
      id: 'owner',
      header: 'Owner',
      type: 'custom' as const
    },
    createPlanColumnConfig(),
    createBadgeColumnConfig({
      header: 'Members',
      accessorKey: 'memberCount',
      variant: 'secondary'
    }),
    createDateColumnConfig({
      header: 'Created',
      accessorKey: 'createdAt'
    }),
    createDateColumnConfig({
      header: 'Updated',
      accessorKey: 'updatedAt'
    }),
    {
      id: 'actions',
      header: '',
      type: 'actions' as const,
      enableSorting: false
    }
  ]

  const customRenderers: Record<
    string,
    (row: TeamWithOwner) => React.ReactNode
  > = {
    teamName: (team: TeamWithOwner) => (
      <div className='flex items-center gap-2 font-medium'>
        <Users className='text-muted-foreground h-4 w-4' />
        {team.name}
      </div>
    ),
    owner: (team: TeamWithOwner) => (
      <UserCell
        name={team.ownerName}
        email={team.ownerEmail}
        walletAddress={team.ownerWallet}
      />
    ),
    actions: (team: TeamWithOwner) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='h-8 w-8'>
            <Settings className='h-4 w-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem asChild>
            <a href={appRoutes.admin.teamMembers(String(team.id))}>
              <UserCog className='mr-2 h-4 w-4' />
              Manage Members
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <ServerSideTable
      data={data}
      columnConfigs={columnConfigs}
      customRenderers={customRenderers}
      pageCount={pageCount}
      totalCount={totalCount}
      showGlobalFilter={true}
    />
  )
}
