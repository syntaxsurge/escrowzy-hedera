'use client'

import { useState, useRef, KeyboardEvent } from 'react'

import { Send, Paperclip, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'

interface ChatInputProps {
  onSendMessage: (content: string, files?: File[]) => Promise<void>
  disabled?: boolean
  placeholder?: string
  onFilesSelected?: (files: File[]) => void
}

export function ChatInput({
  onSendMessage,
  disabled,
  placeholder = 'Type a message...',
  onFilesSelected
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    const content = message.trim()

    // Prevent sending if there's no content and no files
    if (!content && selectedFiles.length === 0) return
    if (isLoading) return

    setIsLoading(true)

    try {
      await onSendMessage(content, selectedFiles)
      setMessage('')
      setSelectedFiles([])
      textareaRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Only send if there's content or files
      const content = message.trim()
      if (content || selectedFiles.length > 0) {
        handleSend()
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const files = Array.from(e.target.files)
    const safeFiles = files.filter(file => {
      // Allow only safe file types
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'image/avif',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      return allowedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024 // 10MB limit
    })

    if (safeFiles.length < files.length) {
      alert(
        'Some files were rejected. Only images, PDFs, and documents under 10MB are allowed.'
      )
    }

    const newFiles = [...selectedFiles, ...safeFiles]
    setSelectedFiles(newFiles)

    // Notify parent component if callback is provided
    if (onFilesSelected) {
      onFilesSelected(newFiles)
    }

    // Reset input
    if (e.target) {
      e.target.value = ''
    }
  }

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)

    // Notify parent component if callback is provided
    if (onFilesSelected) {
      onFilesSelected(newFiles)
    }
  }

  return (
    <div className='border-t bg-white dark:bg-gray-900'>
      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className='border-b bg-gray-50 p-3 dark:bg-gray-950'>
          <div className='flex flex-wrap gap-2'>
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className='relative flex items-center gap-2 overflow-hidden rounded-lg bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-800'
              >
                <Paperclip className='h-3 w-3' />
                <span className='max-w-[150px] truncate'>{file.name}</span>

                <button
                  onClick={() => removeFile(index)}
                  className='ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  disabled={isLoading}
                >
                  <X className='h-3 w-3' />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='p-3'>
        <div className='flex items-end gap-2'>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type='file'
            multiple
            accept='image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx'
            onChange={handleFileSelect}
            className='hidden'
          />

          {/* Attachment button */}
          <div className='flex gap-1 pb-1'>
            <Button
              variant='ghost'
              size='icon'
              className='h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800'
              disabled={disabled || isLoading}
              onClick={() => fileInputRef.current?.click()}
              title='Attach files'
            >
              <Paperclip className='h-5 w-5 text-gray-600 dark:text-gray-400' />
            </Button>
          </div>

          {/* Input field with modern styling */}
          <div className='relative flex-1'>
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                'max-h-32 min-h-[40px] resize-none rounded-2xl bg-gray-100 dark:bg-gray-800',
                'px-4 py-2.5 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400',
                'border-0 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
                'transition-all duration-200'
              )}
              disabled={disabled || isLoading}
              rows={1}
            />
          </div>

          {/* Send button */}
          <div className='pb-1'>
            <Button
              onClick={handleSend}
              disabled={
                (!message.trim() && selectedFiles.length === 0) ||
                isLoading ||
                disabled
              }
              size='icon'
              className='h-9 w-9 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500'
              title='Send message'
            >
              <Send className={cn('h-5 w-5', isLoading && 'animate-pulse')} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
