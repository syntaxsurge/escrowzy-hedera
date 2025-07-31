import {
  showSuccessToast,
  showErrorToast
} from '@/components/blocks/toast-manager'
import type { ApiResponse } from '@/types/api'

/**
 * Client-side API options
 */
interface ApiOptions extends RequestInit {
  shouldShowErrorToast?: boolean
  errorMessage?: string
  successMessage?: string
  retry?: number | { count: number; delay: number }
  timeout?: number
}

/**
 * Internal API client function - used by convenience methods
 * Handles retries, timeouts, and error/success toasts
 *
 * @param url - API endpoint URL
 * @param options - Request options
 * @returns API response
 */
async function apiClient<T = any>(
  url: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    shouldShowErrorToast = true,
    errorMessage = 'An error occurred',
    successMessage,
    retry = 0,
    timeout = 30000, // 30 seconds default
    ...fetchOptions
  } = options

  const requestOptions: RequestInit = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers
    },
    credentials: 'include' // Include cookies with all requests
  }

  // Add timeout support
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  requestOptions.signal = controller.signal

  // Retry logic
  const retryConfig =
    typeof retry === 'number' ? { count: retry, delay: 1000 } : retry
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retryConfig.count; attempt++) {
    try {
      const response = await fetch(url, requestOptions)
      clearTimeout(timeoutId)

      const isJson = response.headers
        .get('content-type')
        ?.includes('application/json')
      const data = isJson ? await response.json() : await response.text()

      if (!response.ok) {
        const error = isJson && data.error ? data.error : errorMessage
        // Don't show error toast for 401 (authentication) errors
        if (shouldShowErrorToast && response.status !== 401) {
          showErrorToast('Error', error)
        }
        return { success: false, error, status: response.status }
      }

      if (successMessage) {
        showSuccessToast('Success', successMessage)
      }

      return { success: true, data }
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error as Error

      // Don't retry on abort
      if (lastError.name === 'AbortError') {
        break
      }

      // Wait before retrying
      if (attempt < retryConfig.count) {
        await new Promise(resolve => setTimeout(resolve, retryConfig.delay))
        continue
      }
    }
  }

  // All retries failed
  const errorMsg = lastError?.message || errorMessage
  if (shouldShowErrorToast) {
    showErrorToast('Error', errorMsg)
  }
  return { success: false, error: errorMsg }
}

/**
 * API client with convenience methods
 *
 * @example
 * import { apiEndpoints } from '@/config/api-endpoints'
 *
 * // GET request
 * const { success, data, error } = await api.get(apiEndpoints.admin.users.base)
 *
 * // POST request with data
 * const result = await api.post(apiEndpoints.admin.users.base, { name: 'John' })
 *
 * // With options
 * const result = await api.get(apiEndpoints.notifications.list, {
 *   retry: 3,
 *   timeout: 60000,
 *   successMessage: 'Data loaded!'
 * })
 */
export const api = {
  /**
   * GET request
   */
  get: <T = any>(url: string, options?: Omit<ApiOptions, 'method'>) =>
    apiClient<T>(url, { ...options, method: 'GET' }),

  /**
   * POST request
   */
  post: <T = any>(
    url: string,
    body?: any,
    options?: Omit<ApiOptions, 'method' | 'body'>
  ) =>
    apiClient<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    }),

  /**
   * PUT request
   */
  put: <T = any>(
    url: string,
    body?: any,
    options?: Omit<ApiOptions, 'method' | 'body'>
  ) =>
    apiClient<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    }),

  /**
   * PATCH request
   */
  patch: <T = any>(
    url: string,
    body?: any,
    options?: Omit<ApiOptions, 'method' | 'body'>
  ) =>
    apiClient<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    }),

  /**
   * DELETE request
   */
  delete: <T = any>(
    url: string,
    options?: Omit<ApiOptions, 'method' | 'body'> & { body?: any }
  ) =>
    apiClient<T>(url, {
      ...options,
      method: 'DELETE',
      body: options?.body ? JSON.stringify(options.body) : undefined
    })
}
