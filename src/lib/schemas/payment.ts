import { z } from 'zod'

import { teamIdSchema, planIdSchema, networkIdSchema } from './validation'
import { SUPPORTED_CHAIN_IDS } from '../blockchain'
import { ethereumAddress, transactionHash } from './common'

// Payment confirmation schema
export const confirmPaymentSchema = z.object({
  teamId: teamIdSchema,
  planId: planIdSchema,
  transactionHash: transactionHash,
  fromAddress: ethereumAddress,
  amount: z.string(),
  networkId: networkIdSchema
})

// Create payment intent schema
export const createIntentSchema = z.object({
  planId: z.string(),
  networkId: z.number().refine(id => SUPPORTED_CHAIN_IDS.includes(id)),
  teamId: z.number(),
  userId: z.number()
})
