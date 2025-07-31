import { format } from 'date-fns'
import { formatUnits } from 'viem'

import { getNativeCurrencyDecimals } from '.'

/**
 * Format a payment amount for display
 * Handles both Wei and native currency unit formats
 * @param amount - The amount as a string (either in Wei or native units)
 * @param chainId - The chain ID to determine decimals
 * @param decimals - Number of decimal places to display (default: 4)
 * @returns Formatted amount string
 */
export function formatPaymentAmount(
  amount: string,
  chainId: number,
  decimals: number = 4
): string {
  // Check if amount is already in native currency units or in Wei
  // If the amount contains a decimal point, it's already in native units
  if (amount.includes('.')) {
    // Already in native currency units (e.g., ETH)
    return parseFloat(amount).toFixed(decimals)
  } else {
    // Amount is in Wei, convert to native currency units
    const chainDecimals = getNativeCurrencyDecimals(chainId)
    const formattedAmount = formatUnits(BigInt(amount), chainDecimals)
    // Format to specified decimal places for display
    return parseFloat(formattedAmount).toFixed(decimals)
  }
}

/**
 * Format a payment amount with currency symbol
 * @param amount - The amount as a string (either in Wei or native units)
 * @param chainId - The chain ID to determine decimals
 * @param currency - The currency symbol
 * @param decimals - Number of decimal places to display (default: 4)
 * @returns Formatted amount string with currency
 */
export function formatPaymentAmountWithCurrency(
  amount: string,
  chainId: number,
  currency: string,
  decimals: number = 4
): string {
  const formattedAmount = formatPaymentAmount(amount, chainId, decimals)
  return `${formattedAmount} ${currency}`
}

/**
 * Format a price for display (already in native units)
 * @param price - The price as a number
 * @param decimals - Number of decimal places to display (default: 4)
 * @returns Formatted price string
 */
export function formatPrice(price: number, decimals: number = 4): string {
  return price.toFixed(decimals)
}

/**
 * Format a price with currency symbol
 * @param price - The price as a number
 * @param currency - The currency symbol
 * @param decimals - Number of decimal places to display (default: 4)
 * @returns Formatted price string with currency
 */
export function formatPriceWithCurrency(
  price: number,
  currency: string,
  decimals: number = 4
): string {
  return `${formatPrice(price, decimals)} ${currency}`
}

/**
 * Format a crypto amount without trailing zeros
 * @param amount - The amount as a string or number
 * @returns Formatted amount string without trailing zeros
 */
export function formatCryptoAmount(amount: string | number): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  // Convert to string and remove trailing zeros after decimal point
  const formatted = numericAmount.toString()

  // If it contains a decimal point, remove trailing zeros
  if (formatted.includes('.')) {
    return formatted.replace(/\.?0+$/, '')
  }

  return formatted
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
 * Format a payment date for display
 * @param date - The date string or Date object
 * @param dateFormat - The format string (default: 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatPaymentDate(
  date: string | Date,
  dateFormat: string = 'MMM d, yyyy'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, dateFormat)
}
