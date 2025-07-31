import { type ColumnDef, type SortingState } from '@tanstack/react-table'

export interface PaginationState {
  pageIndex: number
  pageSize: number
}

export interface TableRequest {
  pagination: PaginationState
  sorting: SortingState
  globalFilter?: string
  columnFilters?: Array<{
    id: string
    value: unknown
  }>
}

export interface TableResponse<T> {
  data: T[]
  pageCount: number
  totalCount: number
}

export interface TableQueryParams {
  page?: string
  pageSize?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  [key: string]: string | undefined
}

export function parseTableQueryParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): TableRequest {
  // Convert URLSearchParams to Record format if needed
  const params: Record<string, string | undefined> = {}

  if (searchParams instanceof URLSearchParams) {
    searchParams.forEach((value, key) => {
      params[key] = value
    })
  } else {
    // Handle Record format, converting arrays to strings
    Object.entries(searchParams).forEach(([key, value]) => {
      if (typeof value === 'string') {
        params[key] = value
      } else if (Array.isArray(value) && value.length > 0) {
        params[key] = value[0]
      }
    })
  }

  const page = parseInt(params.page || '1', 10)
  const pageSize = parseInt(params.pageSize || '10', 10)
  const sortBy = params.sortBy
  const sortOrder = params.sortOrder as 'asc' | 'desc' | undefined
  const search = params.search || ''

  const pagination: PaginationState = {
    pageIndex: Math.max(0, page - 1),
    pageSize: Math.min(100, Math.max(1, pageSize))
  }

  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : []

  const columnFilters: Array<{ id: string; value: unknown }> = []

  Object.entries(params).forEach(([key, value]) => {
    if (
      !['page', 'pageSize', 'sortBy', 'sortOrder', 'search'].includes(key) &&
      value
    ) {
      columnFilters.push({ id: key, value })
    }
  })

  return {
    pagination,
    sorting,
    globalFilter: search,
    columnFilters: columnFilters.length > 0 ? columnFilters : undefined
  }
}

export function buildTableQueryString(params: {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  filters?: Record<string, string>
}): string {
  const searchParams = new URLSearchParams()

  if (params.page !== undefined) {
    searchParams.set('page', String(params.page))
  }
  if (params.pageSize !== undefined) {
    searchParams.set('pageSize', String(params.pageSize))
  }
  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy)
  }
  if (params.sortOrder) {
    searchParams.set('sortOrder', params.sortOrder)
  }
  if (params.search) {
    searchParams.set('search', params.search)
  }

  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value)
      }
    })
  }

  return searchParams.toString()
}

export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  delta = 2
): number[] {
  const range: number[] = []
  const rangeWithDots: number[] = []
  let l: number | undefined

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      range.push(i)
    }
  }

  range.forEach(i => {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push(-1)
      }
    }
    rangeWithDots.push(i)
    l = i
  })

  return rangeWithDots
}

export type ColumnDefWithSorting<T> = ColumnDef<T> & {
  enableSorting?: boolean
  enableGlobalFilter?: boolean
}

export function createColumnHelper<T>() {
  return {
    accessor: <TKey extends keyof T>(
      key: TKey,
      options?: Partial<ColumnDefWithSorting<T>>
    ): ColumnDefWithSorting<T> => ({
      id: String(key),
      accessorKey: key,
      enableSorting: true,
      enableGlobalFilter: true,
      ...options
    }),
    display: (
      options: Partial<ColumnDefWithSorting<T>>
    ): ColumnDefWithSorting<T> => ({
      id: options.id || 'actions',
      enableSorting: false,
      enableGlobalFilter: false,
      ...options
    })
  }
}
