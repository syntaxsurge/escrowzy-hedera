'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

import {
  Bell,
  UserPlus,
  UserX,
  Crown,
  Users,
  CreditCard,
  MessageSquare,
  Package,
  ShoppingCart,
  Swords,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Trophy,
  Sparkles,
  Zap,
  Gift,
  Target,
  Shield,
  ArrowRight,
  Inbox
} from 'lucide-react'
import useSWR from 'swr'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { useUnifiedWalletInfo } from '@/context'
import { useDialogState } from '@/hooks/use-dialog-state'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib'
import { api } from '@/lib/api/http-client'
import { swrConfig, swrFetcher } from '@/lib/api/swr'
import { formatRelativeTime } from '@/lib/utils/string'

// Notification type
interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  notificationType?: string
}

const notificationIcons: Record<string, any> = {
  // Team notifications
  team_invitation: UserPlus,
  team_kicked: UserX,
  team_left: Users,
  team_joined: Users,
  role_updated: Crown,

  // Subscription notifications
  subscription_upgraded: Zap,
  subscription_downgraded: TrendingUp,
  subscription_expired: Shield,
  payment_success: CheckCircle,
  payment_failed: AlertCircle,

  // Trade notifications
  trade_created: ShoppingCart,
  trade_funded: Package,
  trade_delivered: Gift,
  trade_completed: Trophy,
  trade_disputed: AlertCircle,
  trade_refunded: CreditCard,

  // Chat notifications
  new_message: MessageSquare,
  unread_messages: MessageSquare,

  // Battle notifications
  battle_matched: Swords,
  battle_won: Trophy,
  battle_lost: Target,

  // Achievement notifications
  achievement_unlocked: Sparkles,
  level_up: Zap,
  quest_completed: Target,

  // Listing notifications
  listing_accepted: CheckCircle,
  listing_deleted: X,

  // Default
  info: Bell,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle
}

const notificationColors: Record<string, string> = {
  // Team notifications
  team_invitation:
    'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20',
  team_kicked:
    'text-red-600 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20',
  team_left:
    'text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/20 dark:to-gray-800/20',
  team_joined:
    'text-emerald-600 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20',
  role_updated:
    'text-amber-600 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20',

  // Subscription notifications
  subscription_upgraded:
    'text-purple-600 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20',
  subscription_downgraded:
    'text-amber-600 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20',
  subscription_expired:
    'text-red-600 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20',
  payment_success:
    'text-emerald-600 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20',
  payment_failed:
    'text-red-600 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20',

  // Trade notifications
  trade_created:
    'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20',
  trade_funded:
    'text-emerald-600 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20',
  trade_delivered:
    'text-indigo-600 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/20',
  trade_completed:
    'text-green-600 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20',
  trade_disputed:
    'text-red-600 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20',
  trade_refunded:
    'text-amber-600 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20',

  // Chat notifications
  new_message:
    'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20',
  unread_messages:
    'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20',

  // Battle notifications
  battle_matched:
    'text-purple-600 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20',
  battle_won:
    'text-yellow-600 bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/20',
  battle_lost:
    'text-red-600 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20',

  // Achievement notifications
  achievement_unlocked:
    'text-purple-600 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100/50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-purple-800/20',
  level_up:
    'text-yellow-600 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100/50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-yellow-800/20',
  quest_completed:
    'text-green-600 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100/50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-green-800/20',

  // Listing notifications
  listing_accepted:
    'text-emerald-600 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20',
  listing_deleted:
    'text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/20 dark:to-gray-800/20',

  // Default
  info: 'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20',
  success:
    'text-emerald-600 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20',
  warning:
    'text-amber-600 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20',
  error:
    'text-red-600 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20'
}

