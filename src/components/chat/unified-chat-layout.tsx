'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, ReactNode, useState } from 'react'

import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { Loader2, Users } from 'lucide-react'

import { UserAvatar } from '@/components/blocks/user-avatar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useChat } from '@/hooks/use-chat'
import { useInfiniteMessages } from '@/hooks/use-infinite-messages'
import { useUnreadMessages } from '@/hooks/use-unread-messages'
import { uploadAttachmentsAction } from '@/lib/actions/attachment'
import {
  MessageWithSender,
  sendMessageAction,
  editMessageAction,
  deleteMessageAction,
  markMessagesAsReadAction
} from '@/lib/actions/chat'
import { useScrollManagement } from '@/lib/utils/chat'

import { ChatHeader } from './chat-header'
import { ChatInput } from './chat-input'
import { ChatMessage } from './chat-message'
import { FileUploadProgress } from './file-upload-progress'

interface UnifiedChatLayoutProps {
  contextType: 'team' | 'direct' | 'trade'
  contextId: string
  initialMessages: MessageWithSender[]
  currentUserId: number
  currentUser: {
    id: number
    name: string | null
    walletAddress: string
    email: string | null
    avatarPath: string | null
  }
  displayName: string
  displayAvatar?: ReactNode
  onInfoClick?: () => void
  infoTooltip?: string
  teamName?: string
  otherUser?: {
    id: number
    name: string | null
    walletAddress: string
    email: string | null
    avatarPath?: string | null
  }
}

