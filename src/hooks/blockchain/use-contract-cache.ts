'use client'

import { useCallback, useEffect, useState } from 'react'

import { localStorageKeys } from '@/config/api-endpoints'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface UseContractCacheOptions {
  ttl?: number // Time to live in seconds
  key: string
}

export function useContractCache<T>(
  fetcher: () => Promise<T>,
  options: UseContractCacheOptions
) {
  const { ttl = 300, key } = options // Default 5 minutes cache
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Check if cached data exists and is valid
  const getCachedData = useCallback((): T | null => {
    if (typeof window === 'undefined') return null

    try {
      const cached = localStorage.getItem(
        `${localStorageKeys.contractCachePrefix}${key}`
      )
      if (!cached) return null

      const entry: CacheEntry<T> = JSON.parse(cached)
      const now = Date.now()

      if (now - entry.timestamp > entry.ttl * 1000) {
        localStorage.removeItem(`${localStorageKeys.contractCachePrefix}${key}`)
        return null
      }

      return entry.data
    } catch {
      return null
    }
  }, [key])

  // Save data to cache
  const setCachedData = useCallback(
    (data: T) => {
      if (typeof window === 'undefined') return

      try {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          ttl
        }
        localStorage.setItem(
          `${localStorageKeys.contractCachePrefix}${key}`,
          JSON.stringify(entry)
        )
      } catch (e) {
        console.error('Failed to cache contract data:', e)
      }
    },
    [key, ttl]
  )

  // Fetch data with caching
  const fetchData = useCallback(
    async (force = false) => {
      // Check cache first unless forced refresh
      if (!force) {
        const cached = getCachedData()
        if (cached) {
          setData(cached)
          return cached
        }
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetcher()
        setData(result)
        setCachedData(result)
        return result
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fetcher, getCachedData, setCachedData]
  )

  // Clear cache
  const clearCache = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`contract_cache_${key}`)
    }
    setData(null)
  }, [key])

  // Load cached data on mount
  useEffect(() => {
    const cached = getCachedData()
    if (cached) {
      setData(cached)
    }
  }, [getCachedData])

  return {
    data,
    loading,
    error,
    fetchData,
    clearCache,
    refresh: () => fetchData(true)
  }
}

// Batch contract calls to minimize gas and RPC usage
export function useBatchContractCall<T>(
  calls: Array<() => Promise<any>>,
  processor: (results: any[]) => T
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Execute all calls in parallel
      const results = await Promise.all(calls.map(call => call()))
      const processed = processor(results)
      setData(processed)
      return processed
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [calls, processor])

  return {
    data,
    loading,
    error,
    execute
  }
}

// Contract state manager to minimize redundant calls
class ContractStateManager {
  private static instance: ContractStateManager
  private cache: Map<string, { data: any; expiry: number }> = new Map()
  private pendingCalls: Map<string, Promise<any>> = new Map()

  static getInstance(): ContractStateManager {
    if (!ContractStateManager.instance) {
      ContractStateManager.instance = new ContractStateManager()
    }
    return ContractStateManager.instance
  }

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    // Check cache
    const cached = this.cache.get(key)
    if (cached && Date.now() < cached.expiry) {
      return cached.data as T
    }

    // Check if call is already pending
    const pending = this.pendingCalls.get(key)
    if (pending) {
      return pending as Promise<T>
    }

    // Make new call
    const promise = fetcher()
      .then(data => {
        this.cache.set(key, {
          data,
          expiry: Date.now() + ttl * 1000
        })
        this.pendingCalls.delete(key)
        return data
      })
      .catch(err => {
        this.pendingCalls.delete(key)
        throw err
      })

    this.pendingCalls.set(key, promise)
    return promise
  }

  invalidate(key: string) {
    this.cache.delete(key)
  }

  invalidateAll() {
    this.cache.clear()
  }
}

export const contractStateManager = ContractStateManager.getInstance()
