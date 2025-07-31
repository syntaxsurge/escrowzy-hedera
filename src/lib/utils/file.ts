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
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.substring(lastDot + 1).toLowerCase()
}
