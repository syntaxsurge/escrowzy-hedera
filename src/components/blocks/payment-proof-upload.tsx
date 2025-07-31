'use client'

import Image from 'next/image'
import { useState, useCallback } from 'react'

import { Upload, X, Image as ImageIcon, Check, AlertCircle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib'

interface PaymentProofUploadProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  maxFileSize?: number // in bytes
  className?: string
  disabled?: boolean
  required?: boolean
  label?: string
  description?: string
}

export function PaymentProofUpload({
  onFilesSelected,
  maxFiles = 3,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  className,
  disabled = false,
  required = false,
  label = 'Upload Payment Proof',
  description = 'Click to upload or drag and drop'
}: PaymentProofUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles)
      setError(null)

      // Validate file count
      if (files.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      // Validate each file
      const validFiles: File[] = []
      const newPreviews: string[] = []

      for (const file of fileArray) {
        // Check file type
        if (!file.type.startsWith('image/')) {
          setError(`${file.name} is not an image`)
          continue
        }

        // Check file size
        if (file.size > maxFileSize) {
          setError(
            `${file.name} exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`
          )
          continue
        }

        validFiles.push(file)

        // Create preview
        const reader = new FileReader()
        reader.onloadend = () => {
          newPreviews.push(reader.result as string)
          if (newPreviews.length === validFiles.length) {
            setPreviews(prev => [...prev, ...newPreviews])
          }
        }
        reader.readAsDataURL(file)
      }

      if (validFiles.length > 0) {
        const updatedFiles = [...files, ...validFiles]
        setFiles(updatedFiles)
        onFilesSelected(updatedFiles)
      }
    },
    [files, maxFiles, maxFileSize, onFilesSelected]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const droppedFiles = e.dataTransfer.files
      handleFiles(droppedFiles)
    },
    [disabled, handleFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files)
      }
    },
    [handleFiles]
  )

  const removeFile = useCallback(
    (index: number) => {
      const updatedFiles = files.filter((_, i) => i !== index)
      const updatedPreviews = previews.filter((_, i) => i !== index)
      setFiles(updatedFiles)
      setPreviews(updatedPreviews)
      onFilesSelected(updatedFiles)
      setError(null)
    },
    [files, previews, onFilesSelected]
  )

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors',
          isDragging && 'border-primary bg-primary/5',
          disabled && 'cursor-not-allowed opacity-50',
          !disabled && 'hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className='p-8'>
          <input
            type='file'
            id='payment-proof-upload'
            className='hidden'
            multiple
            accept='image/*'
            onChange={handleFileInput}
            disabled={disabled || files.length >= maxFiles}
          />
          <label
            htmlFor='payment-proof-upload'
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center space-y-3',
              disabled && 'cursor-not-allowed'
            )}
          >
            <div className='bg-primary/10 rounded-full p-4'>
              <Upload className='text-primary h-8 w-8' />
            </div>
            <div className='text-center'>
              <p className='font-medium'>
                {files.length === 0
                  ? label
                  : files.length < maxFiles
                    ? 'Add More Screenshots'
                    : 'Maximum files reached'}
              </p>
              <p className='text-muted-foreground mt-1 text-sm'>
                {description}
              </p>
              <p className='text-muted-foreground mt-2 text-xs'>
                {required && 'Required • '}
                Max {maxFiles} images • {Math.round(maxFileSize / 1024 / 1024)}
                MB each
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {files.map((file, index) => (
            <Card key={index} className='relative overflow-hidden'>
              <CardContent className='p-0'>
                {/* Image Preview */}
                <div className='bg-muted relative aspect-video'>
                  {previews[index] ? (
                    <Image
                      src={previews[index]}
                      alt={file.name}
                      fill
                      className='object-cover'
                    />
                  ) : (
                    <div className='flex h-full items-center justify-center'>
                      <ImageIcon className='text-muted-foreground h-8 w-8' />
                    </div>
                  )}

                  {/* Remove Button */}
                  <Button
                    variant='destructive'
                    size='icon'
                    className='absolute top-2 right-2 h-6 w-6'
                    onClick={() => removeFile(index)}
                    disabled={disabled}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>

                {/* File Info */}
                <div className='space-y-1 p-3'>
                  <p className='truncate text-sm font-medium'>{file.name}</p>
                  <p className='text-muted-foreground text-xs'>
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Progress Indicator (if needed) */}
      {files.length > 0 && (
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>
            {files.length} of {maxFiles} files selected
          </span>
          {files.length === maxFiles && (
            <span className='flex items-center gap-1 text-green-600'>
              <Check className='h-4 w-4' />
              Ready to upload
            </span>
          )}
        </div>
      )}
    </div>
  )
}
