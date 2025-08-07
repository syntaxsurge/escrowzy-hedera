import { apiEndpoints } from '@/config/api-endpoints'

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/ico',
  'image/x-icon',
  'image/avif',
  'image/heic',
  'image/heif'
]

export function isImageFile(mimeType: string | undefined | null): boolean {
  if (!mimeType) return false
  return IMAGE_MIME_TYPES.includes(mimeType.toLowerCase())
} /**
 * Get the URL for an uploaded file
 * This function can be used on both client and server
 */

export function getUploadUrl(relativePath: string): string {
  // If it's already a full URL (from Vercel Blob), return as-is
  if (relativePath.startsWith('http')) {
    return relativePath
  }
  // For local uploads, prepend the uploads endpoint
  return apiEndpoints.uploads.getFile(relativePath)
}
