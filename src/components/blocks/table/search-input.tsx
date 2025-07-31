'use client'

import { useCallback, useEffect, useState } from 'react'

import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib'

interface SearchInputProps {
  placeholder?: string
  value?: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  showButton?: boolean
}

export function SearchInput({
  placeholder = 'Search...',
  value = '',
  onChange,
  className,
  disabled = false,
  showButton = true
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    // No automatic search - only search on Enter or button click
  }, [])

  const handleSearch = useCallback(() => {
    onChange(localValue)
  }, [localValue, onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSearch()
      }
    },
    [handleSearch]
  )

  if (!showButton) {
    return (
      <Input
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn('w-full pr-2 pl-3', className)}
        disabled={disabled}
      />
    )
  }

  return (
    <div className={cn('flex w-full items-center gap-2', className)}>
      <div className='relative flex-1'>
        <Input
          placeholder={placeholder}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className='w-full pr-2 pl-3'
          disabled={disabled}
        />
      </div>
      <Button
        onClick={handleSearch}
        size='icon'
        variant='outline'
        disabled={disabled}
        className='h-10 w-10'
        type='button'
      >
        <Search className='h-4 w-4' />
        <span className='sr-only'>Search</span>
      </Button>
    </div>
  )
}
