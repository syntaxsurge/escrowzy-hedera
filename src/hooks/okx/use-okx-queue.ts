'use client'

import { useState, useEffect, useCallback } from 'react'

import { timeConstants } from '@/config/app-routes'
import { okxDexClient } from '@/lib/api/okx-dex-client'
import type { QueueStatus } from '@/lib/network/okx-request-queue'

export interface UseOKXQueueReturn {
  queueStatus: QueueStatus | null
  queueSize: number
  isProcessing: boolean
  estimatedWaitTime: number
  clearQueue: () => void
  queuePosition: number
}

export function useOKXQueue(): UseOKXQueueReturn {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)

  useEffect(() => {
    // Get initial status
    const initialStatus = okxDexClient.getQueueStatus()
    if (initialStatus) {
      setQueueStatus(initialStatus)
    }

    // Subscribe to queue status updates
    const unsubscribe = okxDexClient.addQueueStatusListener(status => {
      setQueueStatus(status)
    })

    return unsubscribe
  }, [])

  const clearQueue = useCallback(() => {
    okxDexClient.clearRequestQueue()
  }, [])

  // Calculate queue position (simplified - assumes FIFO)
  const queuePosition = queueStatus?.size || 0

  return {
    queueStatus,
    queueSize: queueStatus?.size || 0,
    isProcessing: queueStatus?.processing || false,
    estimatedWaitTime: queueStatus?.estimatedWaitTime || 0,
    clearQueue,
    queuePosition
  }
}

export function formatWaitTime(milliseconds: number): string {
  if (milliseconds < timeConstants.SECOND) {
    return 'Processing...'
  }

  const seconds = Math.floor(milliseconds / timeConstants.SECOND)

  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (remainingSeconds > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }

  return `${minutes}m`
}
