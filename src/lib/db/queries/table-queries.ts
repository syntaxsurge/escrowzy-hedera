import { SQL, and, asc, desc, ilike, or, sql, eq } from 'drizzle-orm'

import { type TableRequest, type TableResponse } from '@/lib/table/table'

import { db } from '../drizzle'

export type { TableRequest, TableResponse }

export interface TableQueryOptions<T> {
  table: any
  request: TableRequest
  searchColumns?: Array<keyof T>
  filterHandlers?: Record<string, (value: any) => SQL | null | undefined>
  baseConditions?: SQL[]
  customOrderBy?: SQL[]
}

export async function executeTableQuery<T extends Record<string, any>>({
  table,
  request,
  searchColumns = [],
  filterHandlers = {},
  baseConditions = [],
  customOrderBy
}: TableQueryOptions<T>): Promise<TableResponse<T>> {
  const { pagination, sorting, globalFilter, columnFilters } = request
  const { pageIndex, pageSize } = pagination

  const conditions: SQL[] = [...baseConditions]

  if (globalFilter && searchColumns.length > 0) {
    const searchConditions = searchColumns.map(column =>
      ilike(table[column as string], `%${globalFilter}%`)
    )
    conditions.push(or(...searchConditions)!)
  }

  if (columnFilters) {
    columnFilters.forEach(filter => {
      if (filterHandlers[filter.id]) {
        const condition = filterHandlers[filter.id](filter.value)
        if (condition) {
          conditions.push(condition)
        }
      } else if (table[filter.id]) {
        conditions.push(eq(table[filter.id], filter.value))
      }
    })
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const orderByClause: SQL[] = customOrderBy || []
  if (!customOrderBy && sorting.length > 0) {
    sorting.forEach(sort => {
      if (table[sort.id]) {
        orderByClause.push(
          sort.desc ? desc(table[sort.id]) : asc(table[sort.id])
        )
      }
    })
  }

  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(whereClause)
      .then(res => res[0]?.count || 0),
    db
      .select()
      .from(table)
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(pageIndex * pageSize)
  ])

  const totalCount = Number(countResult)
  const pageCount = Math.ceil(totalCount / pageSize)

  return {
    data: data as T[],
    pageCount,
    totalCount
  }
}

export function createDateRangeFilter(column: any) {
  return (value: string | undefined | null) => {
    if (!value || typeof value !== 'string') return null

    try {
      const dates = value.split(',')
      if (dates.length === 2) {
        const [start, end] = dates
        return and(
          sql`${column} >= ${new Date(start)}`,
          sql`${column} <= ${new Date(end)}`
        )
      }
      return sql`DATE(${column}) = DATE(${new Date(value)})`
    } catch {
      return null
    }
  }
}

export function createEnumFilter<T extends string>(
  column: any,
  validValues: T[]
) {
  return (value: string | undefined | null) => {
    if (
      !value ||
      typeof value !== 'string' ||
      !validValues.includes(value as T)
    )
      return null
    return eq(column, value)
  }
}

export function createNumberRangeFilter(column: any) {
  return (value: string | undefined | null) => {
    if (!value || typeof value !== 'string') return null

    const [min, max] = value.split(',').map(Number)
    if (!isNaN(min) && !isNaN(max)) {
      return and(sql`${column} >= ${min}`, sql`${column} <= ${max}`)
    }
    if (!isNaN(min)) {
      return sql`${column} >= ${min}`
    }
    return null
  }
}
