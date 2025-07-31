'use client'

import { localStorageKeys } from '@/config/api-endpoints'
import { OKX_QUEUE_CONFIG } from '@/lib/config/okx-queue-config'

import { HttpStatusError } from './http-status-error'

export interface QueueItem {
  id: string
  request: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
  retries: number
  timestamp: number
  priority?: number
}

export interface QueueStatus {
  size: number
  processing: boolean
  currentRequest?: string
  estimatedWaitTime: number
}

export class OKXRequestQueue {
  private static instance: OKXRequestQueue | null = null
  private queue: QueueItem[] = []
  private isProcessing = false
  private lastRequestTime = 0
  private broadcastChannel: BroadcastChannel | null = null
  private statusListeners: Set<(status: QueueStatus) => void> = new Set()

  private constructor() {
    // Initialize BroadcastChannel for cross-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(
        OKX_QUEUE_CONFIG.BROADCAST_CHANNEL
      )
      this.setupBroadcastListener()
    }

    // Load queue from localStorage
    this.loadQueueFromStorage()

    // Start processing if there are pending items
    if (this.queue.length > 0) {
      this.processQueue()
    }
  }

  public static getInstance(): OKXRequestQueue {
    if (!OKXRequestQueue.instance) {
      OKXRequestQueue.instance = new OKXRequestQueue()
    }
    return OKXRequestQueue.instance
  }

  private setupBroadcastListener(): void {
    if (!this.broadcastChannel) return

    this.broadcastChannel.onmessage = event => {
      if (event.data.type === 'queue_update') {
        // Another tab has updated the queue
        this.loadQueueFromStorage()
        this.notifyStatusListeners()
      } else if (event.data.type === 'processing_started') {
        // Another tab is processing, so we don't need to
        this.isProcessing = false
      }
    }
  }

  private loadQueueFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(localStorageKeys.okxQueue)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Filter out expired items
        const now = Date.now()
        this.queue = parsed.filter(
          (item: any) =>
            now - item.timestamp < OKX_QUEUE_CONFIG.QUEUE_TIMEOUT_MS
        )
        this.saveQueueToStorage()
      }

      // Load last request time
      const lastTime = localStorage.getItem(localStorageKeys.okxLastRequest)
      if (lastTime) {
        this.lastRequestTime = parseInt(lastTime, 10)
      }
    } catch (error) {
      console.error('Failed to load queue from storage:', error)
    }
  }

  private saveQueueToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      // Save only serializable data
      const toStore = this.queue.map(item => ({
        id: item.id,
        retries: item.retries,
        timestamp: item.timestamp,
        priority: item.priority
      }))
      localStorage.setItem(localStorageKeys.okxQueue, JSON.stringify(toStore))

      // Broadcast update to other tabs
      this.broadcastChannel?.postMessage({ type: 'queue_update' })
    } catch (error) {
      console.error('Failed to save queue to storage:', error)
    }
  }

  private saveLastRequestTime(): void {
    if (typeof window === 'undefined') return

    localStorage.setItem(
      localStorageKeys.okxLastRequest,
      this.lastRequestTime.toString()
    )
  }

  public async add<T>(request: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= OKX_QUEUE_CONFIG.MAX_QUEUE_SIZE) {
        reject(new Error('Queue is full. Please try again later.'))
        return
      }

      const item: QueueItem = {
        id: `${Date.now()}-${Math.random()}`,
        request,
        resolve,
        reject,
        retries: 0,
        timestamp: Date.now(),
        priority
      }

      // Add to queue based on priority (higher priority = earlier execution)
      if (priority > 0) {
        const insertIndex = this.queue.findIndex(
          i => (i.priority || 0) < priority
        )
        if (insertIndex === -1) {
          this.queue.push(item)
        } else {
          this.queue.splice(insertIndex, 0, item)
        }
      } else {
        this.queue.push(item)
      }

      this.saveQueueToStorage()
      this.notifyStatusListeners()

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue()
      }
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return

    this.isProcessing = true

    // Broadcast that we're processing
    this.broadcastChannel?.postMessage({ type: 'processing_started' })

    while (this.queue.length > 0) {
      const item = this.queue[0]

      // Check if request has expired
      if (Date.now() - item.timestamp > OKX_QUEUE_CONFIG.QUEUE_TIMEOUT_MS) {
        this.queue.shift()
        item.reject(new Error('Request timeout: Queue wait time exceeded'))
        this.saveQueueToStorage()
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
        this.saveLastRequestTime()
        this.saveQueueToStorage()
        item.resolve(result)
      } catch (error) {
        // Handle errors
        if (this.shouldRetry(error, item)) {
          await this.handleRetry(item, error)
        } else {
          // Failed - remove from queue and reject
          this.queue.shift()
          this.saveQueueToStorage()
          item.reject(error)
        }
      }

      this.notifyStatusListeners()
    }

    this.isProcessing = false
  }

  private shouldRetry(error: any, item: QueueItem): boolean {
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

  private async handleRetry(item: QueueItem, error: any): Promise<void> {
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

    console.log(
      `Retrying request ${item.id} after ${delay}ms (attempt ${item.retries}/${OKX_QUEUE_CONFIG.MAX_RETRIES})`
    )

    await this.sleep(delay)

    // Update timestamp to prevent timeout during retries
    item.timestamp = Date.now()
    this.saveQueueToStorage()
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public getStatus(): QueueStatus {
    const avgProcessingTime = OKX_QUEUE_CONFIG.REQUEST_DELAY_MS
    const estimatedWaitTime = this.queue.length * avgProcessingTime

    return {
      size: this.queue.length,
      processing: this.isProcessing,
      currentRequest: this.queue[0]?.id,
      estimatedWaitTime
    }
  }

  public addStatusListener(
    listener: (status: QueueStatus) => void
  ): () => void {
    this.statusListeners.add(listener)

    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  private notifyStatusListeners(): void {
    const status = this.getStatus()
    this.statusListeners.forEach(listener => {
      try {
        listener(status)
      } catch (error) {
        console.error('Error in status listener:', error)
      }
    })
  }

  public clearQueue(): void {
    // Reject all pending requests
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'))
    })

    this.queue = []
    this.saveQueueToStorage()
    this.notifyStatusListeners()
  }

  public removeRequest(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id)
    if (index > 0) {
      // Don't allow removing the currently processing item
      const [item] = this.queue.splice(index, 1)
      item.reject(new Error('Request cancelled'))
      this.saveQueueToStorage()
      this.notifyStatusListeners()
      return true
    }
    return false
  }
}
