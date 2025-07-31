import { apiEndpoints } from '@/config/api-endpoints'

/**
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
