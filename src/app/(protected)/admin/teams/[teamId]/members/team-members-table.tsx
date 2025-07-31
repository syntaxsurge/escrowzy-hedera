'use client'

import { useRouter } from 'next/navigation'

import { UserPlus, Crown, User, Trash2, Settings } from 'lucide-react'

import { ModalDialog } from '@/components/blocks/modal-utils'
import { ServerSideTable } from '@/components/blocks/table/server-side-table'
import { UserCell } from '@/components/blocks/table/user-cell'
import {
  showErrorToast,
  showSuccessToast
} from '@/components/blocks/toast-manager'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { apiEndpoints } from '@/config/api-endpoints'
import { useDialogState } from '@/hooks/use-dialog-state'
import { useLoading } from '@/hooks/use-loading'
import { api } from '@/lib/api/http-client'
import type { TeamMemberTableRow } from '@/lib/db/queries/admin-team-members'
import {
  createRoleColumnConfig,
  createDateColumnConfig,
  type ColumnConfig
} from '@/lib/table/table-columns-config'

import { AddMemberDialog } from './add-member-dialog'

interface TeamMembersTableProps {
  teamId: string
  teamName: string
  data: TeamMemberTableRow[]
  pageCount: number
  totalCount: number
}

export function TeamMembersTable({
  teamId,
  teamName,
  data,
  pageCount,
  totalCount
}: TeamMembersTableProps) {
  const router = useRouter()
  const addMemberDialog = useDialogState()
  const removeDialog = useDialogState<TeamMemberTableRow>()
  const { isLoading, execute } = useLoading()

  const handleRoleChange = async (
    member: TeamMemberTableRow,
    newRole: 'owner' | 'member'
  ) => {
    await execute(async () => {
      const response = await api.put(
        apiEndpoints.admin.teams.memberRole(teamId, member.id.toString()),
        { role: newRole }
      )

      if (!response.success)
        throw new Error(response.error || 'Failed to update role')

      showSuccessToast(`Role updated to ${newRole}`)
      router.refresh()
    }).catch(() => {
      showErrorToast('Failed to update role')
    })
  }

  const handleRemoveMember = async () => {
    const memberToRemove = removeDialog.data
    if (!memberToRemove) return

    await execute(async () => {
      const response = await api.delete(
        apiEndpoints.admin.teams.memberById(
          teamId,
          memberToRemove.id.toString()
        )
      )

      if (!response.success)
        throw new Error(response.error || 'Failed to remove member')

      showSuccessToast('Member removed from team')
      router.refresh()
      removeDialog.close()
    }).catch(() => {
      showErrorToast('Failed to remove member')
    })
  }

  const columnConfigs: ColumnConfig[] = [
    {
      id: 'user',
      header: 'User',
      type: 'custom' as const
    },
    createRoleColumnConfig(),
    createDateColumnConfig({
      header: 'Joined',
      accessorKey: 'joinedAt'
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
    (row: TeamMemberTableRow) => React.ReactNode
  > = {
    user: (member: TeamMemberTableRow) => (
      <UserCell
        name={member.name}
        email={member.email}
        walletAddress={member.walletAddress}
      />
    ),
    actions: (member: TeamMemberTableRow) => {
      const isOwner = member.role === 'owner'

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              disabled={isLoading}
            >
              <Settings className='h-4 w-4' />
              <span className='sr-only'>Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              onClick={() => handleRoleChange(member, 'owner')}
              disabled={isOwner}
            >
              <Crown className='mr-2 h-4 w-4' />
              Make Owner
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleRoleChange(member, 'member')}
              disabled={!isOwner}
            >
              <User className='mr-2 h-4 w-4' />
              Make Member
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                removeDialog.open(member)
              }}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Remove Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }

  const renderHeader = () => (
    <div className='flex items-center justify-between gap-4'>
      <div className='flex-1' />
      <div className='flex items-center gap-2'>
        <p className='text-muted-foreground text-sm'>
          Total: {totalCount} members
        </p>
        <Button onClick={() => addMemberDialog.open()}>
          <UserPlus className='mr-2 h-4 w-4' />
          Add Member
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <ServerSideTable
        data={data}
        columnConfigs={columnConfigs}
        customRenderers={customRenderers}
        pageCount={pageCount}
        totalCount={totalCount}
        enableRowSelection={false}
        showGlobalFilter={true}
        renderHeader={renderHeader}
      />

      <AddMemberDialog
        open={addMemberDialog.isOpen}
        onOpenChange={open =>
          open ? addMemberDialog.open() : addMemberDialog.close()
        }
        teamId={teamId}
        teamName={teamName}
      />

      <ModalDialog
        open={removeDialog.isOpen}
        onOpenChange={open =>
          open ? removeDialog.open() : removeDialog.close()
        }
        title='Remove team member?'
        description={
          <>
            Are you sure you want to remove{' '}
            <span className='font-semibold'>
              {removeDialog.data?.email ||
                removeDialog.data?.name ||
                'this user'}
            </span>{' '}
            from the team? This action cannot be undone.
          </>
        }
        confirmText='Remove'
        cancelText='Cancel'
        confirmButtonVariant='destructive'
        disableConfirmButton={isLoading}
        asyncAction={true}
        loadingText='Removing...'
        onConfirm={handleRemoveMember}
        onCancel={() => removeDialog.close()}
      />
    </>
  )
}
