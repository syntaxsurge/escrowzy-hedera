'use client'

import { useEffect, useRef, useState } from 'react'

import {
  Send,
  Paperclip,
  AlertCircle,
  Shield,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  X
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { useChat } from '@/hooks/use-chat'
import { useInfiniteMessages } from '@/hooks/use-infinite-messages'
import { useMessageNotifications } from '@/hooks/use-message-notifications'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib'
import {
  sendMessageAction,
  markMessagesAsReadAction,
  MessageWithSender
} from '@/lib/actions/chat'
import { handleFormError } from '@/lib/utils/form'
import { getUserAvatar, getUserDisplayName } from '@/lib/utils/user'
import type { TradeWithUsers } from '@/types/trade'

import { ChatMessage } from './chat-message'
import { FileUploadDialog } from './file-upload-dialog'
import { TypingIndicator } from './typing-indicator'

interface TradeChatProps {
  trade: TradeWithUsers
  currentUserId: number
  className?: string
  showHeader?: boolean
}

export function TradeChat({
  trade,
  currentUserId,
  className,
  showHeader = true
}: TradeChatProps) {
  const { toast } = useToast()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<
    Array<{ name: string; size: number; type: string; url: string }>
  >([])
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const contextType = 'trade'
  const contextId = `trade_${trade.id}`

  const isBuyer = currentUserId === trade.buyerId
  const otherParty = isBuyer ? trade.seller : trade.buyer

  // Set up message notifications
  const { markChatActive, markChatInactive } = useMessageNotifications({
    userId: currentUserId,
    enabled: true
  })

  // Use infinite scrolling for messages
  const {
    messages,
    isLoading,
    hasMore,
    loadMore,
    addMessage,
    updateMessage: _updateInfiniteMessage,
    deleteMessage: _deleteMessage
  } = useInfiniteMessages({
    contextType: 'direct', // We'll use direct type for now since trade isn't supported yet
    contextId,
    initialMessages: []
  })

  // Set up real-time updates
  const {
    isConnected,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete
  } = useChat({
    contextType,
    contextId,
    initialMessages: []
  })

  // Custom handlers for real-time events
  useEffect(() => {
    handleNewMessage((_newMessage: MessageWithSender) => {
      // Message will be added through the hook
    })

    handleMessageUpdate((_updatedMessage: MessageWithSender) => {
      // Message will be updated through the hook
    })

    handleMessageDelete((_messageId: number) => {
      // Message will be deleted through the hook
    })
  }, [handleNewMessage, handleMessageUpdate, handleMessageDelete])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  // Mark chat as active when component mounts
  useEffect(() => {
    markChatActive(contextType, contextId)
    return () => {
      markChatInactive(contextType, contextId)
    }
  }, [contextType, contextId, markChatActive, markChatInactive])

  // Mark messages as read when viewing
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.senderId !== currentUserId) {
        markMessagesAsReadAction(contextType, contextId, lastMessage.id)
      }
    }
  }, [messages, contextType, contextId, currentUserId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!message.trim() && pendingFiles.length === 0) return

    const messageContent = message.trim()
    setMessage('')
    setIsSending(true)

    try {
      const newMessage = await sendMessageAction(
        'trade' as any, // Cast to any for now since trade type isn't in the action yet
        contextId,
        messageContent,
        pendingFiles.length > 0 ? pendingFiles : undefined
      )

      // Add the message to the list
      if (newMessage) {
        addMessage(newMessage)
      }

      setPendingFiles([])
    } catch (error) {
      setMessage(messageContent) // Restore message on error
      handleFormError(error, toast, 'Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileUpload = (files: typeof pendingFiles) => {
    setPendingFiles(files)
    setUploadDialogOpen(false)
  }

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Typing indicator logic
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
      // Send typing indicator event via Pusher (to be implemented)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      // Send stop typing event via Pusher (to be implemented)
    }, 3000)
  }

  return (
    <Card className={cn('flex h-[600px] flex-col', className)}>
      {showHeader && (
        <>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <MessageSquare className='h-5 w-5' />
                <CardTitle>Trade Chat</CardTitle>
              </div>
              <div className='flex items-center gap-2'>
                {trade.status === 'disputed' && (
                  <Badge variant='destructive' className='gap-1'>
                    <Shield className='h-3 w-3' />
                    Dispute Mode
                  </Badge>
                )}
                <Badge variant={isConnected ? 'success' : 'secondary'}>
                  {isConnected ? 'Connected' : 'Offline'}
                </Badge>
              </div>
            </div>
            {trade.status === 'disputed' && (
              <Alert className='mt-3'>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>
                  All messages and files shared here will be used as evidence in
                  dispute resolution
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <Separator />
        </>
      )}

      <ScrollArea
        ref={scrollAreaRef}
        className='flex-1 p-4'
        onScroll={e => {
          const target = e.target as HTMLDivElement
          if (target.scrollTop === 0 && hasMore && !isLoading) {
            loadMore()
          }
        }}
      >
        {isLoading ? (
          <div className='flex justify-center py-8'>
            <Spinner size='md' />
          </div>
        ) : messages.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12'>
            <MessageSquare className='text-muted-foreground mb-4 h-12 w-12' />
            <p className='text-muted-foreground text-center'>
              No messages yet. Start the conversation!
            </p>
            {trade.status === 'disputed' && (
              <p className='text-muted-foreground mt-2 text-center text-sm'>
                Remember to provide clear evidence for your case
              </p>
            )}
          </div>
        ) : (
          <div className='space-y-4'>
            {messages.map(msg => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === currentUserId}
                currentUserId={currentUserId}
                contextType='direct'
              />
            ))}
            {isTyping && (
              <TypingIndicator
                userName={getUserDisplayName(otherParty)}
                avatarUrl={getUserAvatar(otherParty)}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* Pending files display */}
      {pendingFiles.length > 0 && (
        <div className='border-t p-3'>
          <div className='flex flex-wrap gap-2'>
            {pendingFiles.map((file, index) => (
              <Badge
                key={index}
                variant='secondary'
                className='flex items-center gap-1'
              >
                {file.type.startsWith('image/') ? (
                  <ImageIcon className='h-3 w-3' />
                ) : (
                  <FileText className='h-3 w-3' />
                )}
                <span className='max-w-[100px] truncate text-xs'>
                  {file.name}
                </span>
                <button
                  onClick={() => removePendingFile(index)}
                  className='hover:text-destructive ml-1'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Message input */}
      <div className='flex gap-2 p-4'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => setUploadDialogOpen(true)}
          disabled={isSending || trade.status === 'completed'}
          title='Attach evidence'
        >
          <Paperclip className='h-4 w-4' />
        </Button>
        <Input
          value={message}
          onChange={e => {
            setMessage(e.target.value)
            handleTyping()
          }}
          onKeyPress={handleKeyPress}
          placeholder={
            trade.status === 'disputed'
              ? 'Provide evidence or explanation...'
              : 'Type a message...'
          }
          disabled={isSending || trade.status === 'completed'}
          className='flex-1'
        />
        <Button
          onClick={handleSendMessage}
          disabled={
            (!message.trim() && pendingFiles.length === 0) ||
            isSending ||
            trade.status === 'completed'
          }
        >
          {isSending ? (
            <Spinner size='sm' className='h-4 w-4' />
          ) : (
            <Send className='h-4 w-4' />
          )}
        </Button>
      </div>

      {/* File upload dialog */}
      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={handleFileUpload}
        contextType='trade'
        contextId={contextId}
      />
    </Card>
  )
}
