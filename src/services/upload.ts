import 'server-only'

import crypto from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

import { put } from '@vercel/blob'
import { fileTypeFromBuffer } from 'file-type'

import { uploadConstants } from '@/config/business-constants'
import { getUploadUrl } from '@/lib/utils/upload'

// ============================================
// Types and Interfaces
// ============================================

export interface UploadConfig {
  uploadType:
    | 'attachments'
    | 'avatars'
    | 'payment-proofs'
    | 'domain-transfer-proofs'
    | 'dispute-evidence'
    | string
  subPath?: string
}

export interface ProcessedFile {
  buffer: Buffer
  filename: string
  originalName: string
  mimeType: string
  size: number
  extension: string
  relativePath: string
}

export interface UploadOptions {
  uploadType: keyof typeof uploadConstants.UPLOAD_TYPES
  subPath?: string
  maxFileSize?: number
  allowedTypes?: string[]
  maxFiles?: number
}

export interface UploadResult {
  success: boolean
  urls?: string[]
  error?: string
  details?: ProcessedUpload[]
}

export interface ProcessedUpload {
  url: string
  filename: string
  originalName: string
  mimeType: string
  size: number
}

// ============================================
// Constants
// ============================================

const isVercel = process.env.VERCEL === '1'

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]
const DEFAULT_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]

// ============================================
// Utility Functions
// ============================================

/**
 * Validate an image file
 */
