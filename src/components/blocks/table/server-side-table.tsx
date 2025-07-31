'use client'

import type { ReactNode } from 'react'

import type { ColumnDef } from '@tanstack/react-table'

import { DataTable } from '@/components/blocks/table/data-table'
import { DataTablePagination } from '@/components/blocks/table/data-table-pagination'
import { renderTableColumns } from '@/components/blocks/table/table-columns-renderer'
import { useServerTable } from '@/hooks/use-server-table'
import type { ColumnConfig } from '@/lib/table/table-columns-config'

interface ServerSideTableProps<TData extends Record<string, any>> {
  data: TData[]
  columns?: ColumnDef<TData>[]
  columnConfigs?: ColumnConfig[]
  customRenderers?: Record<string, (row: TData) => React.ReactNode>
  pageCount: number
  totalCount: number
  pageSizeOptions?: number[]
  getRowId?: (row: TData) => string
  enableRowSelection?: boolean
  showGlobalFilter?: boolean
  renderHeader?: () => ReactNode
  renderFooter?: () => ReactNode
  rowSelection?: Record<string, boolean>
  onRowSelectionChange?: (selectedRows: Record<string, boolean>) => void
  isLoading?: boolean
}

export function ServerSideTable<TData extends Record<string, any>>({
  data,
  columns,
  columnConfigs,
  customRenderers,
  pageCount,
  totalCount,
  pageSizeOptions = [10, 20, 50],
  getRowId,
  enableRowSelection = false,
  showGlobalFilter = true,
  renderHeader,
  renderFooter,
  rowSelection,
  onRowSelectionChange,
  isLoading = false
}: ServerSideTableProps<TData>) {
  // Use provided columns or render from configs
  const tableColumns =
    columns ||
    (columnConfigs
      ? renderTableColumns<TData>(columnConfigs, customRenderers)
      : [])

  const { table, isTransitioning, globalFilter, setGlobalFilter } =
    useServerTable({
      columns: tableColumns,
      data,
      pageCount,
      totalCount,
      getRowId,
      enableRowSelection,
      rowSelection,
      onRowSelectionChange
    })

  return (
    <>
      {renderHeader && renderHeader()}
      <DataTable
        table={table}
        columns={tableColumns}
        isLoading={isLoading || isTransitioning}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        showGlobalFilter={showGlobalFilter}
      />
      <DataTablePagination
        table={table}
        totalCount={totalCount}
        pageSizeOptions={pageSizeOptions}
      />
      {renderFooter && renderFooter()}
    </>
  )
}
