export const OKX_QUEUE_CONFIG = {
  // Queue processing delays
  REQUEST_DELAY_MS: 2000, // 2 seconds between each OKX API request
  MIN_RETRY_DELAY_MS: 1000, // Minimum 1 second for random retry delay
  MAX_RETRY_DELAY_MS: 5000, // Maximum 5 seconds for random retry delay

  // Retry configuration
  MAX_RETRIES: 10, // Maximum number of retries for rate limit errors
  BACKOFF_MULTIPLIER: 1.5, // Exponential backoff multiplier

  // Queue management
  MAX_QUEUE_SIZE: 100, // Maximum number of requests in queue
  QUEUE_TIMEOUT_MS: 60000, // 60 seconds timeout for queued requests

  // LocalStorage keys
  STORAGE_KEY: 'okx_request_queue',
  LAST_REQUEST_KEY: 'okx_last_request_time',

  // BroadcastChannel for cross-tab sync
  BROADCAST_CHANNEL: 'okx_queue_sync',

  // Queue status update interval
  STATUS_UPDATE_INTERVAL_MS: 500 // Update queue status every 500ms
} as const

export type OKXQueueConfig = typeof OKX_QUEUE_CONFIG
