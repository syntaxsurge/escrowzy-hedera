'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import { Search, UserPlus } from 'lucide-react'

import { ModalDialog } from '@/components/blocks/modal-utils'
import { UserCell } from '@/components/blocks/table/user-cell'
import {
  showErrorToast,
  showSuccessToast
} from '@/components/blocks/toast-manager'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { apiEndpoints } from '@/config/api-endpoints'
import { useLoading } from '@/hooks/use-loading'
import { api } from '@/lib/api/http-client'

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
}

interface User {
  id: string
  email: string | null
  name: string | null
  walletAddress: string | null
}

export function AddMemberDialog({
  open,
  onOpenChange,
  teamId,
  teamName
}: AddMemberDialogProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [role, setRole] = useState<'member' | 'owner'>('member')
  const { isLoading, execute: executeAdd } = useLoading()
  const { isLoading: isSearching, execute: executeSearch } = useLoading()

  useEffect(() => {
    if (open) {
      searchUsers()
    } else {
      // Reset state when dialog closes
      setSearch('')
      setAvailableUsers([])
      setSelectedUsers([])
      setRole('member')
    }
  }, [open])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (open) {
        searchUsers()
      }
    }, 300)

    return () => clearTimeout(debounce)
  }, [search])

  const searchUsers = async () => {
    await executeSearch(async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const response = await api.get(
        `${apiEndpoints.admin.teams.availableUsers(teamId)}?${params.toString()}`
      )

      if (!response.success)
        throw new Error(response.error || 'Failed to search users')

      setAvailableUsers(response.data)
    }).catch(() => {
      showErrorToast('Failed to search users')
    })
  }

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      showErrorToast('Please select at least one user')
      return
    }

    await executeAdd(async () => {
      const response = await api.post(
        apiEndpoints.admin.teams.members(teamId),
        {
          userIds: selectedUsers,
          role
        }
      )

      if (!response.success)
        throw new Error(response.error || 'Failed to add members')

      showSuccessToast(`Added ${selectedUsers.length} member(s) to ${teamName}`)
      onOpenChange(false)
      router.refresh()
    }).catch(() => {
      showErrorToast('Failed to add members')
    })
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Add Members to ${teamName}`}
      description='Search and select users to add to the team. You can assign them as regular members or owners.'
      useDialog={true}
      showCloseButton={true}
      confirmText={
        isLoading ? (
          'Adding...'
        ) : (
          <>
            <UserPlus className='mr-2 h-4 w-4' />
            Add{' '}
            {selectedUsers.length > 0
              ? `${selectedUsers.length} Member(s)`
              : 'Members'}
          </>
        )
      }
      cancelText='Cancel'
      confirmButtonVariant='default'
      disableConfirmButton={isLoading || selectedUsers.length === 0}
      asyncAction={true}
      loadingText='Adding...'
      onConfirm={handleAddMembers}
      onCancel={() => onOpenChange(false)}
      maxWidth='2xl'
      content={
        <div className='space-y-4'>
          <div>
            <Label htmlFor='search'>Search Users</Label>
            <div className='relative mt-1'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                id='search'
                placeholder='Search by email, name, or wallet address...'
                value={search}
                onChange={e => setSearch(e.target.value)}
                className='pl-9'
              />
            </div>
          </div>

          <div>
            <div className='flex items-center justify-between'>
              <Label>Available Users</Label>
              {availableUsers.length >= 20 && (
                <span className='text-muted-foreground text-xs'>
                  Showing top 20 results. Use search to find specific users.
                </span>
              )}
            </div>
            <div className='mt-2 max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3'>
              {isSearching ? (
                <div className='text-muted-foreground py-4 text-center'>
                  Searching...
                </div>
              ) : availableUsers.length === 0 ? (
                <div className='text-muted-foreground py-4 text-center'>
                  No available users found
                </div>
              ) : (
                availableUsers.map(user => (
                  <div
                    key={user.id}
                    className='hover:bg-muted/50 flex items-center space-x-3 rounded-md p-2'
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                    <UserCell
                      name={user.name}
                      email={user.email}
                      walletAddress={user.walletAddress}
                    />
                  </div>
                ))
              )}
            </div>
            {selectedUsers.length > 0 && (
              <p className='text-muted-foreground mt-2 text-sm'>
                {selectedUsers.length} user(s) selected
              </p>
            )}
          </div>

          <div>
            <Label htmlFor='role'>Default Role</Label>
            <Select
              value={role}
              onValueChange={v => setRole(v as 'member' | 'owner')}
            >
              <SelectTrigger id='role' className='mt-1'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='member'>Member</SelectItem>
                <SelectItem value='owner'>Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    />
  )
}