export function UnifiedChatLayout({
  contextType,
  contextId,
  initialMessages,
  currentUserId,
  currentUser,
  displayName,
  displayAvatar,
  onInfoClick,
  infoTooltip: _infoTooltip = 'View details',
  teamName: _teamName,
  otherUser
}: UnifiedChatLayoutProps) {
  const router = useRouter()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const previousScrollHeight = useRef<number>(0)
  const isInitialLoad = useRef(true)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [_uploadedFiles, _setUploadedFiles] = useState<
    Array<{
      name: string
      size: number
      type: string
      url: string
    }>
  >([])

  // Track unread messages
  const { unreadCounts: _unreadCounts, markAsRead: _markAsRead } =
    useUnreadMessages({
      userId: currentUserId,
      contextType,
      contextIds: [contextId]
    })

  const {
    scrollRef,
    shouldAutoScroll: _shouldAutoScroll,
    userHasScrolled: _userHasScrolled,
    handleScroll: handleScrollManagement,
    preserveScroll: _preserveScroll
  } = useScrollManagement({
    enableAutoScroll: false,
    scrollOnNewMessage: false,
    preserveScrollPosition: true
  })

  const {
    isConnected,
    addOptimisticMessage,
    removeOptimisticMessage,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete
  } = useChat({
    contextType,
    contextId,
    initialMessages: []
  })

  const {
    messages,
    isLoading,
    hasMore,
    loadMore,
    addMessage,
    updateMessage,
    deleteMessage,
    searchMessages,
    isSearching,
    searchQuery,
    clearSearch
  } = useInfiniteMessages({
    contextType,
    contextId,
    initialMessages
  })

  // Set up message handlers
  useEffect(() => {
    handleNewMessage(addMessage)
    handleMessageUpdate(updateMessage)
    handleMessageDelete(deleteMessage)
  }, [
    addMessage,
    updateMessage,
    deleteMessage,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete
  ])

  // Only scroll to bottom on initial load or when user sends a message
  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0 && scrollRef.current) {
      // Don't auto-scroll on initial load, preserve user's position
      isInitialLoad.current = false
    }
  }, [messages, scrollRef])

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || searchQuery) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          // Store current scroll position before loading more
          const scrollContainer = scrollRef.current?.parentElement
          const scrollTop = scrollContainer?.scrollTop || 0

          loadMore()

          // Restore scroll position after loading
          setTimeout(() => {
            if (scrollContainer && previousScrollHeight.current) {
              const heightDiff =
                scrollContainer.scrollHeight - previousScrollHeight.current
              scrollContainer.scrollTop = scrollTop + heightDiff
            }
          }, 100)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [hasMore, isLoading, loadMore, searchQuery, scrollRef])

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.senderId !== currentUserId) {
      markMessagesAsReadAction(contextType, contextId, lastMessage.id)
    }
  }, [messages, contextType, contextId, currentUserId])

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'EEEE, MMMM d')
  }

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      handleScrollManagement(e)

      // Store scroll height for infinite scroll preservation
      const element = e.currentTarget
      previousScrollHeight.current = element.scrollHeight
    },
    [handleScrollManagement]
  )

  const handleSendMessage = async (content: string, files?: File[]) => {
    try {
      // Store current scroll position before sending
      const scrollContainer = scrollRef.current?.parentElement
      const wasAtBottom = scrollContainer
        ? scrollContainer.scrollHeight -
            scrollContainer.scrollTop -
            scrollContainer.clientHeight <
          100
        : false

      // If there are files, upload everything first before showing any message
      if (files && files.length > 0) {
        // Upload files and send message with content
        const message = await sendMessageAction(
          contextType,
          contextId,
          content || ''
        )

        if (message) {
          // Upload files
          const formData = new FormData()
          files.forEach(file => formData.append('files', file))
          await uploadAttachmentsAction(message.id, formData)
        }

        router.refresh()
      } else if (content.trim()) {
        // Only show optimistic message if there's text content and no files
        const tempId = `temp-${Date.now()}`
        addOptimisticMessage(tempId, content, currentUserId, currentUser)

        try {
          await sendMessageAction(contextType, contextId, content)
          removeOptimisticMessage(tempId)
          router.refresh()
        } catch (error) {
          removeOptimisticMessage(tempId)
          throw error
        }
      }

      // Only scroll to bottom if user was already at bottom when sending
      if (wasAtBottom && scrollRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
          })
        }, 100)
      }
    } catch (error) {
      throw error
    }
  }

  const handleEditMessage = async (messageId: number, content: string) => {
    await editMessageAction(messageId, content)
  }

  const handleDeleteMessage = async (messageId: number) => {
    await deleteMessageAction(messageId)
  }

  // Default avatar for empty state
  const defaultAvatar =
    displayAvatar ||
    (contextType === 'direct' || contextType === 'trade' ? (
      <UserAvatar
        user={otherUser}
        walletAddress={otherUser?.walletAddress}
        size='lg'
      />
    ) : (
      <Avatar className='h-24 w-24'>
        <AvatarFallback className='bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-semibold text-white'>
          <Users className='h-12 w-12' />
        </AvatarFallback>
      </Avatar>
    ))

  return (
    <div className='relative flex h-full flex-col overflow-hidden bg-white dark:bg-gray-900'>
      {/* Chat Header */}
      <ChatHeader
        contextType={contextType}
        displayName={displayName}
        displayAvatar={displayAvatar}
        isConnected={isConnected}
        onSearchMessages={searchMessages}
        onClearSearch={clearSearch}
        isSearching={isSearching}
        searchQuery={searchQuery}
        onInfoClick={onInfoClick}
        teamId={
          contextType === 'team' ? contextId.replace('team_', '') : undefined
        }
        otherUser={otherUser}
      />

      {/* Scrollable messages area */}
      <div
        className='flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-950'
        onScroll={handleScroll}
      >
        {/* Loading indicator for older messages */}
        {hasMore && !searchQuery && (
          <div ref={loadMoreRef} className='py-4 text-center'>
            {isLoading && (
              <div className='flex items-center justify-center gap-2 text-sm text-gray-500'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Loading older messages...
              </div>
            )}
          </div>
        )}

        {/* Search results header */}
        {searchQuery && (
          <div className='sticky top-0 z-10 border-b bg-yellow-50 px-4 py-2 text-sm text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200'>
            {isSearching ? (
              <span className='flex items-center gap-2'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Searching for "{searchQuery}"...
              </span>
            ) : (
              <span>
                Found {messages.length} result{messages.length !== 1 ? 's' : ''}{' '}
                for "{searchQuery}"
              </span>
            )}
          </div>
        )}

        <div className='px-4 py-4'>
          {messages.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20 text-center'>
              <div className='mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800'>
                {defaultAvatar}
              </div>
              <h3 className='mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100'>
                {contextType === 'team'
                  ? `Welcome to ${displayName}!`
                  : `Start a conversation with ${displayName}`}
              </h3>
              <p className='max-w-sm text-sm text-gray-500 dark:text-gray-400'>
                {contextType === 'team'
                  ? 'This is the beginning of your team conversation.'
                  : 'Send a message to start chatting.'}
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const showDateSeparator =
                  index === 0 ||
                  !isSameDay(
                    new Date(messages[index - 1].createdAt),
                    new Date(message.createdAt)
                  )

                return (
                  <div key={`${message.id}-${message.editedAt || ''}`}>
                    {showDateSeparator && (
                      <div className='my-4 flex items-center justify-center'>
                        <span className='rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'>
                          {getDateLabel(new Date(message.createdAt))}
                        </span>
                      </div>
                    )}
                    <ChatMessage
                      message={message}
                      isOwn={message.senderId === currentUserId}
                      contextType={contextType}
                      currentUserId={currentUserId}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                    />
                  </div>
                )
              })}
            </>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* File upload progress */}
      {pendingFiles.length > 0 && (
        <FileUploadProgress
          files={pendingFiles}
          onUploadComplete={files => {
            _setUploadedFiles(files)
            setPendingFiles([])
          }}
          onRemove={index => {
            setPendingFiles(prev => prev.filter((_, i) => i !== index))
          }}
          onClear={() => setPendingFiles([])}
        />
      )}

      {/* Sticky input at bottom */}
      <div className='sticky bottom-0 z-20 flex-none'>
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={!isConnected}
          onFilesSelected={files => setPendingFiles(files)}
        />
      </div>
    </div>
  )
}
