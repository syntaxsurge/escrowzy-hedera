/**
 * Client-side upload helpers
 * This file contains client-side upload utilities that can be used in React components
 */

import { uploadConstants } from '@/config/business-constants'

export interface ClientUploadOptions {
  uploadType: keyof typeof uploadConstants.UPLOAD_TYPES
  context?: string
  metadata?: Record<string, any>
  onProgress?: (progress: number) => void
  maxRetries?: number
}

export interface ClientUploadResult {
  success: boolean
  urls?: string[]
  files?: Array<{
    url: string
    filename: string
    originalName: string
    mimeType: string
    size: number
  }>
  error?: string
  details?: any
}

/**
 * Client-side upload helper with retry logic and progress tracking
 */
export class UploadClient {
  private static readonly DEFAULT_MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000 // 1 second

  /**
   * Upload files with automatic retry on failure
   */
  static async uploadFiles(
    files: File[],
    options: ClientUploadOptions
  ): Promise<ClientUploadResult> {
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES
    let lastError: string | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add delay before retry (except first attempt)
        if (attempt > 0) {
          await this.delay(this.RETRY_DELAY * attempt)
        }

        const result = await this.performUpload(files, options)

        if (result.success) {
          return result
        }

        // Check if error is retryable
        if (!this.isRetryableError(result.error)) {
          return result
        }

        lastError = result.error
      } catch (error: any) {
        lastError = error.message || 'Upload failed'

        // Don't retry on non-retryable errors
        if (!this.isRetryableError(lastError)) {
          return {
            success: false,
            error: lastError
          }
        }
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError || 'Upload failed after multiple attempts'
    }
  }

  /**
   * Upload a single file
   */
  static async uploadFile(
    file: File,
    options: ClientUploadOptions
  ): Promise<ClientUploadResult> {
    return this.uploadFiles([file], options)
  }

  /**
   * Perform the actual upload
   */
  private static async performUpload(
    files: File[],
    options: ClientUploadOptions
  ): Promise<ClientUploadResult> {
    try {
      const formData = new FormData()

      // Add files
      files.forEach(file => {
        formData.append('files', file)
      })

      // Add upload parameters
      formData.append('uploadType', options.uploadType)
      if (options.context) {
        formData.append('context', options.context)
      }
      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata))
      }

      // Create XHR for progress tracking
      if (options.onProgress) {
        return this.uploadWithProgress(formData, options.onProgress)
      }

      // Use fetch for simple upload
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Upload failed with status ${response.status}`,
          details: data.details
        }
      }

      return {
        success: true,
        urls: data.urls,
        files: data.files
      }
    } catch (error: any) {
      // Network or parsing error
      return {
        success: false,
        error: error.message || 'Network error during upload'
      }
    }
  }

  /**
   * Upload with progress tracking using XMLHttpRequest
   */
  private static uploadWithProgress(
    formData: FormData,
    onProgress: (progress: number) => void
  ): Promise<ClientUploadResult> {
    return new Promise((resolve, _reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', event => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText)

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              success: true,
              urls: data.urls,
              files: data.files
            })
          } else {
            resolve({
              success: false,
              error: data.error || `Upload failed with status ${xhr.status}`,
              details: data.details
            })
          }
        } catch (_error) {
          resolve({
            success: false,
            error: 'Failed to parse server response'
          })
        }
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'Network error during upload'
        })
      })

      xhr.addEventListener('abort', () => {
        resolve({
          success: false,
          error: 'Upload was cancelled'
        })
      })

      // Send request
      xhr.open('POST', '/api/upload')
      xhr.withCredentials = true
      xhr.send(formData)
    })
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error?: string): boolean {
    if (!error) return false

    const retryableErrors = [
      'network',
      'timeout',
      'fetch',
      '502',
      '503',
      '504',
      'gateway',
      'service unavailable'
    ]

    const lowerError = error.toLowerCase()
    return retryableErrors.some(retryable => lowerError.includes(retryable))
  }

  /**
   * Delay helper for retries
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get file size in human-readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Validate files before upload
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
          `File "${file.name}" exceeds ${this.formatFileSize(options.maxFileSize)} limit`
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

export const uploadClient = UploadClient
