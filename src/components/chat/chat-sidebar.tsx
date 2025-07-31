'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'

import { Users, Search, MessageSquare, ArrowLeftRight } from 'lucide-react'

import { UserAvatar } from '@/components/blocks/user-avatar'
import { navigationProgress } from '@/components/providers/navigation-progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { pusherChannels } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { cn } from '@/lib'
import { Team, User } from '@/lib/db/schema'
import { pusherClient } from '@/lib/pusher'
import {
  useRealtimeUnreadBadges,
  useRealtimeConversationList
} from '@/lib/utils/chat'

import { TeamMembersList } from './team-members-list'

interface ChatSidebarProps {
  teams: (Team & { unreadCount?: number })[]
  directMessageUsers: (Pick<
    User,
    'id' | 'name' | 'walletAddress' | 'email' | 'avatarPath'
  > & {
    unreadCount?: number
  })[]
  trades?: {
    id: number
    buyerId: number
    sellerId: number
    amount: string
    currency: string
    status: string
    createdAt: Date
    otherParty: Pick<
      User,
      'id' | 'name' | 'walletAddress' | 'email' | 'avatarPath'
    >
    unreadCount?: number
  }[]
  currentUserId: number
  currentContextType?: 'team' | 'direct' | 'trade'
  currentContextId?: string
}

