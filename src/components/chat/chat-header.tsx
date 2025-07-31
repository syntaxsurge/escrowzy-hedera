'use client'

import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

import { Users, Info } from 'lucide-react'

import { UserAvatar } from '@/components/blocks/user-avatar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { appRoutes } from '@/config/app-routes'
import { cn } from '@/lib'

import { ChatSearch } from './chat-search'

interface ChatHeaderProps {
  contextType: 'team' | 'direct' | 'trade'
  displayName: string
  displayAvatar?: ReactNode
  isConnected: boolean
  onSearchMessages: (query: string) => Promise<void>
  onClearSearch: () => void
  isSearching: boolean
  searchQuery: string
  onInfoClick?: () => void
  teamId?: string
  otherUser?: {
    id: number
    name: string | null
    walletAddress: string
    email: string | null
    avatarPath?: string | null
  }
  tradeStatus?: string
}

export function ChatHeader({
  contextType,
  displayName,
  displayAvatar,
  isConnected,
  onSearchMessages,
  onClearSearch,
  isSearching,
  searchQuery,
  onInfoClick,
  teamId,
  otherUser,
  tradeStatus
}: ChatHeaderProps) {
  const router = useRouter()

  // Default avatar based on context type
  const defaultAvatar =
    displayAvatar ||
    (contextType === 'direct' || contextType === 'trade' ? (
      <UserAvatar
        user={otherUser}
        walletAddress={otherUser?.walletAddress}
        size='md'
      />
    ) : (
      <Avatar className='h-10 w-10'>
        <AvatarFallback className='bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white'>
          <Users className='h-5 w-5' />
        </AvatarFallback>
      </Avatar>
    ))

  // Handle info button click based on context type
  const handleInfoClick = () => {
    if (onInfoClick) {
      onInfoClick()
    } else if (contextType === 'team' && teamId) {
      router.push(
        appRoutes.withParams.teamId(appRoutes.dashboard.settings.team, teamId)
      )
    }
  }

  // Get status badge for trades
  const getTradeStatusBadge = () => {
    if (contextType !== 'trade' || !tradeStatus) return null

    const statusColors: Record<string, string> = {
      created: 'default',
      awaiting_deposit: 'secondary',
      funded: 'warning',
      payment_sent: 'warning',
      payment_confirmed: 'warning',
      delivered: 'warning',
      confirmed: 'success',
      disputed: 'destructive',
      completed: 'success',
      cancelled: 'secondary',
      refunded: 'secondary'
    }

    return (
      <Badge variant={statusColors[tradeStatus] as any} className='text-xs'>
        {tradeStatus.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className='sticky top-0 z-20 flex-none border-b bg-white px-4 py-3 shadow-sm dark:bg-gray-900'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='relative'>
            {defaultAvatar}
            <div
              className={cn(
                'absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-white',
                isConnected ? 'bg-green-500' : 'bg-gray-400',
                'dark:border-gray-900'
              )}
            />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                {displayName}
              </h2>
              {getTradeStatusBadge()}
            </div>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              {isConnected ? 'Active now' : 'Connecting...'}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-1'>
          {/* Search button */}
          <ChatSearch
            onSearch={onSearchMessages}
            onClear={onClearSearch}
            isSearching={isSearching}
            searchQuery={searchQuery}
          />

          {/* Info button */}
          {(onInfoClick || contextType === 'team') && (
            <Button
              variant='ghost'
              size='icon'
              className='h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800'
              onClick={handleInfoClick}
              title={
                contextType === 'team'
                  ? 'Team settings'
                  : contextType === 'trade'
                    ? 'Trade details'
                    : 'Chat info'
              }
            >
              <Info className='h-5 w-5 text-gray-600 dark:text-gray-400' />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
