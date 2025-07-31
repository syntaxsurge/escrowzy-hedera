// Simple in-memory cache with TTL support
class CacheManager {
  private cache: Map<string, { data: any; expiry: number }> = new Map()

  set(key: string, data: any, ttlSeconds: number = 300) {
    const expiry = Date.now() + ttlSeconds * 1000
    this.cache.set(key, { data, expiry })
  }

  get(key: string) {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() > cached.expiry) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  has(key: string): boolean {
    const cached = this.cache.get(key)
    if (!cached) return false

    if (Date.now() > cached.expiry) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

// Create singleton instances
export const battleCache = new CacheManager()
export const listingCache = new CacheManager()
export const userCache = new CacheManager()

// Clean up expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      battleCache.cleanup()
      listingCache.cleanup()
      userCache.cleanup()
    },
    5 * 60 * 1000
  )
}

// LocalStorage wrapper with JSON support
export const localCache = {
  set: (key: string, value: any, ttlSeconds?: number) => {
    if (typeof window === 'undefined') return

    const item = {
      value,
      expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    }

    try {
      localStorage.setItem(key, JSON.stringify(item))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  },

  get: (key: string) => {
    if (typeof window === 'undefined') return null

    try {
      const itemStr = localStorage.getItem(key)
      if (!itemStr) return null

      const item = JSON.parse(itemStr)

      if (item.expiry && Date.now() > item.expiry) {
        localStorage.removeItem(key)
        return null
      }

      return item.value
    } catch (e) {
      console.error('Failed to read from localStorage:', e)
      return null
    }
  },

  remove: (key: string) => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  },

  clear: () => {
    if (typeof window === 'undefined') return
    localStorage.clear()
  }
}

// Session storage wrapper
export const sessionCache = {
  set: (key: string, value: any) => {
    if (typeof window === 'undefined') return

    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.error('Failed to save to sessionStorage:', e)
    }
  },

  get: (key: string) => {
    if (typeof window === 'undefined') return null

    try {
      const itemStr = sessionStorage.getItem(key)
      if (!itemStr) return null
      return JSON.parse(itemStr)
    } catch (e) {
      console.error('Failed to read from sessionStorage:', e)
      return null
    }
  },

  remove: (key: string) => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(key)
  },

  clear: () => {
    if (typeof window === 'undefined') return
    sessionStorage.clear()
  }
}
