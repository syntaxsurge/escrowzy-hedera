'use client'

import * as React from 'react'

import { type Table } from '@tanstack/react-table'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { getPaginationRange } from '@/lib/table/table'

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  totalCount?: number
  pageSizeOptions?: number[]
  showPageSizeSelector?: boolean
  showPageInfo?: boolean
}

export function DataTablePagination<TData>({
  table,
  totalCount,
  pageSizeOptions = [10, 20, 30, 40, 50],
  showPageSizeSelector = true,
  showPageInfo = true
}: DataTablePaginationProps<TData>) {
  const pageCount = table.getPageCount()
  const currentPage = table.getState().pagination.pageIndex + 1
  const pageSize = table.getState().pagination.pageSize

  const paginationRange = getPaginationRange(currentPage, pageCount)

  return (
    <div className='flex items-center justify-between px-2 py-4'>
      <div className='flex items-center gap-6'>
        {showPageInfo && totalCount !== undefined && (
          <div className='text-muted-foreground text-sm'>
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to{' '}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{' '}
            results
          </div>
        )}

        {showPageSizeSelector && (
          <div className='flex items-center gap-2'>
            <p className='text-sm font-medium'>Rows per page</p>
            <Select
              value={String(pageSize)}
              onValueChange={value => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className='h-8 w-[70px]'>
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent side='top'>
                {pageSizeOptions.map(size => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className='flex items-center gap-2'>
        <Button
          variant='outline'
          size='icon'
          className='h-8 w-8'
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <span className='sr-only'>Go to first page</span>
          <ChevronsLeft className='h-4 w-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          className='h-8 w-8'
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <span className='sr-only'>Go to previous page</span>
          <ChevronLeft className='h-4 w-4' />
        </Button>

        <div className='flex items-center gap-1'>
          {paginationRange.map((pageNumber, index) => {
            if (pageNumber === -1) {
              return (
                <span
                  key={`dots-${index}`}
                  className='text-muted-foreground px-1'
                >
                  ...
                </span>
              )
            }

            return (
              <Button
                key={pageNumber}
                variant={pageNumber === currentPage ? 'default' : 'outline'}
                size='icon'
                className='h-8 w-8'
                onClick={() => table.setPageIndex(pageNumber - 1)}
              >
                {pageNumber}
              </Button>
            )
          })}
        </div>

        <Button
          variant='outline'
          size='icon'
          className='h-8 w-8'
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <span className='sr-only'>Go to next page</span>
          <ChevronRight className='h-4 w-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          className='h-8 w-8'
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
        >
          <span className='sr-only'>Go to last page</span>
          <ChevronsRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}