export function NotificationDropdown() {
  const dropdownState = useDialogState()
  const { isConnected: _isConnected } = useUnifiedWalletInfo()
  const { toast } = useToast()
  const router = useRouter()

  // Use SWR to fetch notifications
  const { data, isLoading, mutate } = useSWR(
    apiEndpoints.notifications.list,
    swrFetcher,
    {
      ...swrConfig,
      refreshInterval: 30000 // Refresh every 30 seconds
    }
  )

  const notifications: Notification[] = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      // Mark as read if unread
      if (!notification.read) {
        try {
          await api.patch(apiEndpoints.notifications.list, {
            notificationId: notification.id
          })
          // Refresh notifications
          mutate()
        } catch (error) {
          console.error('Failed to mark notification as read:', error)
        }
      }

      // Navigate to action URL if provided
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl
      }

      dropdownState.close()
    },
    [mutate, dropdownState]
  )

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.patch(apiEndpoints.notifications.list, {
        markAllRead: true
      })
      mutate()
      toast({
        title: 'Success',
        description: 'All notifications marked as read'
      })
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark notifications as read'
      })
    }
  }, [mutate, toast])

  const handleClearAll = useCallback(async () => {
    try {
      await api.delete(apiEndpoints.notifications.list)
      mutate()
      toast({
        title: 'Success',
        description: 'All notifications cleared'
      })
    } catch (error) {
      console.error('Failed to clear notifications:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear notifications'
      })
    }
  }, [mutate, toast])

  return (
    <DropdownMenu
      open={dropdownState.isOpen}
      onOpenChange={open =>
        open ? dropdownState.open() : dropdownState.close()
      }
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='hover:bg-primary/5 relative h-9 w-9 transition-all duration-200'
          aria-label='Notifications'
        >
          <div className='relative'>
            <Bell className='h-4 w-4 transition-transform hover:scale-110' />
            {unreadCount > 0 && (
              <>
                <span className='absolute -top-[2px] -right-[2px] h-2 w-2 animate-pulse rounded-full bg-red-500' />
                <Badge
                  variant='destructive'
                  className='animate-in zoom-in-50 absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs font-bold duration-300'
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='border-border/50 max-h-[600px] w-[420px] overflow-hidden p-0 shadow-xl'
        align='end'
      >
        <div className='from-primary/10 via-primary/5 to-primary/10 border-border/50 border-b bg-gradient-to-r'>
          <div className='flex items-center justify-between px-4 py-3'>
            <div className='flex items-center gap-2'>
              <div className='relative'>
                <Inbox className='text-primary h-5 w-5' />
                {unreadCount > 0 && (
                  <span className='absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-red-500' />
                )}
              </div>
              <span className='from-primary to-primary/70 bg-gradient-to-r bg-clip-text text-lg font-bold text-transparent'>
                Notifications
              </span>
              {unreadCount > 0 && (
                <Badge
                  variant='secondary'
                  className='ml-1 px-2 py-0 text-xs font-bold'
                >
                  {unreadCount} New
                </Badge>
              )}
            </div>
            {notifications.length > 0 && (
              <div className='flex items-center gap-1'>
                {unreadCount > 0 && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={e => {
                      e.preventDefault()
                      handleMarkAllRead()
                    }}
                    className='hover:bg-primary/10 h-7 px-2 text-xs font-medium transition-colors'
                  >
                    <CheckCircle className='mr-1 h-3 w-3' />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={e => {
                    e.preventDefault()
                    handleClearAll()
                  }}
                  className='hover:bg-destructive/10 hover:text-destructive h-7 px-2 text-xs font-medium transition-colors'
                >
                  <X className='mr-1 h-3 w-3' />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className='h-[420px]'>
          {isLoading ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='relative'>
                <div className='border-primary/20 h-12 w-12 rounded-full border-4' />
                <div className='border-t-primary absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent' />
              </div>
              <p className='text-muted-foreground mt-4 text-sm'>
                Loading notifications...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='relative mb-4'>
                <div className='bg-muted/50 flex h-16 w-16 items-center justify-center rounded-full'>
                  <Sparkles className='text-muted-foreground/50 h-8 w-8' />
                </div>
              </div>
              <p className='text-muted-foreground font-medium'>
                No notifications yet
              </p>
              <p className='text-muted-foreground/70 mt-1 max-w-[250px] text-sm'>
                Your achievements, trades, and team updates will appear here
              </p>
            </div>
          ) : (
            <div className='space-y-2 p-2'>
              {notifications.map(notification => {
                const Icon =
                  notificationIcons[notification.notificationType || 'info'] ||
                  Bell
                const colorClass =
                  notificationColors[notification.notificationType || 'info'] ||
                  'text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/20 dark:to-gray-800/20'

                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] focus:scale-[1.02]',
                      !notification.read &&
                        'bg-primary/5 ring-primary/20 ring-1',
                      'hover:bg-accent/80'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm',
                        colorClass.split(' ').slice(1).join(' ')
                      )}
                    >
                      <Icon
                        className={cn('h-5 w-5', colorClass.split(' ')[0])}
                      />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2'>
                            <span className='line-clamp-1 text-sm font-semibold'>
                              {notification.title}
                            </span>
                            {!notification.read && (
                              <span className='flex h-2 w-2'>
                                <span className='bg-primary absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75' />
                                <span className='bg-primary relative inline-flex h-2 w-2 rounded-full' />
                              </span>
                            )}
                          </div>
                          <p className='text-muted-foreground mt-0.5 line-clamp-2 text-xs'>
                            {notification.message}
                          </p>
                        </div>
                      </div>
                      <div className='text-muted-foreground/60 mt-2 flex items-center gap-1 text-xs'>
                        <Clock className='h-3 w-3' />
                        <span>
                          {formatRelativeTime(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <div className='border-border/50 bg-muted/30 border-t p-3'>
          <Button
            variant='outline'
            size='sm'
            className='group hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-all duration-200'
            onClick={() => {
              dropdownState.close()
              router.push(appRoutes.dashboard.notifications)
            }}
          >
            <span className='flex items-center gap-2'>
              View all notifications
              <ArrowRight className='h-3 w-3 transition-transform group-hover:translate-x-1' />
            </span>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
