import { z } from 'zod'

import { transactionHash, nonEmptyString } from './common'

// Transaction status enum
export const transactionStatusEnum = z.enum([
  'pending',
  'processing',
  'confirmed',
  'failed'
])

// Update transaction status schema
export const updateStatusSchema = z.object({
  transactionHash: transactionHash,
  status: transactionStatusEnum
})

// Track transaction schema
export const trackTransactionSchema = z.object({
  transactionHash: transactionHash,
  chainId: z.number(),
  teamId: z.number(),
  userId: z.number(),
  planId: nonEmptyString,
  amount: nonEmptyString,
  currency: nonEmptyString
})
