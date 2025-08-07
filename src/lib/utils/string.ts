import { formatUnits } from 'viem'

import {
  getSupportedNativeCurrencies,
  getNativeCurrencyDecimals
} from '@/lib/blockchain'

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
 * Unified currency formatting function
 * Handles fiat, crypto, and chain-specific formatting with flexible options
 * @param amount - The amount to format (string, number, or bigint for Wei/smallest units)
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: string | number | bigint,
  options: {
    currency?: string
    decimals?: number
    showSymbol?: boolean
    chainId?: number
    isSmallestUnit?: boolean
  } = {}
): string {
  const {
    currency = 'USD',
    decimals,
    showSymbol = true,
    chainId,
    isSmallestUnit = false
  } = options

  let numAmount: number

  // Handle bigint or smallest unit conversion
  if (typeof amount === 'bigint' || isSmallestUnit) {
    if (!chainId) {
      throw new Error('chainId required for smallest unit conversion')
    }
    const chainDecimals = getNativeCurrencyDecimals(chainId)
    const formattedAmount = formatUnits(
      typeof amount === 'bigint' ? amount : BigInt(amount),
      chainDecimals
    )
    numAmount = parseFloat(formattedAmount)
  } else {
    numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  }

  if (isNaN(numAmount)) {
    return showSymbol ? `0 ${currency}` : '0'
  }

  // For crypto currencies
  if (isCryptoCurrency(currency)) {
    const defaultDecimals = decimals ?? 6
    const formatted = numAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: defaultDecimals
    })

    // Remove trailing zeros for crypto
    const trimmed = formatted.replace(/\.?0+$/, '')
    return showSymbol ? `${trimmed} ${currency}` : trimmed
  }

  // For fiat currencies
  if (!showSymbol) {
    return numAmount.toFixed(decimals ?? 2)
  }

  // USD formatting
  if (currency === 'USD') {
    if (decimals !== undefined) {
      return `$${numAmount.toFixed(decimals)}`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numAmount)
  }

  // Other fiat currencies
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(numAmount)
}

/**
 * Format a plan name for display
 * @param planId - The plan ID (e.g., 'pro', 'team_pro')
 * @returns Formatted plan name
 */
export function formatPlanName(planId: string): string {
  // Replace underscores with spaces and capitalize each word
  return planId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Unified date formatting function
 * @param date - The date to format
 * @param format - The format type: 'relative', 'full', 'date', 'time', 'short', or custom options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  format:
    | 'relative'
    | 'full'
    | 'date'
    | 'time'
    | 'short'
    | 'long'
    | Intl.DateTimeFormatOptions = 'full'
): string {
  const timestamp = typeof date === 'string' ? new Date(date) : date

  // Handle relative time format
  if (format === 'relative') {
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

  // Predefined format options
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    full: {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    },
    date: {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    },
    time: {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    },
    short: {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }
  }

  // Use predefined format or custom options
  const options =
    typeof format === 'string' && format in formatOptions
      ? formatOptions[format]
      : typeof format === 'object'
        ? format
        : formatOptions.full

  return timestamp.toLocaleString('en-US', options)
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

/**
 * Truncate an address or long string
 * @param address - The string to truncate
 * @param startLength - Number of characters to show at start
 * @param endLength - Number of characters to show at end
 * @returns Truncated string
 */
export function truncateAddress(
  address: string,
  startLength = 6,
  endLength = 4
): string {
  if (!address || address.length <= startLength + endLength) {
    return address
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}
