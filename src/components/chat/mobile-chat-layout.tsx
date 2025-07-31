'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { Menu, X, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { appRoutes } from '@/config/app-routes'
import { cn } from '@/lib'
import { Team, User } from '@/lib/db/schema'

import { ChatSidebar } from './chat-sidebar'

interface MobileChatLayoutProps {
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
  children: React.ReactNode
}

export function MobileChatLayout({
  teams,
  directMessageUsers,
  trades = [],
  currentUserId,
  children
}: MobileChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Check if we're on a chat conversation page
  const isInConversation = pathname !== appRoutes.chat.base
  const shouldHideSidebarOnMobile = isInConversation && !sidebarOpen

  // Extract current context from pathname
  let currentContextType: 'team' | 'direct' | 'trade' | undefined
  let currentContextId: string | undefined

  if (pathname.includes(`${appRoutes.chat.base}/team/`)) {
    currentContextType = 'team'
    const teamId = pathname.split(`${appRoutes.chat.base}/team/`)[1]
    currentContextId = `team_${teamId}`
  } else if (pathname.includes(`${appRoutes.chat.base}/direct/`)) {
    currentContextType = 'direct'
    const contextId = pathname.split(`${appRoutes.chat.base}/direct/`)[1]
    currentContextId = `dm_${contextId}`
  } else if (pathname.includes(`${appRoutes.chat.base}/trades/`)) {
    currentContextType = 'trade'
    const tradeId = pathname.split(`${appRoutes.chat.base}/trades/`)[1]
    currentContextId = `trade_${tradeId}`
  }

  return (
    <div className='bg-background relative flex h-[calc(100vh-4rem)]'>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/50 lg:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 lg:relative lg:z-0',
          'w-80 lg:w-72 xl:w-80',
          'transform transition-transform duration-300 ease-in-out lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          shouldHideSidebarOnMobile && 'hidden lg:block'
        )}
      >
        <div className='bg-card h-full border-r'>
          {/* Mobile close button */}
          <div className='absolute top-4 right-4 z-10 lg:hidden'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setSidebarOpen(false)}
              className='h-8 w-8'
            >
              <X className='h-5 w-5' />
            </Button>
          </div>

          <ChatSidebar
            teams={teams}
            directMessageUsers={directMessageUsers}
            trades={trades}
            currentUserId={currentUserId}
            currentContextType={currentContextType}
            currentContextId={currentContextId}
          />
        </div>
      </div>

      {/* Main content */}
      <div className='flex min-w-0 flex-1 flex-col'>
        {/* Mobile header for chat pages */}
        {isInConversation && (
          <div className='bg-card flex items-center gap-3 border-b px-4 py-3 lg:hidden'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => window.history.back()}
              className='-ml-2 h-8 w-8'
            >
              <ArrowLeft className='h-5 w-5' />
            </Button>
            <div className='min-w-0 flex-1'>
              <h2 className='truncate text-base font-semibold'>Chat</h2>
            </div>
          </div>
        )}

        {/* Mobile menu button for chat list */}
        {!isInConversation && (
          <div className='bg-card flex items-center border-b px-4 py-3 lg:hidden'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setSidebarOpen(true)}
              className='-ml-2 h-8 w-8'
            >
              <Menu className='h-5 w-5' />
            </Button>
            <h1 className='ml-3 text-lg font-semibold'>Messages</h1>
          </div>
        )}

        <div className='flex-1 overflow-hidden'>{children}</div>
      </div>
    </div>
  )
}