export function ChatSidebar({
  teams: initialTeams,
  directMessageUsers: initialDirectMessageUsers,
  trades: initialTrades = [],
  currentUserId,
  currentContextType,
  currentContextId
}: ChatSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get the tab from URL parameters or default to 'all'
  const tabParam = searchParams.get('tab') as
    | 'all'
    | 'team'
    | 'dm'
    | 'trades'
    | null
  const defaultTab =
    tabParam && ['all', 'team', 'dm', 'trades'].includes(tabParam)
      ? tabParam
      : 'all'

  const [activeTab, setActiveTab] = useState<'all' | 'team' | 'dm' | 'trades'>(
    defaultTab
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [teams, _setTeams] = useState(initialTeams)
  const [directMessageUsers, setDirectMessageUsers] = useState(
    initialDirectMessageUsers
  )
  const [trades, _setTrades] = useState(initialTrades)

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam && ['all', 'team', 'dm', 'trades'].includes(tabParam)) {
      setActiveTab(tabParam as 'all' | 'team' | 'dm' | 'trades')
    }
  }, [tabParam])

  // Real-time unread badges
  const {
    unreadMessages: _unreadMessages,
    markAsRead,
    subscribeToUnreadUpdates,
    getUnreadCount
  } = useRealtimeUnreadBadges(currentUserId)

  // Real-time conversation list updates
  const {
    newConversations: _newConversations,
    subscribeToNewConversations,
    hasNewConversation
  } = useRealtimeConversationList()

  const handleTeamClick = (teamId: number) => {
    navigationProgress.start()
    const contextId = `team_${teamId}`
    markAsRead('team', contextId)
    router.push(appRoutes.chat.team(teamId.toString()))
  }

  const handleDirectMessageClick = (userId: number) => {
    navigationProgress.start()
    const contextId = [currentUserId, userId].sort((a, b) => a - b).join('_')
    markAsRead('direct', `dm_${contextId}`)
    router.push(appRoutes.chat.direct(contextId))
  }

  const handleTradeClick = (tradeId: number) => {
    navigationProgress.start()
    const contextId = `trade_${tradeId}`
    markAsRead('trade', contextId)
    router.push(appRoutes.chat.trades(tradeId.toString()))
  }

  // Memoize filtered results
  const filteredTeams = useMemo(
    () =>
      teams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [teams, searchQuery]
  )

  const filteredUsers = useMemo(
    () =>
      directMessageUsers.filter(user => {
        const name = user.name || user.walletAddress
        return name.toLowerCase().includes(searchQuery.toLowerCase())
      }),
    [directMessageUsers, searchQuery]
  )

  const filteredTrades = useMemo(
    () =>
      trades.filter(trade => {
        const name = trade.otherParty.name || trade.otherParty.walletAddress
        const searchTerm = searchQuery.toLowerCase()
        return (
          name.toLowerCase().includes(searchTerm) ||
          trade.currency.toLowerCase().includes(searchTerm) ||
          trade.amount.includes(searchTerm) ||
          `#${trade.id}`.includes(searchTerm)
        )
      }),
    [trades, searchQuery]
  )

  // Subscribe to real-time updates
  useEffect(() => {
    if (!pusherClient) return

    // Subscribe to unread updates for all teams and DMs
    const channels: string[] = []

    teams.forEach(team => {
      channels.push(`chat-team-team_${team.id}`)
    })

    directMessageUsers.forEach(user => {
      const contextId = [currentUserId, user.id].sort((a, b) => a - b).join('_')
      channels.push(`chat-direct-dm_${contextId}`)
    })

    const unsubscribe = subscribeToUnreadUpdates(channels)

    // Subscribe to new conversation notifications
    const unsubConversations = subscribeToNewConversations(currentUserId)

    // Listen for new DM conversations
    const userChannel = pusherClient.subscribe(
      pusherChannels.user(currentUserId)
    )

    userChannel.bind('new-dm-conversation', (data: { user: any }) => {
      setDirectMessageUsers(prev => {
        const exists = prev.some(u => u.id === data.user.id)
        if (!exists) {
          return [...prev, data.user]
        }
        return prev
      })
    })

    // Mark current conversation as read
    if (currentContextType && currentContextId) {
      markAsRead(currentContextType, currentContextId)
    }

    return () => {
      unsubscribe?.()
      unsubConversations?.()
      if (pusherClient) {
        userChannel.unbind_all()
        pusherClient.unsubscribe(pusherChannels.user(currentUserId))
      }
    }
  }, [
    currentUserId,
    teams,
    directMessageUsers,
    currentContextType,
    currentContextId,
    subscribeToUnreadUpdates,
    subscribeToNewConversations,
    markAsRead
  ])

  // Combine all chats for "all" tab with real-time unread counts
  const allChats = useMemo(
    () =>
      [
        ...filteredTeams.map(team => {
          const contextId = `team_${team.id}`
          const realtimeUnread = getUnreadCount('team', contextId)
          return {
            type: 'team' as const,
            data: team,
            id: team.id,
            name: team.name,
            unreadCount: realtimeUnread || team.unreadCount || 0,
            isNew: hasNewConversation('team', contextId)
          }
        }),
        ...filteredUsers.map(user => {
          const contextId = `dm_${[currentUserId, user.id].sort((a, b) => a - b).join('_')}`
          const realtimeUnread = getUnreadCount('direct', contextId)
          return {
            type: 'user' as const,
            data: user,
            id: user.id,
            name:
              user.name ||
              `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`,
            unreadCount: realtimeUnread || user.unreadCount || 0,
            isNew: hasNewConversation('direct', contextId)
          }
        }),
        ...filteredTrades.map(trade => {
          const contextId = `trade_${trade.id}`
          const realtimeUnread = getUnreadCount('trade', contextId)
          return {
            type: 'trade' as const,
            data: trade,
            id: trade.id,
            name: `Trade #${trade.id}`,
            subtitle: `${trade.amount} ${trade.currency} • ${trade.status.replace('_', ' ')}`,
            otherParty: trade.otherParty,
            unreadCount: realtimeUnread || trade.unreadCount || 0,
            isNew: hasNewConversation('trade', contextId)
          }
        })
      ].sort((a, b) => {
        // New conversations first
        if (a.isNew && !b.isNew) return -1
        if (!a.isNew && b.isNew) return 1
        // Then by unread count
        return (b.unreadCount || 0) - (a.unreadCount || 0)
      }),
    [
      filteredTeams,
      filteredUsers,
      filteredTrades,
      getUnreadCount,
      hasNewConversation,
      currentUserId
    ]
  )

  // Centralized component for rendering unread badge
  const UnreadBadge = ({ count }: { count?: number }) => {
    if (!count || count <= 0) return null
    return (
      <div className='bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium'>
        {count > 9 ? '9+' : count}
      </div>
    )
  }

  // Centralized component for team icon
  const TeamIcon = () => (
    <div className='bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full'>
      <Users className='text-primary h-6 w-6' />
    </div>
  )

  // Centralized chat item renderer
  const ChatItem = ({
    chat,
    isActive,
    onClick
  }: {
    chat: any
    isActive: boolean
    onClick: () => void
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'hover:bg-muted/50 flex w-full items-center gap-3 rounded-xl p-3 transition-colors',
        isActive && 'bg-muted'
      )}
    >
      <div className='relative'>
        {chat.type === 'team' ? (
          <TeamIcon />
        ) : chat.type === 'trade' ? (
          <UserAvatar
            user={chat.otherParty || chat.data.otherParty}
            walletAddress={
              (chat.otherParty || chat.data.otherParty)?.walletAddress
            }
            size='lg'
            fallbackClassName='text-sm'
          />
        ) : (
          <UserAvatar
            user={chat.data}
            walletAddress={chat.data?.walletAddress}
            size='lg'
            fallbackClassName='text-sm'
          />
        )}
        <UnreadBadge count={chat.unreadCount} />
      </div>
      <div className='flex-1'>
        <div className='flex items-center justify-between'>
          <div className='flex-1 text-left'>
            <p className='text-sm font-medium'>{chat.name}</p>
            <p className='text-muted-foreground truncate text-xs'>
              {chat.type === 'team'
                ? 'Team chat'
                : chat.type === 'trade'
                  ? chat.subtitle || `Trade chat`
                  : 'Click to start chatting'}
            </p>
          </div>
          {chat.type === 'team' && (
            <MessageSquare className='text-muted-foreground h-4 w-4' />
          )}
          {chat.type === 'trade' && (
            <ArrowLeftRight className='text-muted-foreground h-4 w-4' />
          )}
        </div>
      </div>
    </button>
  )

  return (
    <div className='bg-background flex h-full flex-col'>
      {/* Header */}
      <div className='border-b px-4 py-4'>
        <div className='mb-4'>
          <h1 className='text-2xl font-bold'>Messages</h1>
        </div>

        {/* Search */}
        <div className='relative'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
          <Input
            placeholder='Search people'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='bg-muted/50 h-9 rounded-full border-0 pl-9'
          />
        </div>
      </div>

      {/* Tabs */}
      <div className='flex gap-2 border-b px-4 py-2'>
        <Button
          variant={activeTab === 'all' ? 'secondary' : 'ghost'}
          size='sm'
          className='rounded-full'
          onClick={() => setActiveTab('all')}
        >
          All
        </Button>
        <Button
          variant={activeTab === 'team' ? 'secondary' : 'ghost'}
          size='sm'
          className='rounded-full'
          onClick={() => setActiveTab('team')}
        >
          Team
        </Button>
        <Button
          variant={activeTab === 'dm' ? 'secondary' : 'ghost'}
          size='sm'
          className='rounded-full'
          onClick={() => setActiveTab('dm')}
        >
          DM
        </Button>
        <Button
          variant={activeTab === 'trades' ? 'secondary' : 'ghost'}
          size='sm'
          className='rounded-full'
          onClick={() => setActiveTab('trades')}
        >
          Trades
        </Button>
      </div>

      {/* Chat list */}
      <ScrollArea className='flex-1'>
        <div className='p-2'>
          {activeTab === 'all' && (
            <>
              {allChats.length === 0 ? (
                <p className='text-muted-foreground py-8 text-center text-sm'>
                  No conversations yet
                </p>
              ) : (
                allChats.map(chat => {
                  const isActive =
                    chat.type === 'team'
                      ? currentContextType === 'team' &&
                        currentContextId === `team_${chat.id}`
                      : chat.type === 'trade'
                        ? currentContextType === 'trade' &&
                          currentContextId === `trade_${chat.id}`
                        : currentContextType === 'direct' &&
                          currentContextId?.includes(chat.id.toString())

                  return (
                    <ChatItem
                      key={`${chat.type}-${chat.id}`}
                      chat={chat}
                      isActive={!!isActive}
                      onClick={() =>
                        chat.type === 'team'
                          ? handleTeamClick(chat.id)
                          : chat.type === 'trade'
                            ? handleTradeClick(chat.id)
                            : handleDirectMessageClick(chat.id)
                      }
                    />
                  )
                })
              )}
            </>
          )}

          {activeTab === 'team' && (
            <>
              {filteredTeams.length === 0 ? (
                <p className='text-muted-foreground py-8 text-center text-sm'>
                  No teams found
                </p>
              ) : (
                filteredTeams.map(team => {
                  const isActive =
                    currentContextType === 'team' &&
                    currentContextId === `team_${team.id}`
                  const contextId = `team_${team.id}`
                  const realtimeUnread = getUnreadCount('team', contextId)
                  return (
                    <div key={team.id} className='mb-2'>
                      <ChatItem
                        chat={{
                          type: 'team',
                          data: team,
                          id: team.id,
                          name: team.name,
                          unreadCount: realtimeUnread || team.unreadCount || 0
                        }}
                        isActive={isActive}
                        onClick={() => handleTeamClick(team.id)}
                      />
                      <TeamMembersList
                        teamId={team.id}
                        currentUserId={currentUserId}
                        onMemberClick={handleDirectMessageClick}
                      />
                    </div>
                  )
                })
              )}
            </>
          )}

          {activeTab === 'dm' && (
            <>
              {filteredUsers.length === 0 ? (
                <p className='text-muted-foreground py-8 text-center text-sm'>
                  No direct messages
                </p>
              ) : (
                filteredUsers.map(user => {
                  const isActive =
                    currentContextType === 'direct' &&
                    currentContextId?.includes(user.id.toString())
                  const contextId = `dm_${[currentUserId, user.id].sort((a, b) => a - b).join('_')}`
                  const realtimeUnread = getUnreadCount('direct', contextId)

                  return (
                    <ChatItem
                      key={user.id}
                      chat={{
                        type: 'user',
                        data: user,
                        id: user.id,
                        name:
                          user.name ||
                          `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`,
                        unreadCount: realtimeUnread || user.unreadCount || 0
                      }}
                      isActive={!!isActive}
                      onClick={() => handleDirectMessageClick(user.id)}
                    />
                  )
                })
              )}
            </>
          )}

          {activeTab === 'trades' && (
            <>
              {filteredTrades.length === 0 ? (
                <p className='text-muted-foreground py-8 text-center text-sm'>
                  No active trades
                </p>
              ) : (
                filteredTrades.map(trade => {
                  const isActive =
                    currentContextType === 'trade' &&
                    currentContextId === `trade_${trade.id}`
                  const contextId = `trade_${trade.id}`
                  const realtimeUnread = getUnreadCount('trade', contextId)
                  const otherPartyName =
                    trade.otherParty.name ||
                    `${trade.otherParty.walletAddress.slice(0, 6)}...${trade.otherParty.walletAddress.slice(-4)}`

                  return (
                    <ChatItem
                      key={trade.id}
                      chat={{
                        type: 'trade',
                        data: trade,
                        id: trade.id,
                        name: `Trade #${trade.id} with ${otherPartyName}`,
                        subtitle: `${trade.amount} ${trade.currency} • ${trade.status.replace('_', ' ')}`,
                        otherParty: trade.otherParty,
                        unreadCount: realtimeUnread || trade.unreadCount || 0
                      }}
                      isActive={isActive}
                      onClick={() => handleTradeClick(trade.id)}
                    />
                  )
                })
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
