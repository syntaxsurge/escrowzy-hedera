'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'

import {
  type ColumnFiltersState,
  type SortingState,
  type PaginationState,
  type ColumnDef,
  type RowSelectionState,
  getCoreRowModel,
  useReactTable,
  type Table
} from '@tanstack/react-table'

import { buildTableQueryString } from '@/lib/table/table'

interface UseServerTableOptions<T> {
  columns: ColumnDef<T>[]
  data: T[]
  pageCount: number
  totalCount: number
  manualPagination?: boolean
  manualSorting?: boolean
  manualFiltering?: boolean
  enableRowSelection?: boolean
  getRowId?: (row: T) => string
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (rowSelection: RowSelectionState) => void
}

interface UseServerTableReturn<T> {
  table: Table<T>
  isTransitioning: boolean
  globalFilter: string
  setGlobalFilter: (value: string) => void
  columnFilters: ColumnFiltersState
  setColumnFilters: (filters: ColumnFiltersState) => void
  resetFilters: () => void
  selectedRows: RowSelectionState
  setSelectedRows: (rows: RowSelectionState) => void
}

export function useServerTable<T>({
  columns,
  data,
  pageCount,
  totalCount: _totalCount,
  manualPagination = true,
  manualSorting = true,
  manualFiltering = true,
  enableRowSelection = false,
  getRowId,
  rowSelection: externalRowSelection,
  onRowSelectionChange
}: UseServerTableOptions<T>): UseServerTableReturn<T> {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
  const sortBy = searchParams.get('sortBy')
  const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null
  const search = searchParams.get('search') || ''

  const [globalFilter, setGlobalFilterState] = useState(search)
  const [internalRowSelection, setInternalRowSelection] =
    useState<RowSelectionState>({})

  // Use external row selection if provided, otherwise use internal
  const rowSelection =
    externalRowSelection !== undefined
      ? externalRowSelection
      : internalRowSelection

  const pagination: PaginationState = {
    pageIndex: Math.max(0, page - 1),
    pageSize: Math.min(100, Math.max(1, pageSize))
  }

  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : []

  const columnFilters: ColumnFiltersState = []
  searchParams.forEach((value, key) => {
    if (
      !['page', 'pageSize', 'sortBy', 'sortOrder', 'search'].includes(key) &&
      value
    ) {
      columnFilters.push({ id: key, value })
    }
  })

  const updateUrl = useCallback(
    (params: {
      pagination?: PaginationState
      sorting?: SortingState
      globalFilter?: string
      columnFilters?: ColumnFiltersState
    }) => {
      const newParams = {
        page: params.pagination ? params.pagination.pageIndex + 1 : page,
        pageSize: params.pagination ? params.pagination.pageSize : pageSize,
        sortBy: params.sorting?.length
          ? params.sorting[0].id
          : sortBy || undefined,
        sortOrder: params.sorting?.length
          ? params.sorting[0].desc
            ? ('desc' as const)
            : ('asc' as const)
          : sortOrder || undefined,
        search:
          params.globalFilter !== undefined ? params.globalFilter : search,
        filters: params.columnFilters
          ? params.columnFilters.reduce(
              (acc, filter) => {
                acc[filter.id] = String(filter.value)
                return acc
              },
              {} as Record<string, string>
            )
          : columnFilters.reduce(
              (acc, filter) => {
                acc[filter.id] = String(filter.value)
                return acc
              },
              {} as Record<string, string>
            )
      }

      const queryString = buildTableQueryString(newParams)
      startTransition(() => {
        router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, {
          scroll: false
        })
      })
    },
    [page, pageSize, sortBy, sortOrder, search, columnFilters, pathname, router]
  )

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination,
      sorting,
      globalFilter,
      columnFilters,
      rowSelection
    },
    enableRowSelection,
    getRowId,
    onPaginationChange: updater => {
      const newPagination =
        typeof updater === 'function' ? updater(pagination) : updater
      updateUrl({ pagination: newPagination })
    },
    onSortingChange: updater => {
      let newSorting =
        typeof updater === 'function' ? updater(sorting) : updater

      // If sorting is being cleared (empty array), and we had a sort before,
      // toggle to descending instead of clearing
      if (newSorting.length === 0 && sorting.length > 0 && !sorting[0].desc) {
        newSorting = [{ ...sorting[0], desc: true }]
      }

      updateUrl({
        sorting: newSorting,
        pagination: { ...pagination, pageIndex: 0 }
      })
    },
    onGlobalFilterChange: updater => {
      const newFilter =
        typeof updater === 'function' ? updater(globalFilter) : updater
      setGlobalFilterState(newFilter)
    },
    onColumnFiltersChange: updater => {
      const newFilters =
        typeof updater === 'function' ? updater(columnFilters) : updater
      updateUrl({
        columnFilters: newFilters,
        pagination: { ...pagination, pageIndex: 0 }
      })
    },
    onRowSelectionChange: updater => {
      const newValue =
        typeof updater === 'function' ? updater(rowSelection) : updater
      if (onRowSelectionChange) {
        onRowSelectionChange(newValue)
      } else {
        setInternalRowSelection(newValue)
      }
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination,
    manualSorting,
    manualFiltering
  })

  // Remove automatic search debouncing - search will be triggered manually

  const setGlobalFilter = useCallback(
    (value: string) => {
      setGlobalFilterState(value)
      updateUrl({
        globalFilter: value,
        pagination: { ...pagination, pageIndex: 0 }
      })
    },
    [updateUrl, pagination]
  )

  const setColumnFilters = useCallback(
    (filters: ColumnFiltersState) => {
      updateUrl({
        columnFilters: filters,
        pagination: { ...pagination, pageIndex: 0 }
      })
    },
    [updateUrl, pagination]
  )

  const resetFilters = useCallback(() => {
    setGlobalFilterState('')
    updateUrl({
      globalFilter: '',
      columnFilters: [],
      sorting: [],
      pagination: { pageIndex: 0, pageSize: pagination.pageSize }
    })
  }, [updateUrl, pagination.pageSize])

  return {
    table,
    isTransitioning: isPending,
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilters,
    resetFilters,
    selectedRows: rowSelection,
    setSelectedRows: onRowSelectionChange || setInternalRowSelection
  }
}
