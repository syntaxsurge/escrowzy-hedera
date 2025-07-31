/**
 * Market-related utility functions
 */

/**
 * Get human-readable error message for OKX DEX errors
 */
export function getOKXErrorMessage(
  error?: {
    type: string
    message: string
  } | null
): string {
  if (!error) return 'Not available'

  switch (error.type) {
    case 'rate_limit':
      return 'Rate limited'
    case 'chain_not_supported':
      return 'Chain not supported'
    case 'token_not_found':
      return 'Token not found'
    case 'credentials_missing':
      return 'Not configured'
    case 'network_error':
      return 'Network error'
    case 'api_error':
    default:
      return 'Not available'
  }
}

/**
 * Format price display with proper decimal places
 */
export function formatPrice(
  price: number | null | undefined,
  decimals = 2
): string {
  if (price === null || price === undefined) return '-'
  return `$${price.toFixed(decimals)}`
}
