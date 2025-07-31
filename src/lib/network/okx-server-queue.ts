import { OKX_QUEUE_CONFIG } from '@/lib/config/okx-queue-config'

import { HttpStatusError } from './http-status-error'

interface ServerQueueItem {
  id: string
  request: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
  retries: number
  timestamp: number
}

/**
 * Server-side OKX Request Queue
 * Implements rate limiting without browser dependencies
 */
export class OKXServerQueue {
  private static instance: OKXServerQueue | null = null
  private queue: ServerQueueItem[] = []
  private isProcessing = false
  private lastRequestTime = 0

  private constructor() {}

  public static getInstance(): OKXServerQueue {
    if (!OKXServerQueue.instance) {
      OKXServerQueue.instance = new OKXServerQueue()
    }
    return OKXServerQueue.instance
  }

  public async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= OKX_QUEUE_CONFIG.MAX_QUEUE_SIZE) {
        reject(new Error('Queue is full. Please try again later.'))
        return
      }

      const item: ServerQueueItem = {
        id: `${Date.now()}-${Math.random()}`,
        request,
        resolve,
        reject,
        retries: 0,
        timestamp: Date.now()
      }

      this.queue.push(item)

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue()
      }
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return

    this.isProcessing = true

    while (this.queue.length > 0) {
      const item = this.queue[0]

      // Check if request has expired
      if (Date.now() - item.timestamp > OKX_QUEUE_CONFIG.QUEUE_TIMEOUT_MS) {
        this.queue.shift()
        item.reject(new Error('Request timeout: Queue wait time exceeded'))
        continue
      }

      // Enforce delay between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime
      if (timeSinceLastRequest < OKX_QUEUE_CONFIG.REQUEST_DELAY_MS) {
        const delay = OKX_QUEUE_CONFIG.REQUEST_DELAY_MS - timeSinceLastRequest
        await this.sleep(delay)
      }

      try {
        // Execute the request
        const result = await item.request()

        // Success - remove from queue and resolve
        this.queue.shift()
        this.lastRequestTime = Date.now()
        item.resolve(result)
      } catch (error) {
        // Handle errors
        if (this.shouldRetry(error, item)) {
          await this.handleRetry(item, error)
        } else {
          // Failed - remove from queue and reject
          this.queue.shift()

          // Only log error after max retries exhausted
          if (item.retries >= OKX_QUEUE_CONFIG.MAX_RETRIES) {
            console.error(`OKX API Error after ${item.retries} retries:`, error)
          }

          item.reject(error)
        }
      }
    }

    this.isProcessing = false
  }

  private shouldRetry(error: any, item: ServerQueueItem): boolean {
    if (item.retries >= OKX_QUEUE_CONFIG.MAX_RETRIES) {
      return false
    }

    if (error instanceof HttpStatusError) {
      return error.shouldRetry()
    }

    // Check for rate limit errors in message
    const message = error?.message?.toLowerCase() || ''
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429')
    )
  }

  private async handleRetry(item: ServerQueueItem, error: any): Promise<void> {
    item.retries++

    // Calculate retry delay
    let delay: number

    if (error instanceof HttpStatusError && error.isRateLimitError()) {
      // Random delay between 1-5 seconds for rate limit errors
      delay = Math.floor(
        Math.random() *
          (OKX_QUEUE_CONFIG.MAX_RETRY_DELAY_MS -
            OKX_QUEUE_CONFIG.MIN_RETRY_DELAY_MS) +
          OKX_QUEUE_CONFIG.MIN_RETRY_DELAY_MS
      )
    } else {
      // Exponential backoff for other errors
      delay = Math.min(
        OKX_QUEUE_CONFIG.MIN_RETRY_DELAY_MS *
          Math.pow(OKX_QUEUE_CONFIG.BACKOFF_MULTIPLIER, item.retries),
        OKX_QUEUE_CONFIG.MAX_RETRY_DELAY_MS
      )
    }

    // Only log retries for debugging, not the full error
    if (item.retries <= 3 || item.retries % 3 === 0) {
      console.log(
        `Retrying OKX request (attempt ${item.retries}/${OKX_QUEUE_CONFIG.MAX_RETRIES}) after ${delay}ms`
      )
    }

    await this.sleep(delay)

    // Update timestamp to prevent timeout during retries
    item.timestamp = Date.now()
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public getQueueSize(): number {
    return this.queue.length
  }

  public isQueueProcessing(): boolean {
    return this.isProcessing
  }
}
