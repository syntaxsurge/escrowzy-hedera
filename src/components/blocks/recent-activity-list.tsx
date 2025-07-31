import { cn } from '@/lib'
import { ActivityType } from '@/lib/db/schema'
import { formatRelativeTime } from '@/lib/utils/string'
import { getUserDisplayName } from '@/lib/utils/user'
import {
  ACTIVITY_COLORS,
  formatActivityType,
  getActivityIcon
} from '@/types/activity-log'
import { type ActivityLogWithUser } from '@/types/database'

interface RecentActivityListProps {
  activities: ActivityLogWithUser[]
}

export function RecentActivityList({ activities }: RecentActivityListProps) {
  return (
    <div className='space-y-3'>
      {activities.map(activity => {
        const Icon = getActivityIcon(activity.action as ActivityType)
        const colorClass =
          ACTIVITY_COLORS[activity.action as ActivityType] ||
          'text-gray-600 bg-gray-50 dark:bg-gray-900/30'

        return (
          <div
            key={activity.id}
            className='flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/30'
          >
            <div className='flex items-center gap-3'>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  colorClass.split(' ').slice(1).join(' ')
                )}
              >
                <Icon className={cn('h-5 w-5', colorClass.split(' ')[0])} />
              </div>
              <div>
                <p className='text-sm font-medium'>
                  {formatActivityType(activity.action as ActivityType)}
                </p>
                {activity.user && (
                  <p className='text-muted-foreground text-xs'>
                    {getUserDisplayName(activity.user)}
                  </p>
                )}
              </div>
            </div>
            <span className='text-muted-foreground text-xs'>
              {formatRelativeTime(activity.timestamp)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
