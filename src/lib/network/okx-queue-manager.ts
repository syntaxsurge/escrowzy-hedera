'use client'

import type { OKXRequestConfig } from '@/types/okx-dex'

import { HttpStatusError } from './http-status-error'
import { OKXRequestQueue } from './okx-request-queue'

export interface QueuedRequest<T> {
  endpoint: string
  config?: OKXRequestConfig
  execute: () => Promise<T>
}

export class OKXQueueManager {
  private static instance: OKXQueueManager | null = null
  private queue: OKXRequestQueue

  private constructor() {
    this.queue = OKXRequestQueue.getInstance()
  }

  public static getInstance(): OKXQueueManager {
    if (!OKXQueueManager.instance) {
      OKXQueueManager.instance = new OKXQueueManager()
    }
    return OKXQueueManager.instance
  }

  public async queueRequest<T>(
    request: QueuedRequest<T>,
    priority = 0
  ): Promise<T> {
    return this.queue.add(async () => {
      try {
        const result = await request.execute()
        return result
      } catch (error) {
        // Convert fetch errors to HttpStatusError if needed
        if (error instanceof Response) {
          throw new HttpStatusError(
            error.status,
            error.statusText,
            `Request failed: ${error.statusText}`
          )
        }

        // Check for rate limit errors in the error message
        if (error instanceof Error) {
          const message = error.message.toLowerCase()
          if (
            message.includes('rate limit') ||
            message.includes('too many requests')
          ) {
            throw new HttpStatusError(429, 'Too Many Requests', error.message)
          }
        }

        throw error
      }
    }, priority)
  }

  public getQueueStatus() {
    return this.queue.getStatus()
  }

  public addStatusListener(listener: (status: any) => void) {
    return this.queue.addStatusListener(listener)
  }

  public clearQueue() {
    this.queue.clearQueue()
  }

  public cancelRequest(id: string): boolean {
    return this.queue.removeRequest(id)
  }

  public async makeRequest<T>(
    baseUrl: string,
    basePath: string,
    endpoint: string,
    config?: OKXRequestConfig,
    generateSignature?: (
      timestamp: string,
      method: string,
      requestPath: string,
      body?: string
    ) => string,
    apiCredentials?: {
      apiKey?: string
      apiSecret?: string
      apiPassphrase?: string
    }
  ): Promise<T> {
    const request: QueuedRequest<T> = {
      endpoint,
      config,
      execute: async () => {
        const url = new URL(`${basePath}${endpoint}`, baseUrl)

        // Add query parameters if present
        if (config?.params) {
          Object.entries(config.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.append(key, String(value))
            }
          })
        }

        const timestamp = new Date().toISOString()
        const method = config?.method || 'GET'
        const requestPath = `${basePath}${endpoint}${url.search}`
        const body = config?.body ? JSON.stringify(config.body) : undefined

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...config?.headers
        }

        // Add API credentials if available
        if (
          apiCredentials?.apiKey &&
          apiCredentials?.apiSecret &&
          apiCredentials?.apiPassphrase &&
          generateSignature
        ) {
          headers['OK-ACCESS-KEY'] = apiCredentials.apiKey
          headers['OK-ACCESS-SIGN'] = generateSignature(
            timestamp,
            method,
            requestPath,
            body
          )
          headers['OK-ACCESS-TIMESTAMP'] = timestamp
          headers['OK-ACCESS-PASSPHRASE'] = apiCredentials.apiPassphrase
        }

        const options: RequestInit = {
          method,
          headers,
          ...(body && { body })
        }

        const response = await fetch(url.toString(), options)
        const data = await response.json()

        // Check for successful response
        if (!response.ok || (data.code !== '0' && data.code !== 0)) {
          // Create HttpStatusError for proper retry handling
          if (
            response.status === 429 ||
            data.msg?.includes('Too Many Requests')
          ) {
            throw new HttpStatusError(
              429,
              'Too Many Requests',
              data.msg || 'Rate limit exceeded'
            )
          }

          throw new HttpStatusError(
            response.status,
            response.statusText,
            data.msg || data.error_message || 'API request failed',
            data
          )
        }

        return data
      }
    }

    return this.queueRequest(request, config?.priority)
  }
}
