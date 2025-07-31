'use client'

import { useState, useCallback } from 'react'

import { X, File, Image, FileText, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib'

interface UploadingFile {
  id: string
  name: string
  size: number
  type: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  url?: string
  error?: string
}

interface FileUploadProgressProps {
  files: File[]
  onUploadComplete: (
    uploadedFiles: Array<{
      name: string
      size: number
      type: string
      url: string
    }>
  ) => void
  onRemove: (index: number) => void
  onClear: () => void
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
  className?: string
}

export function FileUploadProgress({
  files,
  onUploadComplete,
  onRemove,
  onClear,
  maxFileSize: _maxFileSize = 10,
  acceptedTypes: _acceptedTypes = [
    'image/*',
    'application/pdf',
    '.doc',
    '.docx',
    '.txt'
  ],
  className
}: FileUploadProgressProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className='h-4 w-4' />
    if (type === 'application/pdf') return <FileText className='h-4 w-4' />
    return <File className='h-4 w-4' />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const simulateUpload = useCallback(
    async (file: File): Promise<UploadingFile> => {
      const fileId = `${file.name}-${Date.now()}`

      // Create initial file object
      const uploadingFile: UploadingFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'uploading'
      }

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))

        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? {
                  ...f,
                  progress,
                  status: progress === 100 ? 'completed' : 'uploading'
                }
              : f
          )
        )
      }

      // In real implementation, this would be the actual upload URL
      const uploadedUrl = URL.createObjectURL(file)

      return {
        ...uploadingFile,
        progress: 100,
        status: 'completed',
        url: uploadedUrl
      }
    },
    []
  )

  const handleUpload = useCallback(async () => {
    if (files.length === 0 || isUploading) return

    setIsUploading(true)

    // Initialize uploading files
    const initialFiles: UploadingFile[] = files.map(file => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'pending' as const
    }))

    setUploadingFiles(initialFiles)

    try {
      // Upload files in parallel
      const uploadPromises = files.map(file => simulateUpload(file))
      const uploadedFiles = await Promise.all(uploadPromises)

      // Extract successful uploads
      const successfulUploads = uploadedFiles
        .filter(f => f.status === 'completed' && f.url)
        .map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          url: f.url!
        }))

      onUploadComplete(successfulUploads)
      onClear()
      setUploadingFiles([])
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadingFiles(prev =>
        prev.map(f => ({
          ...f,
          status: 'error',
          error: 'Upload failed'
        }))
      )
    } finally {
      setIsUploading(false)
    }
  }, [files, isUploading, simulateUpload, onUploadComplete, onClear])

  if (files.length === 0 && uploadingFiles.length === 0) {
    return null
  }

  return (
    <div className={cn('bg-muted/30 border-t p-3', className)}>
      <div className='space-y-2'>
        {/* Pending files */}
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className='bg-background flex items-center justify-between rounded-lg p-2'
          >
            <div className='flex items-center gap-2'>
              {getFileIcon(file.type)}
              <div>
                <p className='text-sm font-medium'>{file.name}</p>
                <p className='text-muted-foreground text-xs'>
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <Button
              size='icon'
              variant='ghost'
              className='h-8 w-8'
              onClick={() => onRemove(index)}
              disabled={isUploading}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        ))}

        {/* Uploading files */}
        {uploadingFiles.map(file => (
          <div key={file.id} className='bg-background space-y-1 rounded-lg p-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                {file.status === 'uploading' ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  getFileIcon(file.type)
                )}
                <div>
                  <p className='text-sm font-medium'>{file.name}</p>
                  <p className='text-muted-foreground text-xs'>
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              {file.status === 'completed' && (
                <Badge variant='success' className='text-xs'>
                  Uploaded
                </Badge>
              )}
              {file.status === 'error' && (
                <Badge variant='destructive' className='text-xs'>
                  Failed
                </Badge>
              )}
            </div>
            {file.status === 'uploading' && (
              <Progress value={file.progress} className='h-1' />
            )}
            {file.error && (
              <p className='text-destructive text-xs'>{file.error}</p>
            )}
          </div>
        ))}
      </div>

      {/* Upload button */}
      {files.length > 0 && !isUploading && (
        <div className='mt-3 flex justify-end gap-2'>
          <Button size='sm' variant='outline' onClick={onClear}>
            Clear All
          </Button>
          <Button size='sm' onClick={handleUpload} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Uploading...
              </>
            ) : (
              `Upload ${files.length} file${files.length > 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
