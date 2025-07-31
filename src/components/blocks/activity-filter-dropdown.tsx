'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import {
  Filter,
  BarChart3,
  Shield,
  CreditCard,
  ChevronDown
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'

interface ActivityFilterDropdownProps {
  className?: string
}

const filters = [
  { id: 'all', label: 'All Activity', icon: BarChart3 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'team', label: 'Team', icon: Filter },
  { id: 'billing', label: 'Billing', icon: CreditCard }
]

export function ActivityFilterDropdown({
  className
}: ActivityFilterDropdownProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedFilter = searchParams.get('filter') || 'all'
  const [isPending, startTransition] = useTransition()

  const selectedFilterObj =
    filters.find(f => f.id === selectedFilter) || filters[0]
  const SelectedIcon = selectedFilterObj.icon

  const handleFilterChange = (filterId: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      if (filterId === 'all') {
        params.delete('filter')
      } else {
        params.set('filter', filterId)
      }
      router.push(`?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Filter className='text-muted-foreground h-5 w-5' />
      <span className='text-muted-foreground text-sm'>Filter by:</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            disabled={isPending}
            className='gap-2'
          >
            {isPending ? (
              <Spinner size='sm' />
            ) : (
              <SelectedIcon className='h-4 w-4' />
            )}
            {selectedFilterObj.label}
            <ChevronDown className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-[180px]'>
          {filters.map(filter => {
            const Icon = filter.icon
            return (
              <DropdownMenuItem
                key={filter.id}
                onClick={() => handleFilterChange(filter.id)}
                disabled={isPending}
                className='gap-2'
              >
                <Icon className='h-4 w-4' />
                {filter.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
