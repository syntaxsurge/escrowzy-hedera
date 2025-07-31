'use client'

import * as React from 'react'

import {
  type ColumnDef,
  type Table as TableType,
  flexRender
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'

import { SearchInput } from '@/components/blocks/table/search-input'
import { LoadingSpinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib'

interface DataTableProps<TData> {
  table: TableType<TData>
  columns: ColumnDef<TData>[]
  isLoading?: boolean
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  showGlobalFilter?: boolean
  emptyMessage?: string
  className?: string
}

export function DataTable<TData>({
  table,
  columns,
  isLoading = false,
  globalFilter,
  onGlobalFilterChange,
  showGlobalFilter = true,
  emptyMessage = 'No results found.',
  className
}: DataTableProps<TData>) {
  return (
    <div className={cn('space-y-4', className)}>
      {showGlobalFilter && onGlobalFilterChange && (
        <SearchInput
          value={globalFilter || ''}
          onChange={onGlobalFilterChange}
          className='max-w-sm'
          showButton={true}
        />
      )}

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const canSort = header.column.getCanSort()
                  const isSorted = header.column.getIsSorted()

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center gap-2',
                            canSort && 'cursor-pointer select-none'
                          )}
                          onClick={
                            canSort
                              ? header.column.getToggleSortingHandler()
                              : undefined
                          }
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className='ml-auto'>
                              {isSorted === 'desc' ? (
                                <ChevronDown className='h-4 w-4' />
                              ) : isSorted === 'asc' ? (
                                <ChevronUp className='h-4 w-4' />
                              ) : (
                                <ChevronsUpDown className='text-muted-foreground h-4 w-4' />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  <div className='flex items-center justify-center'>
                    <LoadingSpinner label='Loading data...' />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
