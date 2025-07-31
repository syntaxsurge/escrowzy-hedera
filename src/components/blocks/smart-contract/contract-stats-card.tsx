import { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib'

export interface StatItem {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  trend?: {
    value: string | number
    label: string
    isPositive?: boolean
  }
}

interface ContractStatsCardProps {
  stats: StatItem[]
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function ContractStatsCard({
  stats,
  columns = 3,
  className
}: ContractStatsCardProps) {
  const gridCols = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div
      className={cn(`grid grid-cols-1 gap-4 ${gridCols[columns]}`, className)}
    >
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className='pb-2'>
            <CardTitle className='text-muted-foreground text-sm font-medium'>
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stat.value}</div>
            {stat.subtitle && (
              <div className='text-muted-foreground text-sm'>
                {stat.subtitle}
              </div>
            )}
            {stat.trend && (
              <div
                className={cn(
                  'flex items-center gap-1 text-sm',
                  stat.trend.isPositive ? 'text-green-600' : 'text-orange-600'
                )}
              >
                {stat.icon && <stat.icon className='h-3 w-3' />}
                <span>
                  {stat.trend.value} {stat.trend.label}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
