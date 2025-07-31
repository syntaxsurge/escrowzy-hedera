import { and, eq, lte, or, asc } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { jobQueue } from '@/lib/db/schema'

import type { JobType, JobPayload, QueueOptions } from './types'

class QueueManager {
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null
  private handlers = new Map<JobType, (payload: any) => Promise<void>>()

  /**
   * Add a job to the queue
   */
  async dispatch(
    type: JobType,
    payload: JobPayload = {},
    options: QueueOptions = {}
  ): Promise<number> {
    const now = new Date()
    const availableAt = options.delay
      ? new Date(now.getTime() + options.delay)
      : now

    const [job] = await db
      .insert(jobQueue)
      .values({
        type,
        payload,
        status: 'pending',
        attempts: 0,
        maxAttempts: options.attempts ?? 3,
        scheduledAt: now,
        availableAt,
        createdAt: now,
        updatedAt: now
      })
      .returning()

    // Trigger immediate processing if not delayed
    if (!options.delay && !this.isProcessing) {
      this.processNextJob().catch(console.error)
    }

    return job.id
  }

  /**
   * Register a job handler
   */
  registerHandler(type: JobType, handler: (payload: any) => Promise<void>) {
    this.handlers.set(type, handler)
  }

  /**
   * Start processing jobs
   */
  start() {
    if (this.isProcessing) return

    this.isProcessing = true
    console.log('🚀 Queue processor started')

    // Process any pending jobs immediately
    this.processPendingJobs().catch(console.error)

    // Set up polling interval (every 5 seconds)
    this.processingInterval = setInterval(() => {
      this.processPendingJobs().catch(console.error)
    }, 5000)
  }

  /**
   * Stop processing jobs
   */
  stop() {
    this.isProcessing = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    console.log('⏹️ Queue processor stopped')
  }

  /**
   * Process all pending jobs
   */
  private async processPendingJobs() {
    if (!this.isProcessing) return

    try {
      // Get all jobs that are ready to be processed
      const jobs = await db
        .select()
        .from(jobQueue)
        .where(
          and(
            eq(jobQueue.status, 'pending'),
            lte(jobQueue.availableAt, new Date())
          )
        )
        .orderBy(asc(jobQueue.availableAt))
        .limit(10) // Process up to 10 jobs at a time

      for (const job of jobs) {
        await this.processJob(job)
      }
    } catch (error) {
      console.error('Error processing pending jobs:', error)
    }
  }

  /**
   * Process the next available job
   */
  private async processNextJob(): Promise<void> {
    if (!this.isProcessing) return

    try {
      // Get the next available job
      const [job] = await db
        .select()
        .from(jobQueue)
        .where(
          and(
            eq(jobQueue.status, 'pending'),
            lte(jobQueue.availableAt, new Date())
          )
        )
        .orderBy(asc(jobQueue.availableAt))
        .limit(1)

      if (job) {
        await this.processJob(job)
      }
    } catch (error) {
      console.error('Error processing next job:', error)
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: any): Promise<void> {
    const handler = this.handlers.get(job.type as JobType)

    if (!handler) {
      console.error(`No handler registered for job type: ${job.type}`)
      await this.markJobFailed(job.id, `No handler for job type: ${job.type}`)
      return
    }

    try {
      // Mark job as processing
      await db
        .update(jobQueue)
        .set({
          status: 'processing',
          processedAt: new Date(),
          attempts: job.attempts + 1,
          updatedAt: new Date()
        })
        .where(eq(jobQueue.id, job.id))

      // Execute the handler
      await handler(job.payload)

      // Mark job as completed
      await db
        .update(jobQueue)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(jobQueue.id, job.id))

      console.log(`✅ Job ${job.id} (${job.type}) completed`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Job ${job.id} (${job.type}) failed:`, errorMessage)

      // Check if we should retry
      if (job.attempts + 1 >= job.maxAttempts) {
        await this.markJobFailed(job.id, errorMessage)
      } else {
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, job.attempts) * 1000 // 1s, 2s, 4s, etc.
        await db
          .update(jobQueue)
          .set({
            status: 'pending',
            availableAt: new Date(Date.now() + retryDelay),
            error: errorMessage,
            updatedAt: new Date()
          })
          .where(eq(jobQueue.id, job.id))
      }
    }
  }

  /**
   * Mark a job as failed
   */
  private async markJobFailed(jobId: number, error: string) {
    await db
      .update(jobQueue)
      .set({
        status: 'failed',
        failedAt: new Date(),
        error,
        updatedAt: new Date()
      })
      .where(eq(jobQueue.id, jobId))
  }

  /**
   * Clean up old completed/failed jobs (older than 7 days)
   */
  async cleanup() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    await db
      .delete(jobQueue)
      .where(
        and(
          or(eq(jobQueue.status, 'completed'), eq(jobQueue.status, 'failed')),
          lte(jobQueue.updatedAt, sevenDaysAgo)
        )
      )
  }

  /**
   * Get job statistics
   */
  async getStats() {
    const jobs = await db.select().from(jobQueue)

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: jobs.length
    }

    for (const job of jobs) {
      stats[job.status]++
    }

    return stats
  }
}

// Create singleton instance
export const queueManager = new QueueManager()

// Export convenience functions
export const dispatch = queueManager.dispatch.bind(queueManager)
export const registerHandler = queueManager.registerHandler.bind(queueManager)
export const startQueue = queueManager.start.bind(queueManager)
export const stopQueue = queueManager.stop.bind(queueManager)
