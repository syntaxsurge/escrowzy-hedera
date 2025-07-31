'use client'

import { useState, useCallback } from 'react'

import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  AlertCircle
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib'
import { handleFormError, handleFormSuccess } from '@/lib/utils/form'
import { formatFileSize } from '@/lib/utils/string'
import { uploadClient } from '@/services/upload-client'

interface FileUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (
    files: Array<{
      name: string
      size: number
      type: string
      url: string
    }>
  ) => void
  contextType: 'trade' | 'dispute'
  contextId: string
  maxFiles?: number
  maxSize?: number // in MB
}

export function FileUploadDialog({
  open,
  onOpenChange,
  onUpload,
  contextType,
  contextId,
  maxFiles = 5,
  maxSize = 10
}: FileUploadDialogProps) {
  const { toast } = useToast()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  )
  const [isUploading, setIsUploading] = useState(false)

  const maxSizeBytes = maxSize * 1024 * 1024

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Filter out files that are too large
      const validFiles = acceptedFiles.filter(file => {
        if (file.size > maxSizeBytes) {
          toast({
            variant: 'destructive',
            title: 'File too large',
            description: `${file.name} exceeds the ${maxSize}MB limit`
          })
          return false
        }
        return true
      })

      // Check total file count
      if (selectedFiles.length + validFiles.length > maxFiles) {
        toast({
          variant: 'destructive',
          title: 'Too many files',
          description: `You can only upload up to ${maxFiles} files`
        })
        return
      }

      setSelectedFiles(prev => [...prev, ...validFiles])
    },
    [selectedFiles, maxFiles, maxSize, maxSizeBytes, toast]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx']
    },
    maxFiles: maxFiles - selectedFiles.length,
    disabled: isUploading
  })

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className='h-4 w-4' />
    }
    if (type === 'application/pdf') {
      return <FileText className='h-4 w-4' />
    }
    return <File className='h-4 w-4' />
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)

    try {
      // Use centralized upload client with progress tracking
      const result = await uploadClient.uploadFiles(selectedFiles, {
        uploadType: 'ATTACHMENTS',
        context: `${contextType}-${contextId}`,
        onProgress: progress => {
          // Update progress for all files
          selectedFiles.forEach(file => {
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }))
          })
        }
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to upload files')
      }

      // Map uploaded files to expected format
      const uploadedFiles =
        result.files?.map(file => ({
          name: file.originalName,
          size: file.size,
          type: file.mimeType,
          url: file.url
        })) || []

      onUpload(uploadedFiles)
      setSelectedFiles([])
      setUploadProgress({})
      onOpenChange(false)

      handleFormSuccess(
        toast,
        `Successfully uploaded ${uploadedFiles.length} file(s)`,
        'Files uploaded'
      )
    } catch (error) {
      handleFormError(error, toast, 'Failed to upload files. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>
            {contextType === 'dispute' ? 'Upload Evidence' : 'Attach Files'}
          </DialogTitle>
          <DialogDescription>
            {contextType === 'dispute'
              ? 'Upload files to support your case in the dispute'
              : 'Share files related to this trade'}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {contextType === 'dispute' && (
            <Alert>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                All uploaded files will be used as evidence and shared with the
                dispute resolver
              </AlertDescription>
            </Alert>
          )}

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'hover:border-primary/50 border-muted-foreground/25',
              isUploading && 'pointer-events-none opacity-50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className='text-muted-foreground mx-auto mb-3 h-10 w-10' />
            {isDragActive ? (
              <p className='text-sm'>Drop the files here...</p>
            ) : (
              <>
                <p className='text-sm'>
                  Drag & drop files here, or click to select
                </p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  Max {maxFiles} files, up to {maxSize}MB each
                </p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  Supported: Images, PDFs, Documents
                </p>
              </>
            )}
          </div>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <ScrollArea className='h-[150px] rounded-md border p-3'>
              <div className='space-y-2'>
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className='bg-muted/50 flex items-center justify-between rounded-md p-2'
                  >
                    <div className='flex items-center gap-2'>
                      {getFileIcon(file.type)}
                      <div className='flex-1'>
                        <p className='text-sm font-medium'>{file.name}</p>
                        <p className='text-muted-foreground text-xs'>
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    {uploadProgress[file.name] !== undefined ? (
                      <div className='w-20'>
                        <Progress value={uploadProgress[file.name]} />
                      </div>
                    ) : (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
