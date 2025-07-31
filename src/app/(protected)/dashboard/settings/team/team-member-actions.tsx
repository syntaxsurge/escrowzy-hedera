'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Settings, Crown, User, Trash2 } from 'lucide-react'

import { updateTeamMemberRole, removeTeamMember } from '@/app/actions'
import { ModalDialog } from '@/components/blocks/modal-utils'
import {
  showSuccessToast,
  showErrorToast
} from '@/components/blocks/toast-manager'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useDialogState } from '@/hooks/use-dialog-state'
import { useLoading } from '@/hooks/use-loading'
import { emitRowDeletion } from '@/hooks/use-table-selection'

interface TeamMemberActionsProps {
  memberId: number
  memberName: string
  currentRole: string
  isCurrentUserOwner: boolean
  currentUserId?: string
  memberUserId: number
}

export function TeamMemberActions({
  memberId,
  memberName,
  currentRole,
  isCurrentUserOwner,
  currentUserId,
  memberUserId
}: TeamMemberActionsProps) {
  const router = useRouter()
  const roleDialog = useDialogState<string>(false, currentRole)
  const removeDialog = useDialogState()
  const [selectedRole, setSelectedRole] = useState(currentRole)
  const { isLoading, execute } = useLoading()

  // Don't show actions if not owner or if it's the current user
  if (!isCurrentUserOwner || String(memberUserId) === currentUserId) {
    return null
  }

  const handleRoleChange = async () => {
    if (selectedRole === currentRole) {
      roleDialog.close()
      return
    }

    await execute(
      (async () => {
        const formData = new FormData()
        formData.append('memberId', memberId.toString())
        formData.append('role', selectedRole)

        const result = await updateTeamMemberRole({}, formData)

        if (result.error) {
          showErrorToast(result.error)
        } else if ('success' in result && result.success) {
          showSuccessToast(result.success)
          roleDialog.close()
          router.refresh()
        }
      })()
    )
  }

  const handleRemoveMember = async () => {
    await execute(
      (async () => {
        const formData = new FormData()
        formData.append('memberId', memberId.toString())

        const result = await removeTeamMember({}, formData)

        if (result.error) {
          showErrorToast(result.error)
        } else if ('success' in result && result.success) {
          showSuccessToast(result.success)
          removeDialog.close()
          // Emit deletion event to clear selection
          emitRowDeletion([memberId])
          router.refresh()
        }
      })()
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='h-8 w-8'>
            <Settings className='h-4 w-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {currentRole !== 'owner' && (
            <DropdownMenuItem
              onClick={() => {
                setSelectedRole('owner')
                roleDialog.open('owner')
              }}
            >
              <Crown className='mr-2 h-4 w-4' />
              Make Owner
            </DropdownMenuItem>
          )}
          {currentRole !== 'member' && (
            <DropdownMenuItem
              onClick={() => {
                setSelectedRole('member')
                roleDialog.open('member')
              }}
            >
              <User className='mr-2 h-4 w-4' />
              Make Member
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => removeDialog.open()}
            className='text-destructive'
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ModalDialog
        open={roleDialog.isOpen}
        onOpenChange={open => (open ? roleDialog.open() : roleDialog.close())}
        title='Change Member Role'
        description={`Update the role for ${memberName}`}
        useDialog={true}
        confirmText='Update Role'
        cancelText='Cancel'
        confirmButtonVariant='default'
        disableConfirmButton={isLoading}
        asyncAction={true}
        loadingText='Updating...'
        onConfirm={handleRoleChange}
        onCancel={() => roleDialog.close()}
        content={
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='role'>Select Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id='role'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='owner'>
                    <div className='flex items-center'>
                      <Crown className='mr-2 h-4 w-4' />
                      Owner
                    </div>
                  </SelectItem>
                  <SelectItem value='member'>
                    <div className='flex items-center'>
                      <User className='mr-2 h-4 w-4' />
                      Member
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      <ModalDialog
        open={removeDialog.isOpen}
        onOpenChange={open =>
          open ? removeDialog.open() : removeDialog.close()
        }
        title='Remove Team Member'
        description={`Are you sure you want to remove ${memberName} from the team? This action cannot be undone.`}
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
