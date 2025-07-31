'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Trash2, CreditCard } from 'lucide-react'

import { modalConfirmAsync } from '@/components/blocks/modal-utils'
import { ServerSideTable } from '@/components/blocks/table/server-side-table'
import { UserCell } from '@/components/blocks/table/user-cell'
import {
  showErrorToast,
  showSuccessToast
} from '@/components/blocks/toast-manager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiEndpoints } from '@/config/api-endpoints'
import { useTableSelection, emitRowDeletion } from '@/hooks/use-table-selection'
import { api } from '@/lib/api/http-client'
import {
  createSelectColumnConfig,
  createDateColumnConfig,
  createRoleColumnConfig,
  type ColumnConfig
} from '@/lib/table/table-columns-config'
import {
  getMemberPlan,
  getPlanDisplayName,
  getHighestTeamPlan
} from '@/lib/utils/subscription'
import { getUserDisplayName } from '@/lib/utils/user'
import { type TeamMemberWithUser } from '@/types/database'

import { TeamMemberActions } from './team-member-actions'
import { LeaveTeamButton } from './team-settings-client'

interface TeamMembersTableProps {
  data: TeamMemberWithUser[]
  pageCount: number
  totalCount: number
  isCurrentUserOwner: boolean
  currentUserId?: string
  teamData: any
}

export function TeamMembersTable({
  data,
  pageCount,
  totalCount,
  isCurrentUserOwner,
  currentUserId,
  teamData
}: TeamMembersTableProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const { selectedRows, setSelectedRows } = useTableSelection()

  const columnConfigs: ColumnConfig[] = []

  // Only add select column if current user is owner
  if (isCurrentUserOwner) {
    columnConfigs.push(createSelectColumnConfig())
  }

  columnConfigs.push(
    {
      id: 'user',
      header: 'Member',
      type: 'custom',
      enableSorting: true
    },
    createRoleColumnConfig(),
    {
      id: 'plan',
      header: 'Plan',
      type: 'custom',
      enableSorting: true
    },
    createDateColumnConfig({
      header: 'Joined',
      accessorKey: 'joinedAt'
    }),
    {
      id: 'actions',
      header: '',
      type: 'custom',
      enableSorting: false
    }
  )

  const customRenderers = {
    user: (row: TeamMemberWithUser) => {
      const user = row.user
      return (
        <UserCell
          name={user.name}
          email={user.email}
          walletAddress={user.walletAddress}
        />
      )
    },
    plan: (row: TeamMemberWithUser) => {
      const member = row
      const memberPlan = getMemberPlan(
        member.userId,
        teamData?.planId || 'free',
        teamData?.paymentHistory || []
      )
      const displayPlan = getPlanDisplayName(memberPlan)

      // Get the highest team plan from all payment history
      const highestTeamPlan = getHighestTeamPlan(teamData?.paymentHistory || [])

      // Find the most recent payment for the highest team plan
      let paidForHighestPlan = false
      if (highestTeamPlan && highestTeamPlan !== 'free') {
        // Get all payments for the highest plan, sorted by date (most recent first)
        const highestPlanPayments =
          teamData?.paymentHistory?.filter(
            (p: any) =>
              p.planId.toLowerCase() === highestTeamPlan &&
              p.status === 'confirmed'
          ) || []

        // Check if the most recent payment for the highest plan was made by this member
        if (highestPlanPayments.length > 0) {
          // Since payments are already sorted by createdAt desc, the first one is the most recent
          paidForHighestPlan = highestPlanPayments[0].userId === member.userId
        }
      }

      return (
        <div className='flex flex-col items-start gap-1'>
          <Badge
            variant={memberPlan === 'free' ? 'secondary' : 'default'}
            className='flex items-center gap-1'
          >
            {paidForHighestPlan && <CreditCard className='h-3 w-3' />}
            {displayPlan}
          </Badge>
          {paidForHighestPlan && (
            <span className='text-muted-foreground text-xs'>
              (Paid for team)
            </span>
          )}
        </div>
      )
    },
    actions: (row: TeamMemberWithUser) => {
      const member = row
      const user = member.user
      const memberName = getUserDisplayName(user)

      return (
        <TeamMemberActions
          memberId={member.id}
          memberName={memberName}
          currentRole={member.role}
          isCurrentUserOwner={isCurrentUserOwner}
          currentUserId={currentUserId}
          memberUserId={member.userId}
        />
      )
    }
  }

  const handleBulkRemove = async () => {
    const selectedMemberIds = Object.keys(selectedRows)
    // Filter out the current user from selected members
    const membersToRemove = selectedMemberIds.filter(id => {
      const member = data.find(m => String(m.id) === id)
      return member && String(member.userId) !== currentUserId
    })

    if (membersToRemove.length === 0) {
      showErrorToast('Cannot remove yourself from the team')
      return
    }

    const confirmMessage = `Are you sure you want to remove ${membersToRemove.length} member${membersToRemove.length > 1 ? 's' : ''} from the team?`
    await modalConfirmAsync(
      confirmMessage,
      async () => {
        setIsDeleting(true)
        try {
          const errors: string[] = []

          for (const memberId of membersToRemove) {
            const result = await api.delete(
              apiEndpoints.teamMembers.byId(memberId)
            )
            if (!result.success) {
              // Don't show toast here, the API client already shows it
              errors.push(result.error || 'Failed to remove member')
            }
          }

          if (errors.length > 0) {
            throw new Error('Failed to remove some members')
          }

          showSuccessToast(
            `Successfully removed ${membersToRemove.length} member${membersToRemove.length > 1 ? 's' : ''}`
          )
          // Emit deletion event to clear selection
          emitRowDeletion(membersToRemove.map(id => parseInt(id)))
          // Clear selection immediately
          setSelectedRows({})
          // Refresh the page to update the data
          router.refresh()
        } finally {
          setIsDeleting(false)
        }
      },
      {
        title: `Remove Team Member${membersToRemove.length > 1 ? 's' : ''}`,
        confirmText: 'Remove',
        confirmButtonVariant: 'destructive',
        loadingText: 'Removing...'
      }
    )
  }

  const selectedCount = Object.keys(selectedRows).length
  const currentUserMembership = data.find(
    member => String(member.userId) === currentUserId
  )
  const currentUserRole = currentUserMembership?.role || 'member'

  const renderHeader = () => (
    <div className='mb-4 flex items-center justify-between'>
      <div className='flex items-center gap-2'>
        {teamData &&
          teamData.teamMembers &&
          teamData.teamMembers.length > 1 && (
            <LeaveTeamButton
              teamData={teamData}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId ? parseInt(currentUserId) : 0}
            />
          )}
      </div>
      <div className='flex items-center gap-2'>
        {isCurrentUserOwner && selectedCount > 0 && (
          <Button
            variant='destructive'
            size='sm'
            onClick={handleBulkRemove}
            disabled={isDeleting}
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Remove Selected ({selectedCount})
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <ServerSideTable
      data={data}
      columnConfigs={columnConfigs}
      customRenderers={customRenderers}
      pageCount={pageCount}
      totalCount={totalCount}
      getRowId={row => String(row.id)}
      enableRowSelection={isCurrentUserOwner}
      rowSelection={selectedRows}
      onRowSelectionChange={setSelectedRows}
      renderHeader={renderHeader}
    />
  )
}
