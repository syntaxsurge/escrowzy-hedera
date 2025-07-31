import { z } from 'zod'

import { ethereumAddress, transactionHash, nonEmptyString } from './common'
import { SUPPORTED_CHAIN_IDS } from '../blockchain'

export const networkIdSchema = z
  .number()
  .refine(id => SUPPORTED_CHAIN_IDS.includes(id), 'Unsupported network ID')

export const teamIdSchema = z.number().positive('Invalid team ID')

export const userIdSchema = z.number().positive('Invalid user ID')

export const planIdSchema = nonEmptyString.describe('Plan ID is required')

export const nonceSchema = nonEmptyString.describe('Nonce is required')

export const signatureSchema = nonEmptyString.describe('Signature is required')

export const messageSchema = nonEmptyString.describe('Message is required')

// Composite schemas for common use cases
export const paymentConfirmationSchema = z.object({
  transactionHash: transactionHash,
  paymentIntentId: z.string(),
  chainId: networkIdSchema,
  amount: z.string(),
  networkId: networkIdSchema
})

export const paymentIntentSchema = z.object({
  teamId: teamIdSchema,
  userId: userIdSchema,
  planId: planIdSchema,
  networkId: networkIdSchema
})

export const walletAuthSchema = z.object({
  message: messageSchema,
  signature: signatureSchema,
  address: ethereumAddress
})

// Utility validation functions
export function validateArrayInput(
  data: unknown,
  fieldName: string = 'data'
): data is unknown[] {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error(`Invalid ${fieldName}: must be a non-empty array`)
  }
  return true
}
