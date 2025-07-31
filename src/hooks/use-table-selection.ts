'use client'

import { useState, useCallback, useEffect } from 'react'

// Global event emitter for row deletions
const rowDeletionEvents = new EventTarget()

export const TABLE_ROW_DELETED_EVENT = 'table-row-deleted'

/**
 * Emit a row deletion event to clear selections across all tables
 * @param deletedRowIds - Array of row IDs that were deleted
 */
export function emitRowDeletion(deletedRowIds: string[] | number[]) {
  const event = new CustomEvent(TABLE_ROW_DELETED_EVENT, {
    detail: { deletedRowIds: deletedRowIds.map(id => String(id)) }
  })
  rowDeletionEvents.dispatchEvent(event)
}

/**
 * Hook to manage table row selection with automatic clearing on row deletion
 */
export function useTableSelection(
  initialSelection: Record<string, boolean> = {}
) {
  const [selectedRows, setSelectedRows] =
    useState<Record<string, boolean>>(initialSelection)

  // Clear deleted rows from selection
  const handleRowDeletion = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ deletedRowIds: string[] }>
    const { deletedRowIds } = customEvent.detail

    setSelectedRows(current => {
      const updated = { ...current }
      let hasChanges = false

      deletedRowIds.forEach(id => {
        if (updated[id]) {
          delete updated[id]
          hasChanges = true
        }
      })

      return hasChanges ? updated : current
    })
  }, [])

  // Subscribe to row deletion events
  useEffect(() => {
    rowDeletionEvents.addEventListener(
      TABLE_ROW_DELETED_EVENT,
      handleRowDeletion
    )
    return () => {
      rowDeletionEvents.removeEventListener(
        TABLE_ROW_DELETED_EVENT,
        handleRowDeletion
      )
    }
  }, [handleRowDeletion])

  return {
    selectedRows,
    setSelectedRows
  }
}
