'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { format } from 'date-fns'
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Check,
  X,
  FileText,
  Download
} from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

import { UserAvatar } from '@/components/blocks/user-avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { appRoutes } from '@/config/app-routes'
import { cn } from '@/lib'
import { MessageWithSender } from '@/lib/actions/chat'
import { isImageFile } from '@/lib/utils/file'

interface FileAttachment {
  name: string
  size: number
  type: string
  url: string
}

interface MessageMetadata {
  attachments?: FileAttachment[]
}

interface ChatMessageProps {
  message: MessageWithSender
  isOwn: boolean
  contextType?: 'team' | 'direct' | 'trade'
  currentUserId?: number
  onEdit?: (messageId: number, content: string) => Promise<void>
  onDelete?: (messageId: number) => Promise<void>
}

export function ChatMessage({
  message,
  isOwn,
  contextType,
  currentUserId,
  onEdit,
  onDelete
}: ChatMessageProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content || '')
  const [isLoading, setIsLoading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const handleEdit = async () => {
    if (!onEdit || !editContent.trim()) return

    setIsLoading(true)
    try {
      await onEdit(message.id, editContent.trim())
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to edit message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    setIsLoading(true)
    try {
      await onDelete(message.id)
    } catch (error) {
      console.error('Failed to delete message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarClick = () => {
    if (contextType === 'team' && currentUserId && !isOwn) {
      const contextId = [currentUserId, message.senderId]
        .sort((a, b) => a - b)
        .join('_')
      router.push(appRoutes.chat.direct(contextId))
    }
  }

  if (message.deletedAt) {
    return (
      <div className={cn('flex gap-2 px-4 py-1', isOwn && 'flex-row-reverse')}>
        {!isOwn && (
          <div
            className={cn(
              'mt-auto shrink-0',
              contextType === 'team' &&
                'cursor-pointer transition-opacity hover:opacity-80'
            )}
            onClick={handleAvatarClick}
          >
            <UserAvatar
              user={message.sender}
              size='sm'
              fallbackClassName='bg-gray-200 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            />
          </div>
        )}
        <div className={cn('max-w-[70%] lg:max-w-[60%]', isOwn && 'ml-auto')}>
          <div
            className={cn(
              'inline-block rounded-2xl px-4 py-2 text-sm italic opacity-60',
              isOwn
                ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            Message deleted
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative flex gap-2 px-4 py-1',
        isOwn && 'flex-row-reverse'
      )}
    >
      {!isOwn && (
        <div
          className={cn(
            'mt-auto shrink-0',
            contextType === 'team' &&
              'cursor-pointer transition-opacity hover:opacity-80'
          )}
          onClick={handleAvatarClick}
        >
          <UserAvatar
            user={message.sender}
            size='sm'
            fallbackClassName='bg-gray-200 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          />
        </div>
      )}

      <div
        className={cn(
          'relative max-w-[70%] lg:max-w-[60%]',
          isOwn && 'ml-auto'
        )}
      >
        {isEditing ? (
          <div className='space-y-2'>
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className='min-h-[60px] resize-none rounded-2xl'
              disabled={isLoading}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEdit()
                }
                if (e.key === 'Escape') {
                  setIsEditing(false)
                  setEditContent(message.content || '')
                }
              }}
            />
            <div className='flex gap-2'>
              <Button
                size='sm'
                onClick={handleEdit}
                disabled={isLoading || !editContent.trim()}
                className='rounded-full'
              >
                <Check className='h-4 w-4' />
              </Button>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(message.content || '')
                }}
                disabled={isLoading}
                className='rounded-full'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>
        ) : (
          <div className='relative'>
            <div
              className={cn(
                'inline-block rounded-2xl px-4 py-2 text-sm break-words whitespace-pre-wrap',
                isOwn
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
              )}
            >
              {message.content}

              {/* Display attachments if present */}
              {(() => {
                const metadata = message.metadata as MessageMetadata | null
                if (metadata?.attachments && metadata.attachments.length > 0) {
                  const imageAttachments = metadata.attachments
                    .map((file, index) => ({ file, index }))
                    .filter(({ file }) => isImageFile(file.type))

                  const nonImageAttachments = metadata.attachments.filter(
                    file => !isImageFile(file.type)
                  )

                  return (
                    <>
                      {/* Image thumbnails */}
                      {imageAttachments.length > 0 && (
                        <div className='mt-2 grid grid-cols-2 gap-2'>
                          {imageAttachments.map(({ file, index }) => (
                            <button
                              key={index}
                              className='group relative overflow-hidden rounded-lg'
                              onClick={() => {
                                const imageIndex = imageAttachments.findIndex(
                                  ({ index: i }) => i === index
                                )
                                setLightboxIndex(imageIndex)
                                setLightboxOpen(true)
                              }}
                            >
                              <img
                                src={file.url}
                                alt={file.name}
                                className='h-32 w-full object-cover transition-transform group-hover:scale-110'
                                loading='lazy'
                              />
                              <div className='absolute inset-0 bg-black/0 transition-all group-hover:bg-black/20' />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Non-image attachments */}
                      {nonImageAttachments.length > 0 && (
                        <div className='mt-2 space-y-1'>
                          {nonImageAttachments.map((file, index) => (
                            <button
                              key={`file-${index}`}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-all',
                                'hover:opacity-80',
                                isOwn
                                  ? 'bg-blue-600/20 hover:bg-blue-600/30'
                                  : 'bg-gray-300/50 hover:bg-gray-300/70 dark:bg-gray-600/50 dark:hover:bg-gray-600/70'
                              )}
                              onClick={() => {
                                // Download non-image files
                                const link = document.createElement('a')
                                link.href = file.url
                                link.download = file.name
                                link.click()
                              }}
                            >
                              <FileText className='h-4 w-4 flex-shrink-0' />
                              <span className='max-w-[200px] flex-1 truncate text-xs'>
                                {file.name}
                              </span>
                              <span className='text-xs opacity-70'>
                                ({(file.size / 1024).toFixed(1)}KB)
                              </span>
                              <Download className='h-3 w-3 opacity-50' />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Lightbox for images */}
                      {imageAttachments.length > 0 && (
                        <Lightbox
                          open={lightboxOpen}
                          close={() => setLightboxOpen(false)}
                          index={lightboxIndex}
                          slides={imageAttachments.map(({ file }) => ({
                            src: file.url,
                            alt: file.name
                          }))}
                        />
                      )}
                    </>
                  )
                }
                return null
              })()}
            </div>

            <div
              className={cn(
                'mt-1 flex items-center gap-1',
                isOwn ? 'justify-end' : 'justify-start'
              )}
            >
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {format(new Date(message.createdAt), 'HH:mm')}
              </span>
              {message.editedAt && (
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  (edited)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {isOwn && !isEditing && (
        <div className='absolute top-2 -left-8 opacity-0 transition-opacity group-hover:opacity-100'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-7 w-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800'
                disabled={isLoading}
              >
                <MoreHorizontal className='h-4 w-4 text-gray-600 dark:text-gray-400' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='rounded-xl'>
              <DropdownMenuItem
                onClick={() => {
                  setIsEditing(true)
                  setEditContent(message.content || '')
                }}
                className='rounded-lg'
              >
                <Edit2 className='mr-2 h-4 w-4' />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className='text-destructive rounded-lg'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
