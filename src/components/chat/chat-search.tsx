'use client'

import { useEffect, useRef, useState } from 'react'

import { Search, X, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib'

interface ChatSearchProps {
  onSearch: (query: string) => void | Promise<void>
  onClear: () => void
  isSearching: boolean
  searchQuery: string
  className?: string
}

export function ChatSearch({
  onSearch,
  onClear,
  isSearching,
  searchQuery,
  className
}: ChatSearchProps) {
  const [inputValue, setInputValue] = useState(searchQuery)
  const [isOpen, setIsOpen] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  const handleInputChange = (value: string) => {
    setInputValue(value)

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer for debouncing
    debounceTimerRef.current = setTimeout(() => {
      onSearch(value)
    }, 300)
  }

  const handleClear = () => {
    setInputValue('')
    onClear()
    setIsOpen(false)
  }

  const handleOpen = () => {
    setIsOpen(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  if (!isOpen) {
    return (
      <Button
        variant='ghost'
        size='icon'
        onClick={handleOpen}
        className={cn(
          'h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800',
          className
        )}
        title='Search messages'
      >
        <Search className='h-5 w-5 text-gray-600 dark:text-gray-400' />
      </Button>
    )
  }

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      <div className='relative flex-1'>
        <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          placeholder='Search messages...'
          className='h-9 bg-gray-100 pr-9 pl-9 text-sm dark:bg-gray-800'
          onKeyDown={e => {
            if (e.key === 'Escape') {
              handleClear()
            }
          }}
        />
        {isSearching && (
          <Loader2 className='absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400' />
        )}
      </div>
      <Button
        variant='ghost'
        size='icon'
        onClick={handleClear}
        className='h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800'
        title='Close search'
      >
        <X className='h-5 w-5 text-gray-600 dark:text-gray-400' />
      </Button>
    </div>
  )
}
