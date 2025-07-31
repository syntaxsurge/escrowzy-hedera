import { LucideIcon } from 'lucide-react'

import { cn } from '@/lib'

export interface ContractTab {
  id: string
  label: string
  icon: LucideIcon
}

interface ContractTabsProps {
  tabs: ContractTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function ContractTabs({
  tabs,
  activeTab,
  onTabChange,
  className
}: ContractTabsProps) {
  return (
    <div className={cn('border-border border-b', className)}>
      <nav className='-mb-px flex space-x-8'>
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'border-b-2 px-1 py-2 text-sm font-medium',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-muted-foreground hover:border-muted-foreground hover:text-foreground border-transparent'
              )}
            >
              <Icon className='mr-2 inline h-4 w-4' />
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
