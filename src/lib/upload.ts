import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export type UploadType = 'payment-proof' | 'dispute-evidence'

interface UploadConfig {
  type: UploadType
  tradeId: number
  maxFileSize?: number // in bytes, default 10MB
  allowedTypes?: string[] // MIME types, default images only
}

interface UploadResult {
  success: boolean
  images?: string[]
  error?: string
}

export async function uploadTradeFiles(
  files: File[],
  config: UploadConfig
): Promise<UploadResult> {
  const {
    type,
    tradeId,
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/']
  } = config

  if (!files || files.length === 0) {
    return {
      success: false,
      error: 'No files provided'
    }
  }

  const uploadedImages: string[] = []

  try {
    // Create upload directory - Note: Using root uploads folder, not public
    const uploadDir = path.join(process.cwd(), 'uploads', type)
    await mkdir(uploadDir, { recursive: true })

    for (const file of files) {
      if (!file || typeof file === 'string') continue

      // Validate file type
      const isAllowedType = allowedTypes.some(type =>
        file.type.startsWith(type)
      )
      if (!isAllowedType) {
        return {
          success: false,
          error: `Only ${allowedTypes.join(', ')} files are allowed`
        }
      }

      // Validate file size
      if (file.size > maxFileSize) {
        return {
          success: false,
          error: `File size must be less than ${maxFileSize / (1024 * 1024)}MB`
        }
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Create unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const extension = file.name.split('.').pop()
      const prefix = type === 'payment-proof' ? 'payment' : 'dispute'
      const filename = `${prefix}_${tradeId}_${timestamp}_${randomString}.${extension}`
      const filepath = path.join(uploadDir, filename)

      // Save file
      await writeFile(filepath, buffer)

      // Store the relative path for database
      uploadedImages.push(`/uploads/${type}/${filename}`)
    }

    return {
      success: true,
      images: uploadedImages
    }
  } catch (error) {
    console.error(`Error uploading ${type} files:`, error)
    return {
      success: false,
      error: `Failed to upload ${type} files`
    }
  }
}

// Utility to validate trade participant
export async function validateTradeParticipant(
  trade: { buyerId: number; sellerId: number } | null,
  userId: number
): Promise<boolean> {
  if (!trade) return false
  return trade.buyerId === userId || trade.sellerId === userId
}
