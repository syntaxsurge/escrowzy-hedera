import { desc, asc, and, or, ilike, eq, sql, type SQL } from 'drizzle-orm'

import { buildUserSearchCondition } from '@/lib/db/queries/users'

export interface QueryBuilderOptions {
  page: number
  limit: number
  globalFilter?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, string>
  dateFilters?: Record<string, { from?: string; to?: string }>
}

export interface ColumnMappings {
  [key: string]: any
}

export interface QueryResult<_T> {
  data: _T[]
  totalCount: number
  totalPages: number
  currentPage: number
}

/**
 * Centralized database query builder for tables with common filtering patterns
 */
export class DatabaseQueryBuilder {
  private whereConditions: SQL[] = []
  private options: QueryBuilderOptions
  private columnMappings: ColumnMappings
  private globalFilterColumns: any[]
  private defaultSortColumn: any

  constructor(
    options: QueryBuilderOptions,
    columnMappings: ColumnMappings,
    globalFilterColumns: any[] = [],
    defaultSortColumn: any
  ) {
    this.options = options
    this.columnMappings = columnMappings
    this.globalFilterColumns = globalFilterColumns
    this.defaultSortColumn = defaultSortColumn
  }

  /**
   * Add global filter condition
   */
  withGlobalFilter(): this {
    if (this.options.globalFilter && this.globalFilterColumns.length > 0) {
      const conditions = this.globalFilterColumns
        .map(col => ilike(col, `%${this.options.globalFilter!}%`))
        .filter(Boolean)

      if (conditions.length > 1) {
        this.whereConditions.push(
          or(conditions[0]!, conditions[1]!, ...conditions.slice(2)) as SQL
        )
      } else if (conditions.length === 1) {
        this.whereConditions.push(conditions[0]!)
      }
    }
    return this
  }

  /**
   * Add column filters from search params
   */
  withColumnFilters(searchParams: URLSearchParams): this {
    for (const [key, value] of searchParams.entries()) {
      if (
        key.startsWith('filter.') &&
        !key.includes('.from') &&
        !key.includes('.to') &&
        value
      ) {
        const columnKey = key.replace('filter.', '')
        const column = this.columnMappings[columnKey]

        if (column) {
          if (columnKey === 'chainId') {
            this.whereConditions.push(eq(column, parseInt(value)))
          } else if (columnKey === 'user') {
            // Special handling for user search
            const searchCondition = buildUserSearchCondition(value)
            if (searchCondition) {
              this.whereConditions.push(searchCondition)
            }
          } else {
            this.whereConditions.push(ilike(column, `%${value}%`))
          }
        }
      }
    }
    return this
  }

  /**
   * Add date range filters
   */
  withDateFilters(searchParams: URLSearchParams): this {
    for (const [key, value] of searchParams.entries()) {
      if (key.includes('.from') && value) {
        const columnKey = key.replace('filter.', '').replace('.from', '')
        const column = this.columnMappings[columnKey]
        if (column) {
          this.whereConditions.push(sql`${column} >= ${value}`)
        }
      }

      if (key.includes('.to') && value) {
        const columnKey = key.replace('filter.', '').replace('.to', '')
        const column = this.columnMappings[columnKey]
        if (column) {
          this.whereConditions.push(sql`${column} <= ${value}`)
        }
      }
    }
    return this
  }

  /**
   * Add custom condition
   */
  withCustomCondition(condition: SQL): this {
    this.whereConditions.push(condition)
    return this
  }

  /**
   * Get where clause
   */
  getWhereClause(): SQL | undefined {
    return this.whereConditions.length > 0
      ? and(...this.whereConditions)
      : undefined
  }

  /**
   * Get order by clause
   */
  getOrderBy() {
    const sortBy = this.options.sortBy || 'createdAt'
    const sortOrder = this.options.sortOrder || 'desc'

    const column = this.columnMappings[sortBy] || this.defaultSortColumn
    return sortOrder === 'desc' ? desc(column) : asc(column)
  }

  /**
   * Get pagination info
   */
  getPagination() {
    const { page, limit } = this.options
    return {
      limit,
      offset: (page - 1) * limit,
      page
    }
  }

  /**
   * Build complete query parameters
   */
  build() {
    return {
      whereClause: this.getWhereClause(),
      orderBy: this.getOrderBy(),
      ...this.getPagination()
    }
  }

  /**
   * Format query result with pagination metadata
   */
  static formatResult<_T>(
    data: _T[],
    totalCount: number,
    page: number,
    limit: number
  ): QueryResult<_T> {
    return {
      data,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    }
  }
}

/**
 * Extract query options from URL search params
 */
export function extractQueryOptions(
  searchParams: URLSearchParams
): QueryBuilderOptions {
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    globalFilter: searchParams.get('globalFilter') || undefined,
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  }
}
