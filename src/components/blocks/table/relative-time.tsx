import { cn } from '@/lib'
import { formatDate } from '@/lib/utils/string'

interface RelativeTimeProps {
  date: Date | string
  className?: string
  showFullDate?: boolean
}

export function RelativeTime({
  date,
  className,
  showFullDate = true
}: RelativeTimeProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className='text-sm'>{formatDate(date, 'relative')}</span>
      {showFullDate && (
        <span className='text-muted-foreground text-xs'>
          {formatDate(date, 'full')}
        </span>
      )}
    </div>
  )
}
