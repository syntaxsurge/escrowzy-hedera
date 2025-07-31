'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Edit, Trash2, Settings } from 'lucide-react'

import { modalConfirmAsync, ModalDialog } from '@/components/blocks/modal-utils'
import {
  createOperationToast,
  updateOperationToast
} from '@/components/blocks/operation-toast'
import { ServerSideTable } from '@/components/blocks/table/server-side-table'
import { UserCell } from '@/components/blocks/table/user-cell'
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
import { useDialogState } from '@/hooks/use-dialog-state'
import { useLoading } from '@/hooks/use-loading'
import { useTableSelection, emitRowDeletion } from '@/hooks/use-table-selection'
import { api } from '@/lib/api/http-client'
import type { UserWithPlan } from '@/lib/db/queries/admin-users'
import {
  createSelectColumnConfig,
  createRoleColumnConfig,
  createPlanColumnConfig,
  createDateColumnConfig,
  createActionsColumnConfig,
  type ColumnConfig
} from '@/lib/table/table-columns-config'

interface UserManagementTableProps {
  data: UserWithPlan[]
  pageCount: number
  totalCount: number
}

interface UserDetailsResponse {
  user: UserWithPlan
  planId: string | null
  personalPlanId: string | null
}

export function UserManagementTable({
  data,
  pageCount,
  totalCount
}: UserManagementTableProps) {
  const router = useRouter()
  const editDialog = useDialogState<UserDetailsResponse>()
  const { isLoading: isEditLoading, execute: executeEdit } = useLoading()
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
    planId: '',
    personalPlanId: ''
  })

  const columnConfigs: ColumnConfig[] = [
    createSelectColumnConfig(),
    {
      id: 'user',
      header: 'User',
      type: 'custom'
    },
    createRoleColumnConfig(),
    createPlanColumnConfig(),
    createDateColumnConfig({
      header: 'Joined',
      accessorKey: 'createdAt'
    }),
    createActionsColumnConfig()
  ]

  const customRenderers = {
    user: (user: UserWithPlan) => (
      <UserCell
        name={user.name}
        email={user.email}
        walletAddress={user.walletAddress}
      />
    ),
    actions: (user: UserWithPlan) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='h-8 w-8'>
            <Settings className='h-4 w-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            onClick={() => {
              if (user?.id) {
                fetchUserDetails(String(user.id))
              }
            }}
          >
            <Edit className='mr-2 h-4 w-4' />
            Edit User
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              if (!user?.id) {
                showErrorToast('Error', 'User data not found')
                return
              }

              await modalConfirmAsync(
                <div className='space-y-3'>
                  <p>
                    Are you sure you want to delete this user? This action
                    cannot be undone.
                  </p>
                  <div className='rounded-lg border p-3'>
                    <UserCell
                      name={user.name}
                      email={user.email}
                      walletAddress={user.walletAddress}
                    />
                  </div>
                  <p className='text-destructive text-sm font-medium'>
                    Warning: This will permanently delete the user and all
                    associated data.
                  </p>
                </div>,
                async () => {
                  const operationKey = `delete-user-${user.id}`

                  createOperationToast(operationKey, 'processing', {
                    message: 'Deleting user',
                    description: `Removing ${user.email} from the system...`
                  })

                  try {
                    const response = await api.delete(
                      apiEndpoints.admin.users.byId(String(user.id))
                    )

                    if (!response.success) {
                      throw new Error(response.error || 'Failed to delete user')
                    }

                    updateOperationToast(operationKey, 'success', {
                      message: 'User deleted successfully',
                      description: `${user.email} has been removed from the system`
                    })

                    // Emit deletion event to clear selection
                    emitRowDeletion([user.id])

                    setTimeout(() => {
                      window.location.reload()
                    }, 1000)
                  } catch (error) {
                    updateOperationToast(operationKey, 'error', {
                      message: 'Failed to delete user',
                      description:
                        error instanceof Error
                          ? error.message
                          : 'An error occurred while deleting the user'
                    })
                    throw error
                  }
                },
                {
                  title: 'Delete User',
                  confirmText: 'Delete User',
                  confirmButtonVariant: 'destructive',
                  confirmIcon: <Trash2 className='h-4 w-4' />,
                  loadingText: 'Deleting...'
                }
              )
            }}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const { selectedRows, setSelectedRows } = useTableSelection()

  const handleDeleteSelected = async () => {
    const selectedRowIds = Object.keys(selectedRows)
    if (selectedRowIds.length === 0) return

    const confirmMessage = `Are you sure you want to delete ${selectedRowIds.length} user${selectedRowIds.length > 1 ? 's' : ''}? This action cannot be undone.`
    await modalConfirmAsync(
      confirmMessage,
      async () => {
        const operationKey = `delete-users-bulk-${Date.now()}`

        createOperationToast(operationKey, 'processing', {
          message: 'Deleting users',
          description: `Removing ${selectedRowIds.length} user${selectedRowIds.length > 1 ? 's' : ''} from the system...`
        })

        try {
          let deletedCount = 0
          const errors: string[] = []

          for (const userId of selectedRowIds) {
            try {
              const response = await api.delete(
                apiEndpoints.admin.users.byId(userId)
              )

              if (response.success) {
                deletedCount++
                updateOperationToast(operationKey, 'processing', {
                  message: 'Deleting users',
                  description: `Removed ${deletedCount} of ${selectedRowIds.length} users...`
                })
              } else {
                errors.push(
                  `User ${userId}: ${response.error || 'Unknown error'}`
                )
              }
            } catch (error) {
              errors.push(
                `User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
              )
            }
          }

          if (deletedCount === selectedRowIds.length) {
            updateOperationToast(operationKey, 'success', {
              message: 'All users deleted successfully',
              description: `Successfully removed ${deletedCount} user${deletedCount > 1 ? 's' : ''} from the system`
            })
          } else if (deletedCount > 0) {
            updateOperationToast(operationKey, 'error', {
              message: 'Partial deletion completed',
              description: `Deleted ${deletedCount} of ${selectedRowIds.length} users. ${errors.length} failed.`
            })
          } else {
            updateOperationToast(operationKey, 'error', {
              message: 'Failed to delete users',
              description: errors.join(', ')
            })
          }

          // Emit deletion event to clear selection
          emitRowDeletion(selectedRowIds.slice(0, deletedCount))
          // Clear selection immediately
          setSelectedRows({})

          // Refresh the page to update the data
          setTimeout(() => {
            router.refresh()
          }, 1000)
        } catch (error) {
          updateOperationToast(operationKey, 'error', {
            message: 'Failed to delete users',
            description:
              error instanceof Error
                ? error.message
                : 'An unexpected error occurred'
          })
          throw error
        }
      },
      {
        title: `Delete ${selectedRowIds.length} User${selectedRowIds.length > 1 ? 's' : ''}`,
        confirmText: 'Delete',
        confirmButtonVariant: 'destructive',
        loadingText: 'Deleting...'
      }
    )
  }

  const fetchUserDetails = async (userId: string) => {
    try {
      const response = await api.get(apiEndpoints.admin.users.byId(userId))
      if (!response.success)
        throw new Error(response.error || 'Failed to fetch user details')

      const data = response.data
      editDialog.setData(data)
      setEditForm({
        name: data.user.name || '',
        email: data.user.email,
        role: data.user.role,
        planId: data.planId || 'free',
        personalPlanId: data.personalPlanId || 'free'
      })
      editDialog.open(data)
    } catch (_error) {
      showErrorToast('Error', 'Failed to fetch user details')
    }
  }

  const handleEdit = async () => {
    const userData = editDialog.data
    if (!userData?.user?.id) {
      showErrorToast('Error', 'User data not found')
      return
    }

    await executeEdit(async () => {
      const response = await api.put(
        apiEndpoints.admin.users.byId(String(userData.user.id)),
        {
          userInfo: {
            name: editForm.name,
            email: editForm.email,
            role: editForm.role
          },
          planId: editForm.planId,
          personalPlanId: editForm.personalPlanId
        }
      )

      if (!response.success) {
        showErrorToast('Error', response.error || 'Failed to update user')
        return
      }

      showSuccessToast('Success', 'User updated successfully')
      editDialog.close()
      window.location.reload()
    })
  }

  const selectedCount = Object.keys(selectedRows).length

  const renderHeader = () => (
    <div className='flex items-center justify-between gap-4'>
      <div className='flex-1' />
      {selectedCount > 0 && (
        <Button variant='destructive' size='sm' onClick={handleDeleteSelected}>
          <Trash2 className='mr-2 h-4 w-4' />
          Delete Selected ({selectedCount})
        </Button>
      )}
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
        getRowId={row => String(row.id)}
        enableRowSelection={true}
        showGlobalFilter={true}
        rowSelection={selectedRows}
        onRowSelectionChange={setSelectedRows}
        renderHeader={renderHeader}
      />

      {/* Edit User Modal */}
      <ModalDialog
        open={editDialog.isOpen}
        onOpenChange={open => (open ? editDialog.open() : editDialog.close())}
        title='Edit User'
        description='Update user information and subscription details'
        confirmText={isEditLoading ? 'Saving...' : 'Save Changes'}
        cancelText='Cancel'
        confirmButtonVariant='default'
        onConfirm={handleEdit}
        onCancel={() => editDialog.close()}
        asyncAction={true}
        loadingText='Saving...'
        useDialog={true}
        showCloseButton={true}
        maxWidth='2xl'
        content={
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Name</Label>
                <Input
                  id='name'
                  value={editForm.name}
                  onChange={e =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={editForm.email}
                  onChange={e =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='role'>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={value =>
                    setEditForm({ ...editForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='user'>User</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='personalPlanId'>Personal Plan</Label>
                <Select
                  value={editForm.personalPlanId}
                  onValueChange={value =>
                    setEditForm({ ...editForm, personalPlanId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select personal plan' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='free'>Free</SelectItem>
                    <SelectItem value='pro'>Pro</SelectItem>
                    <SelectItem value='enterprise'>Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='planId'>Team Plan</Label>
                <Select
                  value={editForm.planId}
                  onValueChange={value =>
                    setEditForm({ ...editForm, planId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select team plan' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='free'>Free</SelectItem>
                    <SelectItem value='team_pro'>Team Pro</SelectItem>
                    <SelectItem value='team_enterprise'>
                      Team Enterprise
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        }
      />
    </>
  )
}
