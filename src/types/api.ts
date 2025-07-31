// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  status?: number
}

export interface ApiError {
  success: false
  error: string
  message?: string
  statusCode?: number
}

export interface ApiSuccess<T = any> {
  success: true
  data: T
  message?: string
}

// Pagination Types
export interface PaginationParams {
  page?: number
  limit?: number
  pageSize?: number // Alternative to limit
  search?: string
  orderBy?: string
  sortBy?: string // Alternative to orderBy
  orderDirection?: 'asc' | 'desc'
  sortOrder?: 'asc' | 'desc' // Alternative to orderDirection
}

export interface PaginationMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

// Standard Route Parameters
export interface StandardRouteParams {
  params?: Record<string, string>
  searchParams?: Record<string, string | string[]>
}

// Request Types
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  cache?: RequestCache
  next?: NextFetchRequestConfig
}

// Common Query Parameters
export interface TableQueryParams extends PaginationParams {
  filters?: Record<string, any>
}

// Bulk Operations
export interface BulkOperationResult {
  success: boolean
  processedCount: number
  failedCount: number
  errors?: Array<{
    id: string | number
    error: string
  }>
}