export function validateImageFile(
  file: File,
  maxSize: number = 5 * 1024 * 1024
): { valid: boolean; error?: string } {
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${maxSize / 1024 / 1024}MB`
    }
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'File must be an image (JPEG, PNG, GIF, or WebP)'
    }
  }

  return { valid: true }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ============================================
// Core Upload Functions
// ============================================

/**
 * Process and upload a single file
 */
export async function processUploadedFile(
  file: File,
  config: UploadConfig
): Promise<ProcessedFile> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Detect the actual file type from the buffer
  const fileTypeResult = await fileTypeFromBuffer(buffer)
  const detectedMimeType =
    fileTypeResult?.mime || file.type || 'application/octet-stream'
  const fileExt = fileTypeResult?.ext || file.name.split('.').pop() || 'bin'

  const uniqueId = crypto.randomBytes(8).toString('hex')
  const safeFilename = `${uniqueId}.${fileExt}`

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  const pathSegments = [config.uploadType, String(year), month, day]
  if (config.subPath) {
    pathSegments.push(config.subPath)
  }

  const relativePath = path.join(...pathSegments, safeFilename)

  if (isVercel) {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        'File storage is not configured. BLOB_READ_WRITE_TOKEN is missing. Please contact support.'
      )
    }

    // Use Vercel Blob storage in production
    try {
      const blob = await put(relativePath, buffer, {
        access: 'public',
        contentType: detectedMimeType,
        addRandomSuffix: false
      })

      return {
        buffer,
        filename: safeFilename,
        originalName: file.name,
        mimeType: detectedMimeType,
        size: file.size,
        extension: fileExt,
        relativePath: blob.url // Store the blob URL as relativePath
      }
    } catch (blobError: any) {
      // Handle specific Vercel Blob errors
      if (blobError.message?.includes('Unauthorized')) {
        throw new Error(
          'File storage authentication failed. Please check BLOB_READ_WRITE_TOKEN configuration.'
        )
      }
      if (
        blobError.message?.includes('NetworkError') ||
        blobError.message?.includes('fetch')
      ) {
        throw new Error(
          'Network error while uploading to storage. Please check your connection and try again.'
        )
      }
      // Re-throw with more context
      throw new Error(
        `Failed to upload to storage: ${blobError.message || 'Unknown error'}`
      )
    }
  } else {
    // Use filesystem storage in development
    const uploadsRoot = path.join(process.cwd(), 'uploads', ...pathSegments)
    const fullPath = path.join(uploadsRoot, safeFilename)

    await mkdir(uploadsRoot, { recursive: true })
    await writeFile(fullPath, buffer)

    return {
      buffer,
      filename: safeFilename,
      originalName: file.name,
      mimeType: detectedMimeType,
      size: file.size,
      extension: fileExt,
      relativePath
    }
  }
}

// ============================================
// Upload Service Class
// ============================================

/**
 * Centralized file upload service
 * Handles all file uploads with consistent validation and error handling
 */
export class UploadService {
  /**
   * Process multiple file uploads
   */
  static async uploadFiles(
    files: File[],
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      // Validate files count
      if (!files || files.length === 0) {
        return {
          success: false,
          error: 'No files provided'
        }
      }

      const config = this.getUploadConfig(options.uploadType)
      const maxFiles = options.maxFiles || config.maxFiles
      const maxFileSize = options.maxFileSize || config.maxFileSize
      const allowedTypes = options.allowedTypes || config.allowedTypes

      if (files.length > maxFiles) {
        return {
          success: false,
          error: `Too many files. Maximum ${maxFiles} files allowed`
        }
      }

      // Validate each file
      for (const file of files) {
        const validation = this.validateFile(file, maxFileSize, allowedTypes)
        if (!validation.valid) {
          return {
            success: false,
            error: validation.error
          }
        }
      }

      // Process uploads
      const uploadedFiles: ProcessedUpload[] = []
      const urls: string[] = []

      for (const file of files) {
        try {
          const processedFile = await processUploadedFile(file, {
            uploadType: uploadConstants.UPLOAD_TYPES[
              options.uploadType
            ] as string,
            subPath: options.subPath
          })

          const url = getUploadUrl(processedFile.relativePath)
          urls.push(url)

          uploadedFiles.push({
            url,
            filename: processedFile.filename,
            originalName: processedFile.originalName,
            mimeType: processedFile.mimeType,
            size: processedFile.size
          })
        } catch (uploadError: any) {
          // Check for specific Vercel Blob errors
          if (
            uploadError.message?.includes('BLOB_READ_WRITE_TOKEN') ||
            uploadError.message?.includes('Unauthorized')
          ) {
            return {
              success: false,
              error:
                'File storage is not configured. Please contact support if this issue persists.'
            }
          }

          // Network errors
          if (
            uploadError.message?.includes('fetch') ||
            uploadError.message?.includes('network')
          ) {
            return {
              success: false,
              error:
                'Network error during upload. Please check your connection and try again.'
            }
          }

          // Generic upload error
          return {
            success: false,
            error: `Failed to upload ${file.name}: ${uploadError.message || 'Unknown error'}`
          }
        }
      }

      return {
        success: true,
        urls,
        details: uploadedFiles
      }
    } catch (error: any) {
      console.error('Upload service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to process uploads'
      }
    }
  }

  /**
   * Upload a single file
   */
  static async uploadFile(
    file: File,
    options: UploadOptions
  ): Promise<UploadResult> {
    return this.uploadFiles([file], { ...options, maxFiles: 1 })
  }

  /**
   * Validate a file
   */
  private static validateFile(
    file: File,
    maxFileSize: number,
    allowedTypes: string[]
  ): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > maxFileSize) {
      const sizeMB = (maxFileSize / (1024 * 1024)).toFixed(0)
      return {
        valid: false,
        error: `File "${file.name}" exceeds ${sizeMB}MB limit`
      }
    }

    // Check file type
    const fileType = file.type.toLowerCase()
    if (!allowedTypes.includes(fileType)) {
      const allowedExtensions = allowedTypes
        .map(type => type.split('/')[1])
        .join(', ')
      return {
        valid: false,
        error: `File "${file.name}" must be one of: ${allowedExtensions}`
      }
    }

    return { valid: true }
  }

  /**
   * Get upload configuration for specific upload type
   */
  static getUploadConfig(type: keyof typeof uploadConstants.UPLOAD_TYPES) {
    switch (type) {
      case 'AVATARS':
        return {
          maxFileSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: DEFAULT_IMAGE_TYPES,
          maxFiles: 1
        }
      case 'PAYMENT_PROOFS':
      case 'DOMAIN_TRANSFER_PROOFS':
        return {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: DEFAULT_IMAGE_TYPES,
          maxFiles: 5
        }
      case 'DISPUTE_EVIDENCE':
        return {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: DEFAULT_DOCUMENT_TYPES,
          maxFiles: 10
        }
      case 'ATTACHMENTS':
        return {
          maxFileSize: 25 * 1024 * 1024, // 25MB
          allowedTypes: [
            ...DEFAULT_DOCUMENT_TYPES,
            'application/zip',
            'text/plain',
            'application/json'
          ],
          maxFiles: 5
        }
      default:
        return {
          maxFileSize: DEFAULT_MAX_FILE_SIZE,
          allowedTypes: DEFAULT_IMAGE_TYPES,
          maxFiles: 5
        }
    }
  }

  /**
   * Validate files before upload (client-side helper)
   */
  static validateFiles(
    files: File[],
    options: {
      maxFileSize?: number
      allowedTypes?: string[]
      maxFiles?: number
    }
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check file count
    if (options.maxFiles && files.length > options.maxFiles) {
      errors.push(`Maximum ${options.maxFiles} files allowed`)
    }

    // Check each file
    files.forEach(file => {
      // Check file size
      if (options.maxFileSize && file.size > options.maxFileSize) {
        errors.push(
          `File "${file.name}" exceeds ${formatFileSize(options.maxFileSize)} limit`
        )
      }

      // Check file type
      if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
        errors.push(`File "${file.name}" type not allowed`)
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export const uploadService = UploadService
