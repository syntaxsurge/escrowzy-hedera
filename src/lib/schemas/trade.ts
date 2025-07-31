import { z } from 'zod'

import { TRADE_STATUS } from '@/types/listings'

import { transactionHash, urlSchema, nonEmptyString } from './common'

// Create trade schema
export const createTradeSchema = z.object({
  listingId: z.number().positive('Listing ID must be positive'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format')
    .refine(val => parseFloat(val) > 0, 'Amount must be greater than 0'),
  paymentMethod: nonEmptyString.describe('Payment method is required'),
  notes: z.string().optional()
})

// Get user trades schema
export const getUserTradesSchema = z.object({
  userId: z.number().positive().optional(),
  role: z.enum(['buyer', 'seller', 'both']).optional().default('both'),
  status: z
    .union([
      z.enum(Object.values(TRADE_STATUS) as [string, ...string[]]),
      z.array(z.enum(Object.values(TRADE_STATUS) as [string, ...string[]]))
    ])
    .optional(),
  chainId: z.number().positive().optional(),
  page: z.number().positive().optional().default(1),
  limit: z.number().positive().max(100).optional().default(20),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

// Fund trade schema
export const fundTradeSchema = z.object({
  tradeId: z.number().positive('Trade ID must be positive'),
  transactionHash: transactionHash.optional(),
  paymentProof: z
    .array(urlSchema)
    .max(5, 'Maximum 5 proof URLs allowed')
    .optional()
})

// Confirm trade schema
export const confirmTradeSchema = z.object({
  tradeId: z.number().positive('Trade ID must be positive'),
  rating: z
    .number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5')
    .optional(),
  feedback: z
    .string()
    .max(500, 'Feedback must be less than 500 characters')
    .optional(),
  releaseTxHash: z.string().optional() // Transaction hash when confirming payment also releases funds
})

// Dispute trade schema
export const disputeTradeSchema = z.object({
  tradeId: z.number().positive('Trade ID must be positive'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be less than 1000 characters'),
  evidence: z.string().optional(),
  evidenceImages: z.string().optional() // Comma-separated list of image URLs
})

// Cancel trade schema
export const cancelTradeSchema = z.object({
  tradeId: z.number().positive('Trade ID must be positive'),
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must be less than 500 characters')
    .optional()
})

// Resolve dispute schema (admin only)
export const resolveDisputeSchema = z.object({
  tradeId: z.number().positive('Trade ID must be positive'),
  resolution: z.enum(['release_to_seller', 'refund_to_buyer', 'split']),
  splitPercentage: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Percentage to seller if split resolution'),
  notes: z
    .string()
    .min(10, 'Notes must be at least 10 characters')
    .max(1000, 'Notes must be less than 1000 characters')
})

// Trade status update schema (internal use)
export const updateTradeStatusSchema = z.object({
  tradeId: z.number().positive('Trade ID must be positive'),
  status: z.enum(Object.values(TRADE_STATUS) as [string, ...string[]]),
  metadata: z.record(z.any()).optional()
})

// Export type inferences
export type CreateTradeInput = z.infer<typeof createTradeSchema>
export type GetUserTradesInput = z.infer<typeof getUserTradesSchema>
export type FundTradeInput = z.infer<typeof fundTradeSchema>
export type ConfirmTradeInput = z.infer<typeof confirmTradeSchema>
export type DisputeTradeInput = z.infer<typeof disputeTradeSchema>
export type CancelTradeInput = z.infer<typeof cancelTradeSchema>
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>
export type UpdateTradeStatusInput = z.infer<typeof updateTradeStatusSchema>
