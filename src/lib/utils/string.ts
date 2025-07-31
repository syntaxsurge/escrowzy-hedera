import { getSupportedNativeCurrencies } from '@/lib/blockchain'

/**
 * Convert a string to title case (first letter of each word capitalized)
 * @param str - The string to convert
 * @returns The title-cased string
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Normalize a wallet address to lowercase
 * @param address - The wallet address to normalize
 * @returns The normalized (lowercase) wallet address
 */
export function normalizeWalletAddress(address: string): string {
  return address.toLowerCase()
}

/**
 * Format a wallet address to show first and last characters
 * @param address - The wallet address to format
 * @param chars - Number of characters to show at start and end (default: 4)
 * @returns Formatted address like "0x1234...5678"
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 2) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Check if a currency is a crypto currency (native currency of any supported chain or common tokens)
 * @param currency - The currency symbol to check
 * @returns True if it's a crypto currency
 */
export function isCryptoCurrency(currency: string): boolean {
  const nativeCurrencies = getSupportedNativeCurrencies()
  const commonTokens = ['BTC', 'ETH', 'USDT', 'USDC'] // Common cross-chain tokens
  return nativeCurrencies.includes(currency) || commonTokens.includes(currency)
}

/**
 * Format a currency amount with symbol
 * @param amount - The amount to format
 * @param currency - The currency symbol (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: string | number,
  currency = 'USD'
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return `0 ${currency}`

  // For crypto currencies
  if (isCryptoCurrency(currency)) {
    return `${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${currency}`
  }

  // For fiat currencies
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'EUR'
  }).format(numAmount)
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 * @param date - The date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const timestamp = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60)
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'} ago`
  if (minutes < 60)
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`
  if (weeks < 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`

  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

/**
 * Format a date to full date and time string
 * @param date - The date to format
 * @returns Formatted date and time string
 */
export function formatFullDateTime(date: Date | string): string {
  const timestamp = typeof date === 'string' ? new Date(date) : date
  return timestamp.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

/**
 * Format file size in bytes to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Format a number with thousand separators
 * @param num - The number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}
