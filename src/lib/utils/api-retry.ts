/**
 * Centralized API retry utility with exponential backoff
 */

export interface RetryConfig {
  maxRetries: number
  minRetryDelayMs: number
  maxRetryDelayMs: number
  backoffMultiplier: number
  onRetry?: (attempt: number, error: any, delay: number) => void
}

export interface RetryableError extends Error {
  status?: number
  statusCode?: number
  code?: string
}

/**
 * Check if an error is a rate limit error (HTTP 429)
 */
export function isRateLimitError(error: any): boolean {
  if (!error) return false

  // Check HTTP status codes
  const status = error.status || error.statusCode || error.response?.status
  if (status === 429) return true

  // Check error message for rate limit indicators
  const message = error?.message?.toLowerCase() || ''
  return (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  )
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false

  // Always retry rate limit errors
  if (isRateLimitError(error)) return true

  // Check for network errors
  const message = error?.message?.toLowerCase() || ''
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  ) {
    return true
  }

  // Check for specific HTTP status codes that are retryable
  const status = error.status || error.statusCode || error.response?.status
  if (status) {
    // Retry on server errors (5xx) and specific client errors
    return status >= 500 || status === 408 || status === 429
  }

  return false
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig,
  isRateLimit: boolean
): number {
  if (isRateLimit) {
    // For rate limit errors, use a random delay between min and max
    return Math.floor(
      Math.random() * (config.maxRetryDelayMs - config.minRetryDelayMs) +
        config.minRetryDelayMs
    )
  }

  // Exponential backoff for other errors
  const exponentialDelay =
    config.minRetryDelayMs * Math.pow(config.backoffMultiplier, attempt - 1)

  return Math.min(exponentialDelay, config.maxRetryDelayMs)
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      if (attempt > config.maxRetries || !isRetryableError(error)) {
        throw error
      }

      // Calculate delay
      const isRateLimit = isRateLimitError(error)
      const delay = calculateRetryDelay(attempt, config, isRateLimit)

      // Call onRetry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, error, delay)
      } else {
        // Default logging
        console.log(
          `Retrying request after ${delay}ms (attempt ${attempt}/${config.maxRetries})`,
          isRateLimit ? '[Rate Limited]' : ''
        )
      }

      // Wait before retrying
      await sleep(delay)
    }
  }

  throw lastError
}
