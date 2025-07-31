export interface JobPayload {
  [key: string]: any
}

export interface BattleRoundPayload {
  battleId: number
  roundNumber: number
  retryCount?: number // Track retry attempts for exponential backoff
}

export interface EmailPayload {
  to: string
  subject: string
  html: string
  from?: string
}

export interface TradeNotificationPayload {
  tradeId: number
  type: 'created' | 'funded' | 'payment_sent' | 'completed' | 'disputed'
  userId: number
}

export type JobType =
  | 'battle.round'
  | 'battle.complete'
  | 'email.send'
  | 'trade.notification'
  | 'subscription.check'
  | 'cleanup.expired'

export interface Job {
  id: number
  type: JobType
  payload: JobPayload
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  maxAttempts: number
  scheduledAt: Date
  availableAt: Date
  processedAt?: Date | null
  failedAt?: Date | null
  completedAt?: Date | null
  error?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface JobHandler<T = JobPayload> {
  handle(payload: T): Promise<void>
  onFailed?(payload: T, error: Error): Promise<void>
}

export interface QueueOptions {
  delay?: number // Delay in milliseconds
  attempts?: number // Max attempts
  priority?: number // Job priority (higher = more important)
}
