'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useToast } from '@/hooks/use-toast'
import {
  MessageWithSender,
  getMessagesAction,
  searchMessagesAction
} from '@/lib/actions/chat'

interface UseInfiniteMessagesProps {
  contextType: 'team' | 'direct' | 'trade'
  contextId: string
  initialMessages: MessageWithSender[]
}

interface UseInfiniteMessagesReturn {
  messages: MessageWithSender[]
  isLoading: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  addMessage: (message: MessageWithSender) => void
  updateMessage: (message: MessageWithSender) => void
  deleteMessage: (messageId: number) => void
  searchMessages: (query: string) => Promise<void>
  isSearching: boolean
  searchQuery: string
  clearSearch: () => void
}

export function useInfiniteMessages({
  contextType,
  contextId,
  initialMessages
}: UseInfiniteMessagesProps): UseInfiniteMessagesReturn {
  const [messages, setMessages] = useState<MessageWithSender[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<number | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MessageWithSender[]>([])
  const loadingRef = useRef(false)
  const { toast } = useToast()

  // Initialize cursor with the oldest message ID
  useEffect(() => {
    if (initialMessages.length > 0 && !cursor) {
      setCursor(initialMessages[0].id)
    }
  }, [initialMessages, cursor])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || !cursor) return

    loadingRef.current = true
    setIsLoading(true)

    try {
      const result = await getMessagesAction(contextType, contextId, {
        cursor,
        direction: 'before',
        limit: 30
      })

      if (result.messages.length > 0) {
        setMessages(prev => [...result.messages, ...prev])
        setCursor(result.messages[0].id)
      }

      setHasMore(result.hasMore)
    } catch (error) {
      console.error('Failed to load more messages:', error)
      toast({
        title: 'Error',
        description: 'Failed to load more messages',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [contextType, contextId, cursor, hasMore, toast])

  const addMessage = useCallback((message: MessageWithSender) => {
    setMessages(prev => [...prev, message])
  }, [])

  const updateMessage = useCallback((updatedMessage: MessageWithSender) => {
    setMessages(prev =>
      prev.map(msg => (msg.id === updatedMessage.id ? updatedMessage : msg))
    )
  }, [])

  const deleteMessage = useCallback((messageId: number) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId))
  }, [])

  const searchMessages = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        clearSearch()
        return
      }

      setIsSearching(true)
      setSearchQuery(query)

      try {
        const result = await searchMessagesAction(contextType, contextId, query)
        setSearchResults(result.messages)
      } catch (error) {
        console.error('Failed to search messages:', error)
        toast({
          title: 'Error',
          description: 'Failed to search messages',
          variant: 'destructive'
        })
      } finally {
        setIsSearching(false)
      }
    },
    [contextType, contextId, toast]
  )

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
  }, [])

  // Return search results if searching, otherwise return normal messages
  const displayMessages = searchQuery ? searchResults : messages

  return {
    messages: displayMessages,
    isLoading,
    hasMore: searchQuery ? false : hasMore, // Disable infinite scroll during search
    loadMore,
    addMessage,
    updateMessage,
    deleteMessage,
    searchMessages,
    isSearching,
    searchQuery,
    clearSearch
  }
}
