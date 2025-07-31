// Table and Data Grid Types

import type { ColumnDef } from '@tanstack/react-table'

// Table State
export interface TableState<T = any> {
  data: T[]
  columns: ColumnDef<T>[]
  pagination: PaginationState
  sorting: SortingState
  filtering: FilteringState
  selection: SelectionState
  loading: boolean
  error?: string | null
}

// Pagination
export interface PaginationState {
  pageIndex: number
  pageSize: number
  total: number
  totalPages: number
}

// Sorting
export interface SortingState {
  column: string | null
  direction: 'asc' | 'desc' | null
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

// Filtering
export interface FilteringState {
  search?: string
  filters: Record<string, any>
}

export interface FilterConfig {
  field: string
  operator: FilterOperator
  value: any
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'

// Selection
export interface SelectionState {
  selectedRows: Set<string | number>
  allSelected: boolean
}

// Table Request/Response
export interface TableRequest {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  filters?: Record<string, any>
}

export interface TableResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Column Configuration
export interface TableColumnConfig<T = any> {
  accessorKey: keyof T | string
  header: string
  cell?: (info: any) => React.ReactNode
  enableSorting?: boolean
  enableFiltering?: boolean
  filterFn?: string
  sortingFn?: string
  size?: number
  minSize?: number
  maxSize?: number
  align?: 'left' | 'center' | 'right'
}

// Table Actions
export interface TableActions<T = any> {
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSortChange: (sorting: SortingState) => void
  onSearchChange: (search: string) => void
  onFilterChange: (filters: Record<string, any>) => void
  onSelectionChange: (selection: SelectionState) => void
  onRowClick?: (row: T) => void
  onRefresh?: () => void
}

// Row Actions
export interface RowAction<T = any> {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: (row: T) => void | Promise<void>
  visible?: (row: T) => boolean
  disabled?: (row: T) => boolean
  variant?: 'default' | 'destructive' | 'outline'
}

// Bulk Actions
export interface BulkAction<T = any> {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: (selectedRows: T[]) => void | Promise<void>
  confirmRequired?: boolean
  confirmMessage?: string
  variant?: 'default' | 'destructive' | 'outline'
}

// Table Props
export interface DataTableProps<T = any> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  error?: string | null
  pagination?: PaginationState
  onPaginationChange?: (pagination: PaginationState) => void
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  filtering?: FilteringState
  onFilteringChange?: (filtering: FilteringState) => void
  selection?: SelectionState
  onSelectionChange?: (selection: SelectionState) => void
  rowActions?: RowAction<T>[]
  bulkActions?: BulkAction<T>[]
  emptyMessage?: string
  className?: string
}

// Server-Side Table Props
export interface ServerSideTableProps<T = any>
  extends Omit<DataTableProps<T>, 'data'> {
  endpoint: string
  queryKey?: string[]
  defaultPageSize?: number
  defaultSort?: SortConfig
  defaultFilters?: Record<string, any>
  transformResponse?: (response: any) => TableResponse<T>
}

// Table Export
export interface TableExportOptions {
  format: 'csv' | 'excel' | 'pdf'
  filename?: string
  columns?: string[]
  includeHeaders?: boolean
  dateFormat?: string
}

// Table Toolbar
export interface TableToolbarProps {
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  filters?: Array<{
    field: string
    label: string
    options: Array<{ value: any; label: string }>
    value: any
    onChange: (value: any) => void
  }>
  actions?: React.ReactNode
  bulkActions?: {
    selectedCount: number
    actions: BulkAction<any>[]
    onAction: (action: BulkAction<any>) => void
  }
}

// Column Visibility
export interface ColumnVisibilityState {
  [key: string]: boolean
}

// Table Features
export interface TableFeatures {
  pagination?: boolean
  sorting?: boolean
  filtering?: boolean
  selection?: boolean
  columnVisibility?: boolean
  export?: boolean
  refresh?: boolean
  density?: boolean
}

// Density Options
export type TableDensity = 'compact' | 'normal' | 'comfortable'
