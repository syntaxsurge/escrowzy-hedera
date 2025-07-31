import { useState } from 'react'

import { modalConfirmAsync } from '@/components/blocks/modal-utils'
import {
  showErrorToast,
  showSuccessToast
} from '@/components/blocks/toast-manager'
import { emitRowDeletion } from '@/hooks/use-table-selection'
import { api } from '@/lib/api/http-client'

interface BulkDeleteOptions {
  endpoint: string
  itemName: string
  onSuccess?: () => void
  confirmMessage?: (count: number) => string
  successMessage?: (count: number) => string
}

export function useBulkDelete({
  endpoint,
  itemName,
  onSuccess,
  confirmMessage,
  successMessage
}: BulkDeleteOptions) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleBulkDelete = async (selectedIds: string[] | number[]) => {
    if (selectedIds.length === 0) return

    const defaultConfirmMessage = (count: number) =>
      `Are you sure you want to delete ${count} ${itemName}${count > 1 ? 's' : ''}?`
    const defaultSuccessMessage = (count: number) =>
      `Successfully deleted ${count} ${itemName}${count > 1 ? 's' : ''}`

    const confirmMsg = confirmMessage || defaultConfirmMessage
    const successMsg = successMessage || defaultSuccessMessage

    await modalConfirmAsync(
      confirmMsg(selectedIds.length),
      async () => {
        setIsDeleting(true)
        try {
          const result = await api.delete(endpoint, {
            body: { ids: selectedIds }
          })

          if (!result.success) {
            throw new Error(`Failed to delete ${itemName}s`)
          }

          showSuccessToast(successMsg(selectedIds.length))
          // Emit row deletion event to clear selections across all tables
          emitRowDeletion(selectedIds)
          onSuccess?.()
        } catch (_error) {
          showErrorToast(`Failed to delete ${itemName}s`)
        } finally {
          setIsDeleting(false)
        }
      },
      {
        title: `Delete ${itemName}${selectedIds.length > 1 ? 's' : ''}`,
        confirmText: 'Delete',
        confirmButtonVariant: 'destructive'
      }
    )
  }

  return {
    handleBulkDelete,
    isDeleting
  }
}
